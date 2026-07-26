import {
  canonicalizeWishlistMatchTitle,
  stripStorefrontTitleNoise,
} from "@/lib/deal-utils";
import type { GameMetadata } from "@/types/enrichment";

import { getIgdbAccessToken, getIgdbClientId } from "./igdb-auth";
import { igdbImageUrl } from "./igdb-image-url";

interface IgdbExternalGame {
  game: number;
  uid: string;
}

interface IgdbGame {
  id: number;
  name?: string;
  slug?: string;
  summary?: string;
  aggregated_rating?: number;
  first_release_date?: number;
  genres?: Array<{ name: string }>;
  cover?: { url?: string };
  screenshots?: Array<{ url?: string }>;
}

const IGDB_STEAM_SOURCE = 1;
const IGDB_MIN_REQUEST_INTERVAL_MS = 350;
let lastIgdbRequestAt = 0;
let igdbRequestQueue: Promise<void> = Promise.resolve();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForIgdbRateLimit(): Promise<void> {
  const previous = igdbRequestQueue;
  let releaseQueue: () => void = () => {};
  igdbRequestQueue = new Promise<void>((resolve) => {
    releaseQueue = resolve;
  });

  await previous;

  const now = Date.now();
  const elapsed = now - lastIgdbRequestAt;
  const waitMs = Math.max(0, IGDB_MIN_REQUEST_INTERVAL_MS - elapsed);
  if (waitMs > 0) {
    await sleep(waitMs);
  }
  lastIgdbRequestAt = Date.now();
  releaseQueue();
}

async function igdbPost<T>(endpoint: string, body: string): Promise<T[]> {
  const clientId = getIgdbClientId();
  const token = await getIgdbAccessToken();

  if (!clientId || !token) {
    return [];
  }

  await waitForIgdbRateLimit();

  const response = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`IGDB ${endpoint} failed: ${response.status}`);
  }

  return (await response.json()) as T[];
}

function mapGame(game: IgdbGame): GameMetadata {
  return {
    igdbId: game.id,
    description: game.summary ?? null,
    genres: (game.genres ?? []).map((genre) => genre.name),
    coverUrl: igdbImageUrl(game.cover?.url, "t_cover_big"),
    screenshotUrls: (game.screenshots ?? [])
      .map((shot) => igdbImageUrl(shot.url, "t_1080p"))
      .filter((url): url is string => url !== null),
    rating: game.aggregated_rating ?? null,
    releaseDate: game.first_release_date
      ? new Date(game.first_release_date * 1000).toISOString().slice(0, 10)
      : null,
  };
}

function escapeIgdbString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function fetchGamesByIds(gameIds: number[]): Promise<IgdbGame[]> {
  if (gameIds.length === 0) {
    return [];
  }

  return igdbPost<IgdbGame>(
    "games",
    `fields name, summary, aggregated_rating, first_release_date, genres.name, cover.url, screenshots.url; where id = (${gameIds.join(",")}); limit 500;`,
  );
}

async function fetchMetadataByExternalUids(
  uids: string[],
  externalGameSource: number,
): Promise<Record<string, GameMetadata | null>> {
  const result: Record<string, GameMetadata | null> = {};
  for (const uid of uids) {
    result[uid] = null;
  }

  if (uids.length === 0) {
    return result;
  }

  const clientId = getIgdbClientId();
  const token = await getIgdbAccessToken();
  if (!clientId || !token) {
    return result;
  }

  const uidFilter = uids.map((uid) => `"${escapeIgdbString(uid)}"`).join(",");
  const externalGames = await igdbPost<IgdbExternalGame>(
    "external_games",
    `fields game, uid; where external_game_source = ${externalGameSource} & uid = (${uidFilter}); limit 500;`,
  );

  const uidsByGameId = new Map<number, string[]>();
  for (const row of externalGames) {
    const existing = uidsByGameId.get(row.game) ?? [];
    existing.push(row.uid);
    uidsByGameId.set(row.game, existing);
  }

  const games = await fetchGamesByIds([...uidsByGameId.keys()]);
  for (const game of games) {
    const metadata = mapGame(game);
    for (const uid of uidsByGameId.get(game.id) ?? []) {
      result[uid] = metadata;
    }
  }

  return result;
}

