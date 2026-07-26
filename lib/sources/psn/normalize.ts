import { parseEurPrice } from "@/lib/currency";
import { buildDealId, normalizeTitle } from "@/lib/deal-utils";
import { PLAYSTATION_PLATFORMS } from "@/lib/deals/platforms";
import { MAX_PRICE_EUR } from "@/lib/pricing";
import type { NormalizedDeal } from "@/types/deal";

import type { PsnProduct } from "./schema";
import { buildPsnStoreUrl } from "./store-url";
import { getPsnRegion } from "./config";

const IMAGE_ROLES = [
  "PORTRAIT_BANNER",
  "EDITION_KEY_ART",
  "GAMEHUB_COVER_ART",
  "FOUR_BY_THREE_BANNER",
] as const;

function pickImageUrl(product: PsnProduct): string | null {
  for (const role of IMAGE_ROLES) {
    const media = product.media.find(
      (item) => item.role === role && item.type === "IMAGE",
    );
    if (media) {
      return media.url;
    }
  }
  return null;
}

function discountPercent(product: PsnProduct): number {
  const match = product.price.discountText?.match(/-?(\d+)\s*%/);
  if (match) {
    return Number.parseInt(match[1], 10);
  }

  const base = parseEurPrice(product.price.basePrice);
  const sale = parseEurPrice(product.price.discountedPrice);
  if (base > 0 && sale < base) {
    return Math.round(((base - sale) / base) * 100);
  }

  return 0;
}

function dealPlatforms(product: PsnProduct): string[] {
  return product.platforms.filter((platform) =>
    (PLAYSTATION_PLATFORMS as readonly string[]).includes(platform),
  );
}

function isPlaystationFullGame(product: PsnProduct): boolean {
  return (
    product.storeDisplayClassification === "FULL_GAME" &&
    product.platforms.some((platform) =>
      (PLAYSTATION_PLATFORMS as readonly string[]).includes(platform),
    )
  );
}

export function normalizePsnProduct(product: PsnProduct): NormalizedDeal | null {
  if (!isPlaystationFullGame(product) || product.price.isFree) {
    return null;
  }

  const priceEur = parseEurPrice(product.price.discountedPrice);
  const originalPriceEur = parseEurPrice(product.price.basePrice);

  if (Number.isNaN(priceEur) || priceEur > MAX_PRICE_EUR) {
    return null;
  }

  return {
    id: buildDealId("psn", product.id),
    source: "psn",
    title: product.name,
    normalizedTitle: normalizeTitle(product.name),
    steamAppId: null,
    externalStoreUid: product.npTitleId ?? null,
    storeName: "PlayStation Store",
    priceEur,
    originalPriceEur: Number.isNaN(originalPriceEur)
      ? priceEur
      : originalPriceEur,
    discountPercent: discountPercent(product),
    currencyOriginal: "EUR",
    url: buildPsnStoreUrl(product.id),
    imageUrl: pickImageUrl(product),
    region: getPsnRegion(),
    sourceReleaseDate: null,
    distributionFormat: "digital",
    genres: [],
    platforms: dealPlatforms(product),
    rating: null,
    ratingSource: null,
    description: null,
    coverUrl: null,
    screenshotUrls: [],
    videoUrls: [],
    fetchedAt: new Date().toISOString(),
  };
}
