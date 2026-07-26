import {
  and,
  arrayOverlaps,
  eq,
  gte,
  ilike,
  lte,
  notInArray,
  sql,
  type SQL,
} from "drizzle-orm";

import {
  DEFAULT_PAGE_SIZE,
  type DealListFilters,
} from "@/lib/deals/filters";
import {
  groupDealsIntoOffers,
  isConsoleFamily,
  parseGroupKey,
  type DealForGrouping,
} from "@/lib/deals/grouping";
import { CONSOLE_PLATFORMS } from "@/lib/deals/platforms";
import { MAX_PRICE_EUR } from "@/lib/pricing";
import type {
  DealListing,
  GameOffer,
  GameOfferDetail,
  NormalizedDeal,
  RatingSource,
} from "@/types/deal";
import type { DealSource } from "@/types/deal-source";

import { db } from "./client";
import { deals } from "./schema";

const listingColumns = {
  id: deals.id,
  source: deals.source,
  title: deals.title,
  storeName: deals.storeName,
  steamAppId: deals.steamAppId,
  externalStoreUid: deals.externalStoreUid,
  priceEur: deals.priceEur,
  originalPriceEur: deals.originalPriceEur,
  url: deals.url,
  imageUrl: deals.imageUrl,
  sourceReleaseDate: deals.sourceReleaseDate,
  distributionFormat: deals.distributionFormat,
  genres: deals.genres,
  platforms: deals.platforms,
  rating: deals.rating,
  ratingSource: deals.ratingSource,
} as const;

