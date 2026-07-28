"use client";

import {
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from "react";
import Link from "next/link";
import { clsx } from "clsx";

import { GameOfferCard } from "@/app/deals/game-offer-card";
import type { HomePlatformRow } from "@/lib/deals/deals-of-the-day";
import { filtersToSearchParams } from "@/lib/deals/filters";

function platformRowHref(filterPlatforms: string[]): string {
  const params = filtersToSearchParams({
    q: "",
    platforms: filterPlatforms,
    genres: [],
    minRating: null,
    store: null,
  });
  const query = params.toString();
  return query ? `/deals?${query}` : "/deals";
}

function SliderNavButton({
  direction,
  onClick,
}: {
  direction: "prev" | "next";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex size-8 shrink-0 items-center justify-center rounded-md border border-stroke text-muted transition-colors hover:border-muted hover:text-fg"
      aria-label={direction === "prev" ? "Previous deals" : "Next deals"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        className="size-4"
        aria-hidden
      >
        {direction === "prev" ? (
          <path d="M10 3L5 8l5 5" />
        ) : (
          <path d="M6 3l5 5-5 5" />
        )}
      </svg>
    </button>
  );
}

function scrollByCard(
  scroller: HTMLUListElement | null,
  direction: -1 | 1,
) {
  if (!scroller) {
    return;
  }
  const card = scroller.querySelector("li");
  const step = card?.getBoundingClientRect().width ?? 180;
  scroller.scrollBy({ left: direction * (step + 16), behavior: "smooth" });
}

function useDragScroll(scrollerRef: RefObject<HTMLUListElement | null>) {
  const dragRef = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
    moved: false,
  });
  const [dragging, setDragging] = useState(false);

  function onPointerDown(event: PointerEvent<HTMLUListElement>) {
    if (event.button !== 0) {
      return;
    }
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }
    dragRef.current = {
      active: true,
      startX: event.clientX,
      scrollLeft: scroller.scrollLeft,
      moved: false,
    };
    scroller.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function onPointerMove(event: PointerEvent<HTMLUListElement>) {
    if (!dragRef.current.active) {
      return;
    }
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }
    const delta = event.clientX - dragRef.current.startX;
    if (Math.abs(delta) > 4) {
      dragRef.current.moved = true;
    }
    scroller.scrollLeft = dragRef.current.scrollLeft - delta;
  }

  function endDrag(event: PointerEvent<HTMLUListElement>) {
    if (!dragRef.current.active) {
      return;
    }
    dragRef.current.active = false;
    setDragging(false);
    if (scrollerRef.current?.hasPointerCapture(event.pointerId)) {
      scrollerRef.current.releasePointerCapture(event.pointerId);
    }
  }

  function onClickCapture(event: MouseEvent<HTMLUListElement>) {
    if (!dragRef.current.moved) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    dragRef.current.moved = false;
  }

  return {
    dragging,
    onPointerDown,
    onPointerMove,
    endDrag,
    onClickCapture,
  };
}

function PlatformDealSlider({ row }: { row: HomePlatformRow }) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const drag = useDragScroll(scrollerRef);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <Link
            href={platformRowHref(row.filterPlatforms)}
            className="font-display text-lg font-semibold text-accent transition-colors hover:text-fg sm:text-xl"
          >
            {row.label}
          </Link>
        <div className="flex items-center gap-1.5">
            <SliderNavButton
              direction="prev"
              onClick={() => scrollByCard(scrollerRef.current, -1)}
            />
            <SliderNavButton
              direction="next"
              onClick={() => scrollByCard(scrollerRef.current, 1)}
            />
          </div>
      </div>
      <ul
        ref={scrollerRef}
        onPointerDown={drag.onPointerDown}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.endDrag}
        onPointerCancel={drag.endDrag}
        onClickCapture={drag.onClickCapture}
        className={clsx(
          "-mx-4 flex gap-3 overflow-x-auto px-4 sm:-mx-0 sm:gap-4 sm:px-0",
          "touch-pan-y select-none",
          "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          drag.dragging ? "cursor-grabbing" : "cursor-grab",
        )}
        aria-label={`${row.label} deals`}
      >
        {row.games.map((game) => (
          <li
            key={game.groupKey}
            className="w-[42%] shrink-0 sm:w-[30%] lg:w-[22%] xl:w-[18%] 2xl:w-[15%]"
          >
            <GameOfferCard game={game} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PlatformDealRows({
  rows = [],
}: {
  rows?: HomePlatformRow[];
}) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-10">
      {rows.map((row) => (
        <PlatformDealSlider key={row.id} row={row} />
      ))}
    </div>
  );
}
