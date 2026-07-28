import {
  PLAYSTATION_PLATFORMS,
  XBOX_PLATFORMS,
} from "@/lib/deals/platforms";
import type { GameOffer } from "@/types/deal";

export const DEALS_OF_THE_DAY_COUNT = 3;
/** Regular catalog cards shown per platform row on home. */
export const HOME_PLATFORM_ROW_COUNT = 8;

export type HomePlatformRowId = "pc" | "playstation" | "xbox";

export interface HomePlatformRow {
  id: HomePlatformRowId;
  label: string;
  /** Platforms used for /deals deep-links. */
  filterPlatforms: string[];
  games: GameOffer[];
}

export interface HomeDealPicks {
  dealsOfTheDay: GameOffer[];
  platformRows: HomePlatformRow[];
}

/** Net € saved on the lead (cheapest) offer — not cross-store phantom savings. */
export function eurosSaved(game: GameOffer): number {
  const lead = game.offers[0];
  if (lead) {
    return Math.max(0, lead.originalPriceEur - lead.priceEur);
  }
  return Math.max(0, game.maxOriginalPriceEur - game.minPriceEur);
}

function hasRating(game: GameOffer): boolean {
  return game.rating !== null;
}

/** Newer dates sort higher; missing dates sort last. */
function releaseSortKey(isoDate: string | null): number {
  if (!isoDate) {
    return Number.NEGATIVE_INFINITY;
  }
  const time = Date.parse(isoDate);
  return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY;
}

/**
 * Rank for home / Deals of the Day:
 * 1. Rated before unrated (unscored never outranks a scored deal)
 * 2. Net € saved on the lead offer (not percent)
 * 3. Rating (higher first)
 * 4. Release date (newer first; nulls last)
 */
export function compareDealsOfTheDay(a: GameOffer, b: GameOffer): number {
  const ratedA = hasRating(a) ? 1 : 0;
  const ratedB = hasRating(b) ? 1 : 0;
  if (ratedB !== ratedA) {
    return ratedB - ratedA;
  }

  const savedDiff = eurosSaved(b) - eurosSaved(a);
  if (savedDiff !== 0) {
    return savedDiff;
  }

  const ratingA = a.rating ?? Number.NEGATIVE_INFINITY;
  const ratingB = b.rating ?? Number.NEGATIVE_INFINITY;
  if (ratingB !== ratingA) {
    return ratingB - ratingA;
  }

  return releaseSortKey(b.sourceReleaseDate) - releaseSortKey(a.sourceReleaseDate);
}

export function rankDealsOfTheDay(games: GameOffer[]): GameOffer[] {
  return [...games].sort(compareDealsOfTheDay);
}

const PLATFORM_ROW_DEFS: ReadonlyArray<{
  id: HomePlatformRowId;
  label: string;
  filterPlatforms: string[];
  matches: (game: GameOffer) => boolean;
}> = [
  {
    id: "pc",
    label: "PC",
    filterPlatforms: ["PC"],
    matches: (game) => game.platforms.includes("PC"),
  },
  {
    id: "playstation",
    label: "PlayStation",
    filterPlatforms: [...PLAYSTATION_PLATFORMS],
    matches: (game) =>
      game.platforms.some((platform) =>
        (PLAYSTATION_PLATFORMS as readonly string[]).includes(platform),
      ),
  },
  {
    id: "xbox",
    label: "Xbox",
    filterPlatforms: [...XBOX_PLATFORMS],
    matches: (game) =>
      game.platforms.some((platform) =>
        (XBOX_PLATFORMS as readonly string[]).includes(platform),
      ),
  },
];

export function pickHomeDeals(
  games: GameOffer[],
  options?: {
    dealsOfTheDayCount?: number;
    platformRowCount?: number;
  },
): HomeDealPicks {
  const dealsOfTheDayCount = options?.dealsOfTheDayCount ?? DEALS_OF_THE_DAY_COUNT;
  const platformRowCount = options?.platformRowCount ?? HOME_PLATFORM_ROW_COUNT;
  const ranked = rankDealsOfTheDay(games);
  const dealsOfTheDay = ranked.slice(0, dealsOfTheDayCount);
  const usedKeys = new Set(dealsOfTheDay.map((game) => game.groupKey));

  const remaining = ranked.filter((game) => !usedKeys.has(game.groupKey));
  const platformRows: HomePlatformRow[] = PLATFORM_ROW_DEFS.map((def) => ({
    id: def.id,
    label: def.label,
    filterPlatforms: def.filterPlatforms,
    games: remaining
      .filter(def.matches)
      .slice(0, platformRowCount),
  })).filter((row) => row.games.length > 0);

  return { dealsOfTheDay, platformRows };
}
