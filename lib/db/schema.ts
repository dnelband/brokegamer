import {
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const sourceHealth = pgTable("source_health", {
  source: text("source").primaryKey(),
  status: text("status").notNull(),
  lastRunAt: timestamp("last_run_at", { withTimezone: true, mode: "string" })
    .notNull(),
  lastSuccessAt: timestamp("last_success_at", {
    withTimezone: true,
    mode: "string",
  }),
  lastFailureAt: timestamp("last_failure_at", {
    withTimezone: true,
    mode: "string",
  }),
  lastError: text("last_error"),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  dealsIngestedLastRun: integer("deals_ingested_last_run"),
});

export const deals = pgTable(
  "deals",
  {
    id: text("id").primaryKey(),
    source: text("source").notNull(),
    title: text("title").notNull(),
    normalizedTitle: text("normalized_title").notNull(),
    steamAppId: text("steam_app_id"),
    externalStoreUid: text("external_store_uid"),
    storeName: text("store_name").notNull(),
    priceEur: doublePrecision("price_eur").notNull(),
    originalPriceEur: doublePrecision("original_price_eur").notNull(),
    discountPercent: integer("discount_percent").notNull(),
    currencyOriginal: text("currency_original").notNull(),
    url: text("url").notNull(),
    imageUrl: text("image_url"),
    region: text("region"),
    sourceReleaseDate: text("source_release_date"),
    distributionFormat: text("distribution_format").notNull().default("unknown"),
    genres: text("genres").array().notNull().default([]),
    platforms: text("platforms").array().notNull().default([]),
    rating: doublePrecision("rating"),
    ratingSource: text("rating_source"),
    description: text("description"),
    coverUrl: text("cover_url"),
    screenshotUrls: text("screenshot_urls").array().notNull().default([]),
    videoUrls: text("video_urls").array().notNull().default([]),
    fetchedAt: timestamp("fetched_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (table) => [
    index("deals_price_eur_idx").on(table.priceEur),
    index("deals_normalized_title_idx").on(table.normalizedTitle),
    index("deals_steam_app_id_idx").on(table.steamAppId),
    index("deals_source_release_date_idx").on(table.sourceReleaseDate),
    index("deals_rating_idx").on(table.rating),
    index("deals_platforms_gin_idx").using("gin", table.platforms),
    index("deals_genres_gin_idx").using("gin", table.genres),
  ],
);

/** Games the user is watching that are not (yet) in the deals catalog. */
export const wishlists = pgTable(
  "wishlists",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    igdbId: integer("igdb_id").notNull(),
    title: text("title").notNull(),
    coverUrl: text("cover_url"),
    releaseDate: text("release_date"),
    steamAppId: text("steam_app_id"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    lastNotifiedAt: timestamp("last_notified_at", {
      withTimezone: true,
      mode: "string",
    }),
    lastNotifiedPriceEur: doublePrecision("last_notified_price_eur"),
  },
  (table) => [
    uniqueIndex("wishlists_user_igdb_uidx").on(table.userId, table.igdbId),
    index("wishlists_user_id_idx").on(table.userId),
  ],
);
