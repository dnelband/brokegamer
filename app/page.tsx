import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { SiteHeader } from "@/components/site-header";
import {
  getCachedGameOfferByGroupKey,
  getCachedHomeDealPicks,
} from "@/lib/db/deals-cached";
import type { GameOffer } from "@/types/deal";

import { HomeFeaturedDeal, HomeHeroDeal } from "./home-deal-cards";
import { PlatformDealRows } from "./home-platform-slider";

function HomeFallback() {
  return (
    <div className="flex flex-col gap-10">
      <div className="h-72 animate-pulse rounded-lg bg-surface-2 lg:min-h-[22rem]" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-36 animate-pulse rounded-lg bg-surface-2" />
        <div className="h-36 animate-pulse rounded-lg bg-surface-2" />
      </div>
      {Array.from({ length: 3 }).map((_, row) => (
        <div key={row} className="flex flex-col gap-3">
          <div className="h-6 w-28 animate-pulse rounded bg-surface-2" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="aspect-[3/4] w-[42%] shrink-0 animate-pulse rounded-lg bg-surface-2 sm:w-[30%] lg:w-[22%]"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BrowseAllDealsCta() {
  return (
    <div className="flex justify-center pt-2">
      <Link
        href="/deals"
        className="text-sm font-semibold text-accent transition-colors hover:text-fg"
      >
        Browse all deals →
      </Link>
    </div>
  );
}

function DealsOfTheDaySection({
  games,
  heroMedia,
}: {
  games: GameOffer[];
  heroMedia: {
    screenshotUrls: string[];
    videoUrls: string[];
    coverUrl: string | null;
  } | null;
}) {
  if (games.length === 0) {
    return null;
  }

  const [hero, ...featured] = games;

  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
        Deals of the Day
      </h1>
      <div className="flex flex-col gap-4">
        {hero ? (
          <HomeHeroDeal
            game={hero}
            screenshotUrls={heroMedia?.screenshotUrls}
            videoUrls={heroMedia?.videoUrls}
            coverUrl={heroMedia?.coverUrl ?? hero.imageUrl}
          />
        ) : null}
        {featured.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 sm:items-stretch">
            {featured.map((game) => (
              <HomeFeaturedDeal key={game.groupKey} game={game} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

async function HomeDealsContent() {
  await connection();
  const picks = await getCachedHomeDealPicks();
  const dealsOfTheDay = picks.dealsOfTheDay ?? [];
  const platformRows = picks.platformRows ?? [];
  const hero = dealsOfTheDay[0];
  const heroDetail = hero
    ? await getCachedGameOfferByGroupKey(hero.groupKey)
    : null;
  const heroMedia = heroDetail
    ? {
        screenshotUrls: heroDetail.screenshotUrls,
        videoUrls: heroDetail.videoUrls,
        coverUrl: heroDetail.coverUrl ?? hero.imageUrl,
      }
    : null;

  if (dealsOfTheDay.length === 0 && platformRows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-muted">No deals under €10 right now.</p>
        <BrowseAllDealsCta />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      <DealsOfTheDaySection games={dealsOfTheDay} heroMedia={heroMedia} />
      <PlatformDealRows rows={platformRows} />
      <BrowseAllDealsCta />
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6">
      <SiteHeader size="lg" />
      <Suspense fallback={<HomeFallback />}>
        <HomeDealsContent />
      </Suspense>
    </div>
  );
}
