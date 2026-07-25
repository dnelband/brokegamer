"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  addToWishlistAction,
  removeFromWishlistAction,
} from "@/app/wishlist/actions";
import { GenreTags, WishlistSuggestionTitleRow } from "@/app/wishlist/wishlist-suggestion-meta";
import { DealImage } from "@/app/deals/deal-image";
import type { IgdbSearchCandidate } from "@/lib/enrichment/igdb-wishlist-search";
import { igdbGamePageUrl } from "@/lib/enrichment/igdb-client";

function toggleButtonLabel(isBusy: boolean, isWishlisted: boolean): string {
  if (isBusy) {
    return isWishlisted ? "Removing..." : "Adding...";
  }
  return isWishlisted ? "Remove" : "Add";
}

function useWishlistSuggestionToggle(wishlistedIgdbIds: number[]) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [addedIds, setAddedIds] = useState<number[]>([]);
  const [removedIds, setRemovedIds] = useState<number[]>([]);
  const [, startTransition] = useTransition();

  const wishlistedIds = new Set([...wishlistedIgdbIds, ...addedIds]);
  for (const id of removedIds) {
    wishlistedIds.delete(id);
  }

  async function onAdd(candidate: IgdbSearchCandidate) {
    setError(null);
    setBusyId(candidate.igdbId);
    const result = await addToWishlistAction({
      igdbId: candidate.igdbId,
      title: candidate.title,
      coverUrl: candidate.coverUrl,
      releaseDate: candidate.releaseDate,
      steamAppId: candidate.steamAppId,
    });
    setBusyId(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setRemovedIds((current) =>
      current.filter((id) => id !== candidate.igdbId),
    );
    setAddedIds((current) =>
      current.includes(candidate.igdbId)
        ? current
        : [...current, candidate.igdbId],
    );

    startTransition(() => {
      router.refresh();
    });
  }

  async function onRemove(igdbId: number) {
    setError(null);
    setBusyId(igdbId);
    const result = await removeFromWishlistAction(igdbId);
    setBusyId(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setAddedIds((current) => current.filter((id) => id !== igdbId));
    setRemovedIds((current) =>
      current.includes(igdbId) ? current : [...current, igdbId],
    );

    startTransition(() => {
      router.refresh();
    });
  }

  return { error, busyId, wishlistedIds, onAdd, onRemove };
}

function SuggestionListItem({
  candidate,
  isWishlisted,
  isBusy,
  onAdd,
  onRemove,
}: {
  candidate: IgdbSearchCandidate;
  isWishlisted: boolean;
  isBusy: boolean;
  onAdd: (candidate: IgdbSearchCandidate) => void;
  onRemove: (igdbId: number) => void;
}) {
  return (
    <li className="flex items-center gap-3 px-3 py-3">
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
        onClick={() =>
          isWishlisted ? onRemove(candidate.igdbId) : onAdd(candidate)
        }
        disabled={isBusy}
        className="shrink-0 cursor-pointer rounded-md border border-stroke px-3 py-1.5 text-xs font-semibold text-fg transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {toggleButtonLabel(isBusy, isWishlisted)}
      </button>
    </li>
  );
}

export function EmptyDealsWishlistSuggestions({
  suggestions,
  wishlistedIgdbIds,
}: {
  suggestions: IgdbSearchCandidate[];
  wishlistedIgdbIds: number[];
}) {
  const { error, busyId, wishlistedIds, onAdd, onRemove } =
    useWishlistSuggestionToggle(wishlistedIgdbIds);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="mt-5 text-left">
      <p className="text-sm font-semibold text-fg">Add to wishlist</p>
      <p className="mt-1 text-sm text-muted">
        Similar titles from IGDB are ready below.
      </p>

      {error ? (
        <p className="mt-3 rounded-md border border-stroke bg-surface px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <ul className="mt-4 divide-y divide-stroke overflow-hidden rounded-lg border border-stroke bg-bg">
        {suggestions.map((candidate) => (
          <SuggestionListItem
            key={candidate.igdbId}
            candidate={candidate}
            isWishlisted={wishlistedIds.has(candidate.igdbId)}
            isBusy={busyId === candidate.igdbId}
            onAdd={onAdd}
            onRemove={onRemove}
          />
        ))}
      </ul>
    </div>
  );
}
