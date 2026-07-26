import { buildDealId, normalizeTitle } from "@/lib/deal-utils";
import type { NormalizedDeal } from "@/types/deal";

import { XBOX_MAX_PRICE_EUR } from "./config";
import type { EmeraldProductSummary } from "./schema";
import { buildXboxStoreUrl } from "./store-url";

const EMERALD_XBOX_SERIES = "XboxSeriesX";
const EMERALD_XBOX_ONE = "XboxOne";

const LISTING_XBOX_SERIES = "Xbox Series X|S";
const LISTING_XBOX_ONE = "Xbox One";

function normalizeImageUrl(url: string | undefined): string | null {
  if (!url) {
    return null;
  }
  if (url.startsWith("//")) {
    return `https:${url}`;
  }
  return url;
}

function dealPlatforms(availableOn: string[]): string[] {
  const platforms: string[] = [];
  if (availableOn.includes(EMERALD_XBOX_SERIES)) {
    platforms.push(LISTING_XBOX_SERIES);
  }
  if (availableOn.includes(EMERALD_XBOX_ONE)) {
    platforms.push(LISTING_XBOX_ONE);
  }
  return platforms;
}

function isXboxGame(product: EmeraldProductSummary): boolean {
  if (product.productKind !== "Game") {
    return false;
  }
  return product.availableOn.some(
    (platform) => platform === EMERALD_XBOX_SERIES || platform === EMERALD_XBOX_ONE,
  );
}

function storeRating(product: EmeraldProductSummary): {
  rating: number | null;
  ratingSource: NormalizedDeal["ratingSource"];
} {
  if (product.averageRating == null || product.averageRating <= 0) {
    return { rating: null, ratingSource: null };
  }
  return {
    rating: Math.round(product.averageRating * 20),
    ratingSource: "store",
  };
}

interface XboxPurchase {
  priceEur: number;
  originalPriceEur: number;
  discountPercent: number;
}

/** Validates and extracts pricing, or null if this product isn't a purchasable EUR deal within budget. */
function resolveXboxPurchase(product: EmeraldProductSummary): XboxPurchase | null {
  const purchase = product.specificPrices?.purchaseable?.[0];
  if (!purchase) {
    return null;
  }
  if (purchase.currency !== "EUR") {
    return null;
  }

  const priceEur = purchase.listPrice;
  if (priceEur <= 0 || priceEur > XBOX_MAX_PRICE_EUR) {
    return null;
  }

  return {
    priceEur,
    originalPriceEur: purchase.msrp > 0 ? purchase.msrp : priceEur,
    discountPercent: Math.round(purchase.discountPercentage ?? 0),
  };
}

function xboxDescription(product: EmeraldProductSummary): string | null {
  return product.shortDescription ?? product.description ?? null;
}

export function normalizeXboxProduct(
  product: EmeraldProductSummary,
): NormalizedDeal | null {
  if (!isXboxGame(product)) {
    return null;
  }

  const purchase = resolveXboxPurchase(product);
  if (!purchase) {
    return null;
  }

  const platforms = dealPlatforms(product.availableOn);
  if (platforms.length === 0) {
    return null;
  }

  const { rating, ratingSource } = storeRating(product);
  const imageUrl = normalizeImageUrl(product.images?.poster?.url);

  return {
    id: buildDealId("xbox", product.productId),
    source: "xbox",
    title: product.title,
    normalizedTitle: normalizeTitle(product.title),
    steamAppId: null,
    externalStoreUid: product.productId,
    storeName: "Xbox Store",
    priceEur: purchase.priceEur,
    originalPriceEur: purchase.originalPriceEur,
    discountPercent: purchase.discountPercent,
    currencyOriginal: "EUR",
    url: buildXboxStoreUrl(product.title, product.productId),
    imageUrl,
    region: "DE",
    sourceReleaseDate: product.releaseDate ?? null,
    distributionFormat: "digital",
    genres: product.categories ?? [],
    platforms,
    rating,
    ratingSource,
    description: xboxDescription(product),
    coverUrl: imageUrl,
    screenshotUrls: [],
    videoUrls: [],
    fetchedAt: new Date().toISOString(),
  };
}
