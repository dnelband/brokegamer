import { parseUsdPrice, usdToEur } from "@/lib/currency";
import { buildDealId, normalizeTitle } from "@/lib/deal-utils";
import { MAX_PRICE_EUR } from "@/lib/pricing";
import type { NormalizedDeal, RatingSource } from "@/types/deal";

import type { CheapsharkDeal } from "./schema";

function sourceReleaseDate(releaseDate: number): string | null {
  if (releaseDate <= 0) {
    return null;
  }
  return new Date(releaseDate * 1000).toISOString().slice(0, 10);
}

function cheapsharkRating(deal: CheapsharkDeal): {
  rating: number | null;
  ratingSource: RatingSource | null;
} {
  const metacritic = Number.parseInt(deal.metacriticScore, 10);
  if (metacritic > 0) {
    return { rating: metacritic, ratingSource: "metacritic" };
  }

  const steam = Number.parseInt(deal.steamRatingPercent, 10);
  if (steam > 0) {
    return { rating: steam, ratingSource: "steam" };
  }

  return { rating: null, ratingSource: null };
}

export function normalizeCheapsharkDeal(
  deal: CheapsharkDeal,
  storeNames: Map<string, string>,
): NormalizedDeal | null {
  const priceUsd = parseUsdPrice(deal.salePrice);
  const originalUsd = parseUsdPrice(deal.normalPrice);
  const priceEur = usdToEur(priceUsd);
  const originalPriceEur = usdToEur(originalUsd);

  if (priceEur > MAX_PRICE_EUR) {
    return null;
  }

  const steamAppId =
    deal.steamAppID && deal.steamAppID !== "0" ? deal.steamAppID : null;
  const { rating, ratingSource } = cheapsharkRating(deal);
  const storeName =
    storeNames.get(deal.storeID) ?? `Store ${deal.storeID}`;

  return {
    id: buildDealId("cheapshark", deal.dealID),
    source: "cheapshark",
    title: deal.title,
    normalizedTitle: normalizeTitle(deal.title),
    steamAppId,
    externalStoreUid: null,
    storeName,
    priceEur,
    originalPriceEur,
    discountPercent: Math.round(Number.parseFloat(deal.savings)),
    currencyOriginal: "USD",
    // Product URL resolved at render via resolveOfferUrl — not stored as source of truth.
    url: "",
    imageUrl: deal.thumb || null,
    region: null,
    sourceReleaseDate: sourceReleaseDate(deal.releaseDate),
    distributionFormat: "digital",
    genres: [],
    platforms: ["PC"],
    rating,
    ratingSource,
    description: null,
    coverUrl: null,
    screenshotUrls: [],
    videoUrls: [],
    fetchedAt: new Date().toISOString(),
  };
}
