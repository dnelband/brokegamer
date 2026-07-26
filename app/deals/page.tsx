import { connection } from "next/server";
import { Suspense } from "react";

import { SiteHeader } from "@/components/site-header";
import {
  getCachedDealFilterOptions,
  getCachedGameOffersPage,
} from "@/lib/db/deals-cached";
import {
  parseDealFilters,
  parsePage,
  type DealListFilters,
} from "@/lib/deals/filters";
import { searchGamesForWishlist } from "@/lib/enrichment/igdb-wishlist-search";
import { listWishlistItems } from "@/lib/db/wishlists";
import { createClient } from "@/lib/supabase/server";

import { GameOfferCard } from "./game-offer-card";
import { DealPagination } from "./deal-pagination";
import {
  DealFiltersSkeleton,
  DealsGridSkeleton,
} from "./deals-grid-skeleton";
import { DealsShell } from "./deals-shell";
import { EmptyDealsMessage } from "./empty-deals-message";

function DealsPageFallback() {
  return (
    <div className="flex flex-col gap-6">
      <DealFiltersSkeleton />
      <DealsGridSkeleton />
    </div>
  );
}

function resultsKey(filters: DealListFilters, page: number): string {
  return [
    filters.q,
    filters.platforms.join(","),
    filters.genres.join(","),
    filters.minRating ?? "",
    filters.store ?? "",
    page,
  ].join("|");
}

export default function DealsPage(props: PageProps<"/deals">) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6">
      <SiteHeader size="lg" />

      <Suspense fallback={<DealsPageFallback />}>
        <DealsBrowse {...props} />
      </Suspense>
    </div>
  );
}

async function DealsBrowse(props: PageProps<"/deals">) {
  await connection();
  const searchParams = await props.searchParams;
  const filters = parseDealFilters(searchParams);
  const page = parsePage(searchParams);
  const filterOptions = await getCachedDealFilterOptions();
  const key = resultsKey(filters, page);

  return (
    <DealsShell
      initialFilters={filters}
      availableGenres={filterOptions.genres}
      availablePlatforms={filterOptions.platforms}
    >
      <Suspense key={key} fallback={<DealsGridSkeleton />}>
        <DealsResults filters={filters} page={page} />
      </Suspense>
    </DealsShell>
  );
}

async function loadWishlistedIgdbIds(): Promise<number[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }
  const items = await listWishlistItems(user.id);
  return items.map((item) => item.igdbId);
}

async function DealsResults({
  filters,
  page: requestedPage,
}: {
  filters: DealListFilters;
  page: number;
}) {
  const result = await getCachedGameOffersPage(filters, requestedPage);
  const { games, total, page, pageSize, totalPages } = result;

  if (games.length === 0) {
    const q = filters.q.trim();
    const [wishlistSuggestions, wishlistedIgdbIds] = await Promise.all([
      q ? searchGamesForWishlist(q, 5) : Promise.resolve([]),
      loadWishlistedIgdbIds(),
    ]);

    return (
      <div className="rounded-lg border border-dashed border-stroke bg-surface px-4 py-10 text-center">
        <EmptyDealsMessage
          searchQuery={filters.q}
          wishlistSuggestions={wishlistSuggestions}
          wishlistedIgdbIds={wishlistedIgdbIds}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {games.map((game) => (
          <li key={game.groupKey} className="h-full">
            <GameOfferCard game={game} />
          </li>
        ))}
      </ul>

      <DealPagination
        filters={filters}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
      />
    </div>
  );
}
