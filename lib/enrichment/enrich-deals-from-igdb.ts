import { getIgdbPsnExternalGameSource } from "@/lib/sources/psn/config";
import { getIgdbXboxExternalGameSource } from "@/lib/sources/xbox/config";
import type { NormalizedDeal } from "@/types/deal";
import type { GameMetadata } from "@/types/enrichment";

import {
  fetchGameMetadataBatchFromExternalStore,
  fetchGameMetadataBatchFromIgdb,
  fetchGameMetadataByExactTitles,
} from "./igdb-client";

const IGDB_BATCH_SIZE = 500;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function needsIgdbEnrichment(deal: NormalizedDeal): boolean {
  return (
    deal.genres.length === 0 ||
    deal.rating === null ||
    deal.description === null ||
    deal.coverUrl === null ||
    deal.screenshotUrls.length === 0 ||
    deal.videoUrls.length === 0
  );
}

function psnProductIdFromUrl(url: string): string | null {
  const match = url.match(/\/product\/([^/?#]+)/);
  return match?.[1] ?? null;
}

function resolveRatingSource(
  deal: NormalizedDeal,
  metadata: GameMetadata,
): NormalizedDeal["ratingSource"] {
  if (deal.rating !== null) {
    return deal.ratingSource;
  }
  if (metadata.rating !== null) {
    return "igdb";
  }
  return deal.ratingSource;
}

function mergeIgdbMetadata(
  deal: NormalizedDeal,
  metadata: GameMetadata | null | undefined,
): NormalizedDeal {
  if (!metadata) {
    return deal;
  }

  return {
    ...deal,
    genres: deal.genres.length > 0 ? deal.genres : metadata.genres,
    rating: deal.rating ?? metadata.rating,
    ratingSource: resolveRatingSource(deal, metadata),
    description: deal.description ?? metadata.description,
    coverUrl: deal.coverUrl ?? metadata.coverUrl,
    screenshotUrls:
      deal.screenshotUrls.length > 0
        ? deal.screenshotUrls
        : metadata.screenshotUrls,
    videoUrls:
      deal.videoUrls.length > 0 ? deal.videoUrls : metadata.videoUrls,
    sourceReleaseDate: deal.sourceReleaseDate ?? metadata.releaseDate,
  };
}

function firstMatchingMetadata(
  keys: string[],
  metadataByKey: Record<string, GameMetadata | null>,
): GameMetadata | null {
  for (const key of keys) {
    const metadata = metadataByKey[key];
    if (metadata) {
      return metadata;
    }
  }
  return null;
}

function titleLookupKey(deal: NormalizedDeal): string | null {
  const title = deal.title.trim();
  return title.length > 0 ? title : null;
}

function psnLookupKeys(deal: NormalizedDeal): string[] {
  const keys: string[] = [];
  if (deal.externalStoreUid) {
    keys.push(deal.externalStoreUid);
  }
  const productId = psnProductIdFromUrl(deal.url);
  if (productId) {
    keys.push(productId);
  }
  return keys;
}

function collectSteamIdsNeedingLookup(deals: NormalizedDeal[]): string[] {
  return [
    ...new Set(
      deals
        .filter((deal) => deal.steamAppId !== null)
        .map((deal) => deal.steamAppId as string),
    ),
  ];
}

function collectPsnUidsNeedingLookup(deals: NormalizedDeal[]): string[] {
  return [
    ...new Set(
      deals.filter((deal) => deal.source === "psn").flatMap(psnLookupKeys),
    ),
  ];
}

function collectXboxUidsNeedingLookup(deals: NormalizedDeal[]): string[] {
  return [
    ...new Set(
      deals
        .filter((deal) => deal.source === "xbox" && deal.externalStoreUid)
        .map((deal) => deal.externalStoreUid as string),
    ),
  ];
}

/** Fetches metadata for `keys` in fixed-size batches and merges the results. */
async function fetchMetadataInBatches(
  keys: string[],
  batchSize: number,
  fetcher: (batch: string[]) => Promise<Record<string, GameMetadata | null>>,
): Promise<Record<string, GameMetadata | null>> {
  const metadataByKey: Record<string, GameMetadata | null> = {};
  for (const batch of chunk(keys, batchSize)) {
    Object.assign(metadataByKey, await fetcher(batch));
  }
  return metadataByKey;
}

interface StoreMetadataLookups {
  bySteamId: Record<string, GameMetadata | null>;
  byPsnUid: Record<string, GameMetadata | null>;
  byXboxUid: Record<string, GameMetadata | null>;
}

async function fetchStoreMetadataLookups(
  dealsNeedingEnrichment: NormalizedDeal[],
): Promise<StoreMetadataLookups> {
  const bySteamId = await fetchMetadataInBatches(
    collectSteamIdsNeedingLookup(dealsNeedingEnrichment),
    IGDB_BATCH_SIZE,
    fetchGameMetadataBatchFromIgdb,
  );

  const byPsnUid = await fetchMetadataInBatches(
    collectPsnUidsNeedingLookup(dealsNeedingEnrichment),
    IGDB_BATCH_SIZE,
    (batch) =>
      fetchGameMetadataBatchFromExternalStore(
        batch,
        getIgdbPsnExternalGameSource(),
      ),
  );

  const byXboxUid = await fetchMetadataInBatches(
    collectXboxUidsNeedingLookup(dealsNeedingEnrichment),
    IGDB_BATCH_SIZE,
    (batch) =>
      fetchGameMetadataBatchFromExternalStore(
        batch,
        getIgdbXboxExternalGameSource(),
      ),
  );

  return { bySteamId, byPsnUid, byXboxUid };
}

function mergeStoreMetadata(
  deal: NormalizedDeal,
  lookups: StoreMetadataLookups,
): NormalizedDeal {
  if (!needsIgdbEnrichment(deal)) {
    return deal;
  }

  if (deal.steamAppId) {
    return mergeIgdbMetadata(deal, lookups.bySteamId[deal.steamAppId]);
  }

  if (deal.source === "psn") {
    return mergeIgdbMetadata(
      deal,
      firstMatchingMetadata(psnLookupKeys(deal), lookups.byPsnUid),
    );
  }

  if (deal.source === "xbox" && deal.externalStoreUid) {
    return mergeIgdbMetadata(deal, lookups.byXboxUid[deal.externalStoreUid]);
  }

  return deal;
}

async function mergeTitleFallbackMetadata(
  deals: NormalizedDeal[],
): Promise<NormalizedDeal[]> {
  const titlesNeedingLookup = [
    ...new Set(
      deals
        .filter(needsIgdbEnrichment)
        .map(titleLookupKey)
        .filter((title): title is string => title !== null),
    ),
  ];

  const metadataByTitle = await fetchMetadataInBatches(
    titlesNeedingLookup,
    50,
    fetchGameMetadataByExactTitles,
  );

  return deals.map((deal) => {
    if (!needsIgdbEnrichment(deal)) {
      return deal;
    }
    const title = titleLookupKey(deal);
    return title ? mergeIgdbMetadata(deal, metadataByTitle[title]) : deal;
  });
}

/** Enrich deals from IGDB at cron time. Pages read Postgres only — no live IGDB. */
export async function enrichDealsFromIgdb(
  deals: NormalizedDeal[],
): Promise<NormalizedDeal[]> {
  const dealsNeedingEnrichment = deals.filter(needsIgdbEnrichment);
  if (dealsNeedingEnrichment.length === 0) {
    return deals;
  }

  const lookups = await fetchStoreMetadataLookups(dealsNeedingEnrichment);
  const enriched = deals.map((deal) => mergeStoreMetadata(deal, lookups));

  return mergeTitleFallbackMetadata(enriched);
}
