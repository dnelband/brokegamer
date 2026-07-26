import { SiteHeader } from "@/components/site-header";
import { resolveOfferUrl } from "@/lib/deals/resolve-offer-url";
import { sortPlatforms } from "@/lib/format-platform";
import type { GameOfferDetail } from "@/types/deal";

import { DealImage } from "../deal-image";
import { DealRating } from "../deal-rating";
import { DealMediaGallery } from "./deal-media-gallery";

function discountPercent(price: number, original: number): number | null {
  if (original <= price || original <= 0) {
    return null;
  }
  return Math.round(((original - price) / original) * 100);
}

function OfferCta({
  href,
  storeName,
  variant,
}: {
  href: string | null;
  storeName: string;
  variant: "primary" | "secondary";
}) {
  const label =
    variant === "primary" ? `Best price · ${storeName}` : "View deal →";

  if (!href) {
    return (
      <span
        className={
          variant === "primary"
            ? "inline-flex h-12 w-full items-center justify-center rounded-md border border-stroke px-8 text-sm font-semibold text-muted sm:w-fit"
            : "inline-flex h-9 items-center rounded-md border border-stroke px-3 text-xs font-medium text-muted"
        }
        title="Product link not available for this store yet"
      >
        {variant === "primary" ? storeName : "No product link"}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        variant === "primary"
          ? "inline-flex h-12 w-full items-center justify-center rounded-md bg-accent px-8 text-sm font-semibold text-fg transition-opacity duration-150 hover:opacity-90 sm:w-fit"
          : "inline-flex h-9 items-center rounded-md border border-stroke px-3 text-xs font-medium text-fg transition-colors duration-150 hover:bg-surface-2"
      }
    >
      {label}
    </a>
  );
}

function GameHeroImage({
  imageUrl,
}: {
  imageUrl: string | null;
}) {
  return (
    <div className="relative aspect-[3/4] w-full max-w-md overflow-hidden rounded-lg lg:max-w-none">
      {imageUrl ? (
        <DealImage
          src={imageUrl}
          alt=""
          fill
          priority
          fit="contain"
          sizes="(max-width: 1024px) 100vw, 32rem"
          className="object-left"
        />
      ) : (
        <div className="flex h-full min-h-80 items-center justify-center text-sm text-muted">
          No cover art
        </div>
      )}
    </div>
  );
}

function GameMetaLine({ game }: { game: GameOfferDetail }) {
  const platforms = sortPlatforms(game.platforms);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
      {game.distributionFormat === "physical" ? (
        <span className="rounded-md bg-accent/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-accent">
          Physical
        </span>
      ) : null}
      {platforms.length > 0 ? <span>{platforms.join(" · ")}</span> : null}
      {platforms.length > 0 && game.sourceReleaseDate ? (
        <span aria-hidden>·</span>
      ) : null}
      {game.sourceReleaseDate ? (
        <span>{game.sourceReleaseDate.slice(0, 4)}</span>
      ) : null}
      {game.offerCount > 1 ? (
        <>
          <span aria-hidden>·</span>
          <span>{game.offerCount} stores</span>
        </>
      ) : null}
    </div>
  );
}

function GameHeader({ game }: { game: GameOfferDetail }) {
  return (
    <header className="flex flex-col gap-4">
      <GameMetaLine game={game} />

      <h1 className="font-display text-4xl font-semibold tracking-tight text-balance text-fg sm:text-5xl">
        {game.title}
      </h1>

      {game.genres.length > 0 ? (
        <p className="text-sm text-muted">{game.genres.join(" · ")}</p>
      ) : null}

      {game.rating !== null && game.ratingSource ? (
        <DealRating rating={game.rating} source={game.ratingSource} />
      ) : null}
    </header>
  );
}

function LeadPriceRow({
  game,
  lead,
}: {
  game: GameOfferDetail;
  lead: GameOfferDetail["offers"][number];
}) {
  const onSale = lead.originalPriceEur > lead.priceEur;
  const cut = discountPercent(lead.priceEur, lead.originalPriceEur);

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="inline-flex flex-col items-start leading-none">
        {onSale ? (
          <span className="mb-1 text-xs tabular-nums text-muted line-through">
            €{lead.originalPriceEur.toFixed(2)}
          </span>
        ) : null}
        <span className="text-4xl font-bold tabular-nums tracking-tight text-price sm:text-5xl">
          €{game.minPriceEur.toFixed(2)}
        </span>
      </div>
      {cut !== null ? (
        <span className="pb-1 text-lg font-semibold tabular-nums text-cut">
          −{cut}%
        </span>
      ) : null}
    </div>
  );
}

function OfferListItem({
  offer,
  isCheapest,
}: {
  offer: GameOfferDetail["offers"][number];
  isCheapest: boolean;
}) {
  const offerOnSale = offer.originalPriceEur > offer.priceEur;
  const offerUrl = resolveOfferUrl(offer);

  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-fg">
          {offer.storeName}
          {isCheapest ? (
            <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-cut">
              Cheapest
            </span>
          ) : null}
        </span>
        {offerOnSale ? (
          <span className="text-xs text-muted line-through">
            €{offer.originalPriceEur.toFixed(2)}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-lg font-semibold tabular-nums text-price">
          €{offer.priceEur.toFixed(2)}
        </span>
        <OfferCta href={offerUrl} storeName={offer.storeName} variant="secondary" />
      </div>
    </li>
  );
}

function OffersList({ game }: { game: GameOfferDetail }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        Where to buy
      </h2>
      <ul className="divide-y divide-stroke border-y border-stroke">
        {game.offers.map((offer, index) => (
          <OfferListItem key={offer.id} offer={offer} isCheapest={index === 0} />
        ))}
      </ul>
    </div>
  );
}

function AboutSection({ game }: { game: GameOfferDetail }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-xl font-semibold text-fg">About</h2>
      {game.description ? (
        <p className="max-w-3xl text-base leading-7 text-fg/90 sm:text-lg sm:leading-8">
          {game.description}
        </p>
      ) : (
        <p className="text-sm italic text-muted">
          No description available for this game.
        </p>
      )}
    </section>
  );
}

export function GameOfferDetailView({ game }: { game: GameOfferDetail }) {
  const lead = game.offers[0];
  const leadUrl = resolveOfferUrl(lead);
  const heroImageUrl = game.coverUrl ?? lead.imageUrl;
  const hasGallery = game.screenshotUrls.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 py-8 sm:gap-16 sm:px-6 sm:py-10">
      <SiteHeader size="sm" />

      <section className="grid items-start gap-8 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[minmax(0,32rem)_minmax(0,1fr)]">
        <GameHeroImage imageUrl={heroImageUrl} />

        <div className="flex min-h-0 flex-col gap-8">
          <GameHeader game={game} />

          <div className="flex flex-col gap-6">
            <LeadPriceRow game={game} lead={lead} />
            <OfferCta href={leadUrl} storeName={lead.storeName} variant="primary" />
          </div>

          <OffersList game={game} />
        </div>
      </section>

      <AboutSection game={game} />

      {hasGallery ? (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-semibold text-fg">
            Screenshots
          </h2>
          <DealMediaGallery
            screenshotUrls={game.screenshotUrls}
            title={game.title}
          />
        </section>
      ) : null}
    </div>
  );
}
