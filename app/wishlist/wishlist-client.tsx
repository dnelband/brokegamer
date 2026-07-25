"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  addToWishlistAction,
  removeFromWishlistAction,
} from "@/app/wishlist/actions";
import { GenreTags, releaseLabel, WishlistSuggestionTitleRow } from "@/app/wishlist/wishlist-suggestion-meta";
import { DealImage } from "@/app/deals/deal-image";
import type { IgdbSearchCandidate } from "@/lib/enrichment/igdb-wishlist-search";
import { igdbGamePageUrl } from "@/lib/enrichment/igdb-client";
import type { WishlistDealMatch, WishlistItem } from "@/lib/db/wishlists";
import {
  effectiveSearchQuery,
  SEARCH_DEBOUNCE_MS,
} from "@/lib/search-query";

function useWishlistSearchState(initialQuery: string) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<number | null>(null);

  // Adjust state during render when the URL's initial query changes,
  // instead of syncing via an effect that calls setState.
  const [prevInitialQuery, setPrevInitialQuery] = useState(initialQuery);
  if (initialQuery !== prevInitialQuery) {
    setPrevInitialQuery(initialQuery);
    setQuery(initialQuery);
  }

  useEffect(() => {
    const effectiveQ = effectiveSearchQuery(query);
    if (effectiveQ === initialQuery) {
      return;
    }

    const timer = setTimeout(() => {
      startTransition(() => {
        router.push(
          effectiveQ ? `/wishlist?q=${encodeURIComponent(effectiveQ)}` : "/wishlist",
        );
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, initialQuery, router]);

  function onQueryChange(value: string) {
    setQuery(value);
    setError(null);
  }

  async function onAdd(candidate: IgdbSearchCandidate) {
    setError(null);
    setAddingId(candidate.igdbId);
    const result = await addToWishlistAction({
      igdbId: candidate.igdbId,
      title: candidate.title,
      coverUrl: candidate.coverUrl,
      releaseDate: candidate.releaseDate,
      steamAppId: candidate.steamAppId,
    });
    setAddingId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    startTransition(() => {
      router.refresh();
    });
  }

  const effectiveQuery = effectiveSearchQuery(query);
  const isSearching = pending || effectiveQuery !== initialQuery;

  return { query, onQueryChange, error, addingId, onAdd, isSearching };
}

function SearchResultItem({
  candidate,
  isAdding,
  onAdd,
}: {
  candidate: IgdbSearchCandidate;
  isAdding: boolean;
  onAdd: (candidate: IgdbSearchCandidate) => void;
}) {
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-surface-2">
        {candidate.coverUrl ? (
          <DealImage
            src={candidate.coverUrl}
            alt=""
            fill
            fit="cover"
            sizes="40px"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <WishlistSuggestionTitleRow
          title={candidate.title}
          releaseDate={candidate.releaseDate}
          href={igdbGamePageUrl(candidate)}
        />
        <GenreTags genres={candidate.genres} />
      </div>
      <button
        type="button"
        disabled={isAdding}
        onClick={() => onAdd(candidate)}
        className="shrink-0 rounded-md border border-stroke px-3 py-1.5 text-xs font-semibold text-fg transition-colors hover:bg-surface-2 disabled:opacity-50"
      >
        {isAdding ? "Adding…" : "Add"}
      </button>
    </li>
  );
}

function SearchResultsList({
  initialQuery,
  initialResults,
  addingId,
  onAdd,
}: {
  initialQuery: string;
  initialResults: IgdbSearchCandidate[];
  addingId: number | null;
  onAdd: (candidate: IgdbSearchCandidate) => void;
}) {
  const activeSearch = initialQuery.length > 0;

  if (!activeSearch) {
    return null;
  }

  if (initialResults.length === 0) {
    return (
      <p className="text-sm text-muted">
        No IGDB matches for “{initialQuery}”.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-stroke rounded-lg border border-stroke">
      {initialResults.map((candidate) => (
        <SearchResultItem
          key={candidate.igdbId}
          candidate={candidate}
          isAdding={addingId === candidate.igdbId}
          onAdd={onAdd}
        />
      ))}
    </ul>
  );
}

export function WishlistSearch({
  initialQuery,
  initialResults,
}: {
  initialQuery: string;
  initialResults: IgdbSearchCandidate[];
}) {
  const { query, onQueryChange, error, addingId, onAdd, isSearching } =
    useWishlistSearchState(initialQuery);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-xl font-semibold text-fg">
          Find a game
        </h2>
        <p className="text-sm text-muted">
          Wishlist is for titles that are not in deals yet (including
          unreleased). Start typing to search IGDB.
        </p>
      </div>

      <input
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Game title…"
        className="h-11 w-full rounded-md border border-stroke bg-surface px-3 text-fg outline-none focus:border-muted"
      />

      {error ? (
        <p className="rounded-md border border-stroke bg-surface px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {isSearching ? <p className="text-sm text-muted">Searching…</p> : null}

      <SearchResultsList
        initialQuery={initialQuery}
        initialResults={initialResults}
        addingId={addingId}
        onAdd={onAdd}
      />
    </section>
  );
}

function EmptyWishlist() {
  return (
    <div className="rounded-lg border border-dashed border-stroke bg-surface px-4 py-10 text-center">
      <p className="font-display text-lg font-semibold text-fg">
        Wishlist is empty
      </p>
      <p className="mt-2 text-sm text-muted">
        Search above for a game that is not under €10 yet.
      </p>
    </div>
  );
}

function WishlistGridItem({
  item,
  match,
  isRemoving,
  onRemove,
}: {
  item: WishlistItem;
  match: WishlistDealMatch | null;
  isRemoving: boolean;
  onRemove: (igdbId: number) => void;
}) {
  return (
    <li className="flex flex-col overflow-hidden rounded-lg border border-stroke bg-surface">
      <div className="relative aspect-[3/4] bg-surface-2">
        {item.coverUrl ? (
          <DealImage
            src={item.coverUrl}
            alt=""
            fill
            fit="cover"
            sizes="(max-width: 768px) 50vw, 20vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted">
            No art
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="line-clamp-2 text-sm font-semibold text-fg">
          {item.title}
        </p>
        <p className="text-xs text-muted">{releaseLabel(item.releaseDate)}</p>
        {match ? (
          <Link
            href={`/deals/${encodeURIComponent(match.groupKey)}`}
            className="text-xs font-semibold text-price"
          >
            Now €{match.minPriceEur.toFixed(2)} →
          </Link>
        ) : (
          <span className="text-xs text-muted">Watching</span>
        )}
        <button
          type="button"
          disabled={isRemoving}
          onClick={() => onRemove(item.igdbId)}
          className="mt-auto text-left text-xs text-muted transition-colors hover:text-fg disabled:opacity-50"
        >
          {isRemoving ? "Removing…" : "Remove"}
        </button>
      </div>
    </li>
  );
}

export function WishlistGrid({
  items,
  matches,
}: {
  items: WishlistItem[];
  matches: Record<number, WishlistDealMatch | null>;
}) {
  const router = useRouter();
  const [removingId, setRemovingId] = useState<number | null>(null);

  async function onRemove(igdbId: number) {
    setRemovingId(igdbId);
    await removeFromWishlistAction(igdbId);
    setRemovingId(null);
    router.refresh();
  }

  if (items.length === 0) {
    return <EmptyWishlist />;
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <WishlistGridItem
          key={item.id}
          item={item}
          match={matches[item.igdbId] ?? null}
          isRemoving={removingId === item.igdbId}
          onRemove={onRemove}
        />
      ))}
    </ul>
  );
}
