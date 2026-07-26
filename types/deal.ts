import type { DealSource } from "@/types/deal-source";

export type RatingSource = "metacritic" | "steam" | "store" | "igdb";

export type DistributionFormat = "digital" | "physical" | "unknown";

export interface NormalizedDeal {
  id: string;
  source: DealSource;
  title: string;
  normalizedTitle: string;
  steamAppId: string | null;
  /** Store-native ID for IGDB external-game lookup (e.g. PSN npTitleId). */
  externalStoreUid: string | null;
  storeName: string;
  priceEur: number;
  originalPriceEur: number;
  discountPercent: number;
  currencyOriginal: string;
  url: string;
  imageUrl: string | null;
  region: string | null;
  sourceReleaseDate: string | null;
  /** What the buyer receives — never guess; prefer unknown over wrong. */
  distributionFormat: DistributionFormat;
  genres: string[];
  platforms: string[];
  rating: number | null;
  ratingSource: RatingSource | null;
  /** IGDB snapshot — filled at ingestion, not on page views. */
  description: string | null;
  coverUrl: string | null;
  screenshotUrls: string[];
  /** YouTube watch URLs — IGDB snapshot at cron. */
  videoUrls: string[];
  fetchedAt: string;
}

/** Columns needed by deal cards / listing — never includes detail-only fields. */
export type DealListing = Pick<
  NormalizedDeal,
  | "id"
  | "source"
  | "title"
  | "storeName"
  | "steamAppId"
  | "externalStoreUid"
  | "priceEur"
  | "originalPriceEur"
  | "url"
  | "imageUrl"
  | "sourceReleaseDate"
  | "distributionFormat"
  | "genres"
  | "platforms"
  | "rating"
  | "ratingSource"
>;

/** One game on a platform family (PC or console), with store offers grouped. */
export interface GameOffer {
  groupKey: string;
  title: string;
  imageUrl: string | null;
  genres: string[];
  platforms: string[];
  rating: number | null;
  ratingSource: RatingSource | null;
  sourceReleaseDate: string | null;
  distributionFormat: DistributionFormat;
  minPriceEur: number;
  maxOriginalPriceEur: number;
  offers: DealListing[];
  offerCount: number;
}

/** Game detail page — metadata plus all store offers, cheapest first. */
export interface GameOfferDetail {
  groupKey: string;
  title: string;
  platforms: string[];
  genres: string[];
  rating: number | null;
  ratingSource: RatingSource | null;
  description: string | null;
  coverUrl: string | null;
  screenshotUrls: string[];
  videoUrls: string[];
  sourceReleaseDate: string | null;
  distributionFormat: DistributionFormat;
  minPriceEur: number;
  maxOriginalPriceEur: number;
  offers: DealListing[];
  offerCount: number;
}