export interface GameOfferListPage {
  games: GameOffer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function rowToListing(
  row: {
    id: string;
    source: string;
    title: string;
    storeName: string;
    steamAppId: string | null;
    externalStoreUid: string | null;
    priceEur: number;
    originalPriceEur: number;
    url: string;
    imageUrl: string | null;
    sourceReleaseDate: string | null;
    distributionFormat: string;
    genres: string[] | null;
    platforms: string[] | null;
    rating: number | null;
    ratingSource: string | null;
  },
): DealListing {
  return {
    id: row.id,
    source: row.source as DealListing["source"],
    title: row.title,
    storeName: row.storeName,
    steamAppId: row.steamAppId,
    externalStoreUid: row.externalStoreUid,
    priceEur: row.priceEur,
    originalPriceEur: row.originalPriceEur,
    url: row.url,
    imageUrl: row.imageUrl,
    sourceReleaseDate: row.sourceReleaseDate,
    distributionFormat: row.distributionFormat as DealListing["distributionFormat"],
    genres: row.genres ?? [],
    platforms: row.platforms ?? [],
    rating: row.rating,
    ratingSource: row.ratingSource as RatingSource | null,
  };
}

function rowToDeal(row: typeof deals.$inferSelect): NormalizedDeal {
  return {
    id: row.id,
    source: row.source as NormalizedDeal["source"],
    title: row.title,
    normalizedTitle: row.normalizedTitle,
    steamAppId: row.steamAppId,
    externalStoreUid: row.externalStoreUid,
    storeName: row.storeName,
    priceEur: row.priceEur,
    originalPriceEur: row.originalPriceEur,
    discountPercent: row.discountPercent,
    currencyOriginal: row.currencyOriginal,
    url: row.url,
    imageUrl: row.imageUrl,
    region: row.region,
    sourceReleaseDate: row.sourceReleaseDate,
    distributionFormat:
      row.distributionFormat as NormalizedDeal["distributionFormat"],
    genres: row.genres ?? [],
    platforms: row.platforms ?? [],
    rating: row.rating,
    ratingSource: row.ratingSource as RatingSource | null,
    description: row.description,
    coverUrl: row.coverUrl,
    screenshotUrls: row.screenshotUrls ?? [],
    videoUrls: row.videoUrls ?? [],
    fetchedAt: row.fetchedAt,
  };
}

function buildDealFilters(filters: DealListFilters): SQL[] {
  const conditions: SQL[] = [lte(deals.priceEur, MAX_PRICE_EUR)];

  if (filters.q) {
    conditions.push(ilike(deals.title, `%${filters.q}%`));
  }

  if (filters.platforms.length > 0) {
    conditions.push(arrayOverlaps(deals.platforms, filters.platforms));
  }

  if (filters.genres.length > 0) {
    conditions.push(arrayOverlaps(deals.genres, filters.genres));
  }

  if (filters.minRating !== null) {
    conditions.push(gte(deals.rating, filters.minRating));
  }

  if (filters.store) {
    conditions.push(eq(deals.storeName, filters.store));
  }

  return conditions;
}

function familySqlCondition(family: "pc" | "console"): SQL {
  if (family === "console") {
    return arrayOverlaps(deals.platforms, [...CONSOLE_PLATFORMS]);
  }
  return sql`NOT (${deals.platforms} && ARRAY[${sql.join(
    CONSOLE_PLATFORMS.map((platform) => sql`${platform}`),
    sql`, `,
  )}]::text[])`;
}

function rowToGroupingDeal(
  row: {
    id: string;
    source: string;
    title: string;
    storeName: string;
    steamAppId: string | null;
    externalStoreUid: string | null;
    priceEur: number;
    originalPriceEur: number;
    url: string;
    imageUrl: string | null;
    sourceReleaseDate: string | null;
    distributionFormat: string;
    genres: string[] | null;
    platforms: string[] | null;
    rating: number | null;
    ratingSource: string | null;
    normalizedTitle: string;
  },
): DealForGrouping {
  return {
    ...rowToListing(row),
    normalizedTitle: row.normalizedTitle,
  };
}

function buildGameOfferDetail(
  groupKey: string,
  rows: NormalizedDeal[],
): GameOfferDetail {
  const sorted = [...rows].sort((a, b) => a.priceEur - b.priceEur);
  const lead = sorted[0];
  const metadata =
    sorted.find((deal) => deal.description || deal.coverUrl) ?? lead;
  const screenshots = sorted.find((deal) => deal.screenshotUrls.length > 0);
  const videos = sorted.find((deal) => deal.videoUrls.length > 0);
  const formats = new Set(sorted.map((deal) => deal.distributionFormat));

  return {
    groupKey,
    title: lead.title,
    platforms: [...new Set(sorted.flatMap((deal) => deal.platforms))].sort(),
    genres:
      sorted.find((deal) => deal.genres.length > 0)?.genres ?? lead.genres,
    rating:
      sorted.find((deal) => deal.rating !== null)?.rating ?? lead.rating,
    ratingSource:
      sorted.find((deal) => deal.ratingSource)?.ratingSource ??
      lead.ratingSource,
    description: metadata.description,
    coverUrl: metadata.coverUrl ?? metadata.imageUrl,
    screenshotUrls: screenshots?.screenshotUrls ?? [],
    videoUrls: videos?.videoUrls ?? [],
    sourceReleaseDate:
      sorted.reduce<string | null>((latest, deal) => {
        if (!deal.sourceReleaseDate) {
          return latest;
        }
        if (!latest || deal.sourceReleaseDate > latest) {
          return deal.sourceReleaseDate;
        }
        return latest;
      }, null) ?? lead.sourceReleaseDate,
    distributionFormat:
      formats.size === 1 ? lead.distributionFormat : "unknown",
    minPriceEur: lead.priceEur,
    maxOriginalPriceEur: Math.max(...sorted.map((deal) => deal.originalPriceEur)),
    offers: sorted.map((deal) => rowToListing(deal)),
    offerCount: sorted.length,
  };
}

export interface SyncSourceDealsResult {
  upserted: number;
  /** Rows removed because they were absent from this successful run. */
  deleted: number;
}

function dealValues(item: NormalizedDeal) {
  return {
    id: item.id,
    source: item.source,
    title: item.title,
    normalizedTitle: item.normalizedTitle,
    steamAppId: item.steamAppId,
    externalStoreUid: item.externalStoreUid,
    storeName: item.storeName,
    priceEur: item.priceEur,
    originalPriceEur: item.originalPriceEur,
    discountPercent: item.discountPercent,
    currencyOriginal: item.currencyOriginal,
    url: item.url,
    imageUrl: item.imageUrl,
    region: item.region,
    sourceReleaseDate: item.sourceReleaseDate,
    distributionFormat: item.distributionFormat,
    genres: item.genres,
    platforms: item.platforms,
    rating: item.rating,
    ratingSource: item.ratingSource,
    description: item.description,
    coverUrl: item.coverUrl,
    screenshotUrls: item.screenshotUrls,
    videoUrls: item.videoUrls,
    fetchedAt: item.fetchedAt,
  };
}

/** Conflict update set for multi-row upsert — takes values from EXCLUDED. */
const dealConflictUpdateSet = {
  title: sql`excluded.title`,
  normalizedTitle: sql`excluded.normalized_title`,
  steamAppId: sql`excluded.steam_app_id`,
  externalStoreUid: sql`excluded.external_store_uid`,
  storeName: sql`excluded.store_name`,
  priceEur: sql`excluded.price_eur`,
  originalPriceEur: sql`excluded.original_price_eur`,
  discountPercent: sql`excluded.discount_percent`,
  currencyOriginal: sql`excluded.currency_original`,
  url: sql`excluded.url`,
  imageUrl: sql`excluded.image_url`,
  region: sql`excluded.region`,
  sourceReleaseDate: sql`excluded.source_release_date`,
  distributionFormat: sql`excluded.distribution_format`,
  genres: sql`excluded.genres`,
  platforms: sql`excluded.platforms`,
  rating: sql`excluded.rating`,
  ratingSource: sql`excluded.rating_source`,
  description: sql`excluded.description`,
  coverUrl: sql`excluded.cover_url`,
  screenshotUrls: sql`excluded.screenshot_urls`,
  videoUrls: sql`excluded.video_urls`,
  fetchedAt: sql`excluded.fetched_at`,
} as const;

/**
 * Upsert this run's deals, then delete any other rows for the same source.
 * Empty runs never delete — a blank fetch must not wipe the catalog.
 */
export async function syncSourceDeals(
  source: DealSource,
  items: NormalizedDeal[],
): Promise<SyncSourceDealsResult> {
  if (items.length === 0) {
    return { upserted: 0, deleted: 0 };
  }

  const mismatched = items.find((item) => item.source !== source);
  if (mismatched) {
    throw new Error(
      `syncSourceDeals: deal ${mismatched.id} has source "${mismatched.source}", expected "${source}"`,
    );
  }

  const keepIds = items.map((item) => item.id);

  return db.transaction(async (tx) => {
    await tx
      .insert(deals)
      .values(items.map(dealValues))
      .onConflictDoUpdate({
        target: deals.id,
        set: dealConflictUpdateSet,
      });

    const removed = await tx
      .delete(deals)
      .where(and(eq(deals.source, source), notInArray(deals.id, keepIds)))
      .returning({ id: deals.id });

    return { upserted: items.length, deleted: removed.length };
  });
}

const groupingColumns = {
  ...listingColumns,
  normalizedTitle: deals.normalizedTitle,
} as const;

export async function listGameOffersPage(
  filters: DealListFilters = {
    q: "",
    platforms: [],
    genres: [],
    minRating: null,
    store: null,
  },
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<GameOfferListPage> {
  const safePageSize = Math.max(1, Math.min(pageSize, 100));
  const where = and(...buildDealFilters(filters));
  const requestedPage = Math.max(1, page);

  // TODO: Loads all matching rows, groups in JS, then paginates in memory.
  // Fine at current catalog size; move grouping/pagination toward SQL when
  // this query becomes hot as the deals table grows.
  const rows = await db
    .select(groupingColumns)
    .from(deals)
    .where(where);

  const allGames = groupDealsIntoOffers(rows.map(rowToGroupingDeal));
  const total = allGames.length;
  const totalPages = total === 0 ? 1 : Math.ceil(total / safePageSize);
  const safePage = Math.min(requestedPage, totalPages);
  const offset = (safePage - 1) * safePageSize;

  return {
    games: allGames.slice(offset, offset + safePageSize),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  };
}

export async function listDealFilterOptions(): Promise<{
  platforms: string[];
  genres: string[];
}> {
  const [platformRows, genreRows] = await Promise.all([
    db.execute<{ value: string }>(sql`
      SELECT DISTINCT unnest(${deals.platforms}) AS value
      FROM ${deals}
      WHERE ${deals.priceEur} <= ${MAX_PRICE_EUR}
      ORDER BY 1
    `),
    db.execute<{ value: string }>(sql`
      SELECT DISTINCT unnest(${deals.genres}) AS value
      FROM ${deals}
      WHERE ${deals.priceEur} <= ${MAX_PRICE_EUR}
      ORDER BY 1
    `),
  ]);

  return {
    platforms: platformRows.map((row) => row.value).filter(Boolean),
    genres: genreRows.map((row) => row.value).filter(Boolean),
  };
}

export async function getGameOfferByGroupKey(
  groupKey: string,
): Promise<GameOfferDetail | null> {
  const parsed = parseGroupKey(groupKey);
  if (!parsed) {
    return null;
  }

  const conditions: SQL[] = [
    lte(deals.priceEur, MAX_PRICE_EUR),
    familySqlCondition(parsed.family),
  ];

  if (parsed.steamAppId) {
    conditions.push(eq(deals.steamAppId, parsed.steamAppId));
  } else if (parsed.normalizedTitle) {
    conditions.push(eq(deals.normalizedTitle, parsed.normalizedTitle));
    conditions.push(sql`${deals.steamAppId} IS NULL`);
  } else {
    return null;
  }

  const rows = await db
    .select()
    .from(deals)
    .where(and(...conditions));

  if (rows.length === 0) {
    return null;
  }

  const normalized = rows.map(rowToDeal);
  const expectedFamily = parsed.family;
  const matching = normalized.filter((deal) =>
    expectedFamily === "console"
      ? isConsoleFamily(deal.platforms)
      : !isConsoleFamily(deal.platforms),
  );

  if (matching.length === 0) {
    return null;
  }

  return buildGameOfferDetail(groupKey, matching);
}
