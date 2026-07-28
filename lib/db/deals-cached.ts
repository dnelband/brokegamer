import { cacheLife, cacheTag } from "next/cache";

import type { DealListFilters } from "@/lib/deals/filters";
import type { HomeDealPicks } from "@/lib/deals/deals-of-the-day";
import type { GameOfferDetail } from "@/types/deal";

import {
  getGameOfferByGroupKey,
  listDealFilterOptions,
  listGameOffersPage,
  listHomeDealPicks,
  type GameOfferListPage,
} from "./deals";

export async function getCachedGameOffersPage(
  filters: DealListFilters,
  page: number,
  pageSize?: number,
): Promise<GameOfferListPage> {
  "use cache";
  cacheTag("deals");
  cacheLife("hours");
  return listGameOffersPage(filters, page, pageSize);
}

export async function getCachedHomeDealPicks(): Promise<HomeDealPicks> {
  "use cache";
  cacheTag("deals");
  cacheLife("hours");
  const picks = await listHomeDealPicks();
  return {
    dealsOfTheDay: picks.dealsOfTheDay ?? [],
    platformRows: picks.platformRows ?? [],
  };
}

export async function getCachedDealFilterOptions(): Promise<{
  platforms: string[];
  genres: string[];
}> {
  "use cache";
  cacheTag("deals");
  cacheLife("hours");
  return listDealFilterOptions();
}

export async function getCachedGameOfferByGroupKey(
  groupKey: string,
): Promise<GameOfferDetail | null> {
  "use cache";
  cacheTag("deals");
  cacheLife("hours");
  return getGameOfferByGroupKey(groupKey);
}
