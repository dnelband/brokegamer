import Link from "next/link";
import { clsx } from "clsx";

import { DealImage } from "@/app/deals/deal-image";
import { DealMediaGallery } from "@/app/deals/[id]/deal-media-gallery";
import { eurosSaved } from "@/lib/deals/deals-of-the-day";
import { sortPlatforms } from "@/lib/format-platform";
import {
  formatRatingBadgeValue,
  getScoreBadgeClass,
} from "@/lib/format-rating";
import type { GameOffer } from "@/types/deal";

function gameHref(groupKey: string): string {
  return `/deals/${encodeURIComponent(groupKey)}`;
}

function priceTextClass(size: "lg" | "md" | "sm"): string {
  if (size === "lg") {
    return "text-3xl sm:text-4xl";
  }
  if (size === "md") {
    return "text-xl sm:text-2xl";
  }
  return "text-base";
}

function PriceBlock({
  game,
  size,
}: {
  game: GameOffer;
  size: "lg" | "md" | "sm";
}) {
  const lead = game.offers[0];

  return (
    <span className="inline-flex flex-col items-start leading-none">
      {lead && lead.originalPriceEur > lead.priceEur ? (
        <span
          className={clsx(
            "mb-0.5 tabular-nums text-muted line-through",
            size === "sm" ? "text-[10px]" : "text-xs",
          )}
        >
          €{lead.originalPriceEur.toFixed(2)}
        </span>
      ) : null}
      <span
        className={clsx(
          "font-sans font-bold tabular-nums tracking-tight text-price",
          priceTextClass(size),
        )}
      >
        €{game.minPriceEur.toFixed(2)}
      </span>
    </span>
  );
}

function RatingBadge({
  game,
  size = "md",
}: {
  game: GameOffer;
  size?: "md" | "sm";
}) {
  if (game.rating === null || !game.ratingSource) {
    return null;
  }
  return (
    <span
      className={clsx(
        "inline-flex min-w-8 items-center justify-center rounded px-1.5 py-1 font-bold leading-none",
        size === "sm" ? "text-xs" : "text-sm",
        getScoreBadgeClass(game.rating, game.ratingSource),
      )}
      aria-label={`Score ${formatRatingBadgeValue(game.rating, game.ratingSource)}`}
    >
      {formatRatingBadgeValue(game.rating, game.ratingSource)}
    </span>
  );
}

function SaveBadge({ game, size = "md" }: { game: GameOffer; size?: "md" | "sm" }) {
  const saved = eurosSaved(game);
  if (saved < 1) {
    return null;
  }
  return (
    <span
      className={clsx(
        "font-semibold tabular-nums text-cut",
        size === "sm" ? "text-xs" : "text-sm",
      )}
    >
      Save €{saved.toFixed(0)}
    </span>
  );
}

function StoreLine({ game }: { game: GameOffer }) {
  const lead = game.offers[0];
  if (!lead) {
    return null;
  }
  return (
    <p className="text-sm text-muted">
      {game.offerCount > 1 ? `${game.offerCount} stores · from ${lead.storeName}` : lead.storeName}
    </p>
  );
}

function PlatformsLine({ platforms }: { platforms: string[] }) {
  const sorted = sortPlatforms(platforms).slice(0, 3);
  if (sorted.length === 0) {
    return null;
  }
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-fg/70">
      {sorted.join(" · ")}
    </p>
  );
}

function GenresLine({ genres }: { genres: string[] }) {
  const shown = genres.slice(0, 3);
  if (shown.length === 0) {
    return null;
  }
  return <p className="text-sm text-muted">{shown.join(" · ")}</p>;
}

export function HomeHeroDeal({
  game,
  screenshotUrls = [],
  videoUrls = [],
  coverUrl = null,
}: {
  game: GameOffer;
  screenshotUrls?: string[];
  videoUrls?: string[];
  coverUrl?: string | null;
}) {
  const href = gameHref(game.groupKey);
  const heroCover = coverUrl ?? game.imageUrl;
  const hasGallery = screenshotUrls.length > 0 || videoUrls.length > 0;

  return (
    <article className="group grid overflow-hidden rounded-lg border border-stroke bg-surface lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:items-stretch">
      <div className="min-w-0 bg-surface-2 p-3 sm:p-4">
        {hasGallery ? (
          <DealMediaGallery
            screenshotUrls={screenshotUrls}
            videoUrls={videoUrls}
            coverUrl={heroCover}
            title={game.title}
          />
        ) : (
          <Link
            href={href}
            className="relative block aspect-video overflow-hidden rounded-lg bg-surface-2"
          >
            {heroCover ? (
              <DealImage
                src={heroCover}
                alt=""
                fill
                fit="cover"
                priority
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="transition-transform duration-200 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="flex h-full min-h-[12rem] items-center justify-center text-sm text-muted">
                No art
              </div>
            )}
          </Link>
        )}
      </div>
      <div className="flex flex-col justify-center gap-3 p-5 sm:gap-4 sm:p-8">
        <PlatformsLine platforms={game.platforms} />
        <Link
          href={href}
          className="font-display text-2xl font-semibold leading-tight text-fg transition-colors hover:text-accent sm:text-4xl"
        >
          {game.title}
        </Link>
        <StoreLine game={game} />
        <GenresLine genres={game.genres} />
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 pt-1">
          <PriceBlock game={game} size="lg" />
          <div className="flex flex-wrap items-center gap-3 pb-1">
            <SaveBadge game={game} />
            <RatingBadge game={game} />
          </div>
        </div>
        <div className="pt-2">
          <Link
            href={href}
            className="text-sm font-semibold text-accent transition-colors hover:text-fg"
          >
            View deal →
          </Link>
        </div>
      </div>
    </article>
  );
}

export function HomeFeaturedDeal({ game }: { game: GameOffer }) {
  const href = gameHref(game.groupKey);

  return (
    <article className="group flex h-full overflow-hidden rounded-lg border border-stroke bg-surface">
      <Link
        href={href}
        className="relative aspect-[3/4] w-28 shrink-0 bg-surface-2 sm:w-40"
      >
        {game.imageUrl ? (
          <DealImage
            src={game.imageUrl}
            alt=""
            fill
            fit="cover"
            sizes="160px"
            className="transition-transform duration-200 group-hover:scale-[1.03]"
          />
        ) : null}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 p-3 sm:gap-2 sm:p-5">
        <PlatformsLine platforms={game.platforms} />
        <Link
          href={href}
          className="line-clamp-2 font-display text-base font-semibold leading-snug text-fg transition-colors hover:text-accent sm:text-xl"
        >
          {game.title}
        </Link>
        <StoreLine game={game} />
        <div className="flex flex-wrap items-end gap-x-3 gap-y-1.5 pt-1">
          <PriceBlock game={game} size="md" />
          <div className="flex flex-wrap items-center gap-2 pb-0.5">
            <SaveBadge game={game} size="sm" />
            <RatingBadge game={game} />
          </div>
        </div>
      </div>
    </article>
  );
}
