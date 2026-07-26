import Link from "next/link";

import {
  formatRatingBadgeValue,
  getScoreBadgeClass,
} from "@/lib/format-rating";
import { sortPlatforms } from "@/lib/format-platform";
import { clsx } from "clsx";
import type { GameOffer } from "@/types/deal";

import { DealImage } from "./deal-image";

function gameHref(groupKey: string): string {
  return `/deals/${encodeURIComponent(groupKey)}`;
}

function discountPercent(price: number, original: number): number | null {
  if (original <= price || original <= 0) {
    return null;
  }
  return Math.round(((original - price) / original) * 100);
}

function PlatformsOverlay({ platforms }: { platforms: string[] }) {
  if (platforms.length === 0) {
    return null;
  }
  return (
    <div className="pointer-events-none absolute top-0 left-0 z-10 flex max-w-[85%] flex-wrap gap-1 rounded-br-md bg-bg/75 px-2 py-1 backdrop-blur-[2px]">
      {platforms.slice(0, 2).map((platform) => (
        <span
          key={platform}
          className="text-[10px] font-semibold uppercase tracking-wide text-fg/85"
        >
          {platform}
        </span>
      ))}
      {platforms.length > 2 ? (
        <span className="text-[10px] font-semibold text-muted">
          +{platforms.length - 2}
        </span>
      ) : null}
    </div>
  );
}

function PriceOverlay({ game, lead }: { game: GameOffer; lead: GameOffer["offers"][number] }) {
  const cut = discountPercent(lead.priceEur, lead.originalPriceEur);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-bg/95 via-bg/55 to-transparent px-2.5 pb-2.5 pt-10">
      <div className="flex items-end justify-between gap-2">
        <span className="inline-flex items-end gap-1.5">
          <span className="inline-flex flex-col items-start leading-none">
            {lead.originalPriceEur > lead.priceEur ? (
              <span className="mb-0.5 text-[10px] tabular-nums text-muted line-through">
                €{lead.originalPriceEur.toFixed(2)}
              </span>
            ) : null}
            <span className="font-sans text-xl font-bold tabular-nums tracking-tight text-price sm:text-2xl">
              €{game.minPriceEur.toFixed(2)}
            </span>
          </span>
          {cut !== null ? (
            <span className="pb-0.5 text-xs font-semibold tabular-nums text-cut">
              −{cut}%
            </span>
          ) : null}
        </span>
        {game.rating !== null && game.ratingSource ? (
          <span
            className={clsx(
              "flex min-w-8 items-center justify-center rounded px-1.5 py-1 text-sm font-bold leading-none",
              getScoreBadgeClass(game.rating, game.ratingSource),
            )}
            aria-label={`Score ${formatRatingBadgeValue(game.rating, game.ratingSource)}`}
            title={`Score ${formatRatingBadgeValue(game.rating, game.ratingSource)}`}
          >
            {formatRatingBadgeValue(game.rating, game.ratingSource)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function CardMetaRow({ game, lead }: { game: GameOffer; lead: GameOffer["offers"][number] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted">
      {game.distributionFormat === "physical" ? (
        <span className="rounded bg-accent/20 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-accent">
          Physical
        </span>
      ) : null}
      {game.distributionFormat === "physical" ? <span aria-hidden>·</span> : null}
      {game.offerCount > 1 ? (
        <span>{game.offerCount} stores</span>
      ) : (
        <span>{lead.storeName}</span>
      )}
    </div>
  );
}

export function GameOfferCard({ game }: { game: GameOffer }) {
  const lead = game.offers[0];
  const platforms = sortPlatforms(game.platforms);
  const href = gameHref(game.groupKey);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-stroke bg-surface transition-[border-color,transform] duration-150 hover:border-muted">
      <div className="relative aspect-[3/4] overflow-hidden bg-surface-2">
        <Link href={href} className="absolute inset-0 block">
          {game.imageUrl ? (
            <DealImage
              src={game.imageUrl}
              alt=""
              fill
              className="transition-transform duration-200 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              No art
            </div>
          )}
        </Link>

        <PlatformsOverlay platforms={platforms} />
        <PriceOverlay game={game} lead={lead} />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <Link
          href={href}
          className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-fg transition-colors duration-150 hover:text-accent"
        >
          {game.title}
        </Link>

        <div className="mt-auto">
          <CardMetaRow game={game} lead={lead} />
        </div>
      </div>
    </article>
  );
}