export async function fetchGameMetadataBatchFromIgdb(
  steamAppIds: string[],
): Promise<Record<string, GameMetadata | null>> {
  return fetchMetadataByExternalUids(steamAppIds, IGDB_STEAM_SOURCE);
}

export async function fetchGameMetadataBatchFromExternalStore(
  uids: string[],
  externalGameSource: number,
): Promise<Record<string, GameMetadata | null>> {
  return fetchMetadataByExternalUids(uids, externalGameSource);
}

export async function fetchGameMetadataByExactTitles(
  titles: string[],
): Promise<Record<string, GameMetadata | null>> {
  const result: Record<string, GameMetadata | null> = {};
  for (const title of titles) {
    result[title] = null;
  }

  if (titles.length === 0) {
    return result;
  }

  const clientId = getIgdbClientId();
  const token = await getIgdbAccessToken();
  if (!clientId || !token) {
    return result;
  }

  for (const title of titles) {
    const canonicalTitle = canonicalizeWishlistMatchTitle(title);
    const searchQuery = stripStorefrontTitleNoise(title) || title;
    const games = await igdbPost<IgdbGame>(
      "games",
      `search "${escapeIgdbString(searchQuery)}"; fields name, summary, aggregated_rating, first_release_date, genres.name, cover.url, screenshots.url; limit 10;`,
    );

    const exactMatch = games.find((game) => {
      if (!game.name) {
        return false;
      }
      return canonicalizeWishlistMatchTitle(game.name) === canonicalTitle;
    });
    if (exactMatch) {
      result[title] = mapGame(exactMatch);
    }
  }

  return result;
}

export interface IgdbSearchCandidate {
  igdbId: number;
  title: string;
  slug: string | null;
  coverUrl: string | null;
  releaseDate: string | null;
  steamAppId: string | null;
  genres: string[];
}

export function igdbGamePageUrl(candidate: {
  slug: string | null;
  igdbId: number;
}): string {
  if (candidate.slug) {
    return `https://www.igdb.com/games/${candidate.slug}`;
  }
  return `https://www.igdb.com/games/${candidate.igdbId}`;
}

/** Fuzzy IGDB title search for wishlist (user picks a candidate). */
export async function searchIgdbGames(
  query: string,
  limit = 10,
): Promise<IgdbSearchCandidate[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const clientId = getIgdbClientId();
  const token = await getIgdbAccessToken();
  if (!clientId || !token) {
    return [];
  }

  const safeLimit = Math.max(1, Math.min(limit, 20));
  const games = await igdbPost<IgdbGame>(
    "games",
    `search "${escapeIgdbString(trimmed)}"; fields name, slug, first_release_date, cover.url, genres.name; limit ${safeLimit};`,
  );

  if (games.length === 0) {
    return [];
  }

  const gameIds = games.map((game) => game.id);
  const steamByGameId = new Map<number, string>();
  const external = await igdbPost<IgdbExternalGame>(
    "external_games",
    `fields game, uid; where external_game_source = ${IGDB_STEAM_SOURCE} & game = (${gameIds.join(",")}); limit 100;`,
  );
  for (const row of external) {
    if (!steamByGameId.has(row.game)) {
      steamByGameId.set(row.game, row.uid);
    }
  }

  return games
    .filter((game) => Boolean(game.name))
    .map((game) => ({
      igdbId: game.id,
      title: game.name as string,
      slug: game.slug ?? null,
      coverUrl: igdbImageUrl(game.cover?.url, "t_cover_big"),
      releaseDate: game.first_release_date
        ? new Date(game.first_release_date * 1000).toISOString().slice(0, 10)
        : null,
      steamAppId: steamByGameId.get(game.id) ?? null,
      genres: (game.genres ?? []).map((genre) => genre.name),
    }));
}
