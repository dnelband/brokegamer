"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { clsx } from "clsx";

import { withIgdbImageSize } from "@/lib/enrichment/igdb-image-url";

import { DealImage } from "../deal-image";

const AUTO_ADVANCE_MS = 4500;

function uniqueUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of urls) {
    const trimmed = url.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    function sync() {
      setReduced(mq.matches);
    }
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return reduced;
}

function useInView(ref: RefObject<HTMLElement | null>): boolean {
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry?.isIntersecting ?? true);
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  return inView;
}

function Chevron({ direction }: { direction: "prev" | "next" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden
    >
      {direction === "prev" ? (
        <path d="M10 3L5 8l5 5" />
      ) : (
        <path d="M6 3l5 5-5 5" />
      )}
    </svg>
  );
}

function GalleryNavButton({
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
      className={clsx(
        "absolute top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-md border border-stroke bg-bg/80 text-fg backdrop-blur-[2px] transition-colors duration-150 hover:bg-surface-2",
        direction === "prev" ? "left-2" : "right-2",
      )}
      aria-label={direction === "prev" ? "Previous image" : "Next image"}
    >
      <Chevron direction={direction} />
    </button>
  );
}

function GalleryThumbStrip({
  slides,
  index,
  onSelect,
}: {
  slides: string[];
  index: number;
  onSelect: (slideIndex: number) => void;
}) {
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    thumbRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [index]);

  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]"
      role="tablist"
      aria-label="Screenshot thumbnails"
    >
      {slides.map((url, slideIndex) => (
        <button
          key={url}
          type="button"
          role="tab"
          ref={(node) => {
            thumbRefs.current[slideIndex] = node;
          }}
          aria-selected={slideIndex === index}
          aria-label={`Show screenshot ${slideIndex + 1} of ${slides.length}`}
          onClick={() => onSelect(slideIndex)}
          className={clsx(
            "relative h-14 w-24 shrink-0 overflow-hidden rounded-md border transition-[border-color,opacity] duration-150",
            slideIndex === index
              ? "border-accent opacity-100"
              : "border-stroke opacity-65 hover:opacity-90",
          )}
        >
          <DealImage
            src={withIgdbImageSize(url, "t_screenshot_med")}
            alt=""
            fill
            fit="cover"
            sizes="96px"
          />
        </button>
      ))}
    </div>
  );
}

function GalleryStage({
  src,
  priority,
  showProgress,
  slideKey,
  canNavigate,
  onPrev,
  onNext,
  labelId,
  title,
}: {
  src: string;
  priority: boolean;
  showProgress: boolean;
  slideKey: number;
  canNavigate: boolean;
  onPrev: () => void;
  onNext: () => void;
  labelId: string;
  title: string;
}) {
  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-labelledby={labelId}
      className="relative aspect-video w-full overflow-hidden rounded-lg bg-surface-2"
    >
      <p id={labelId} className="sr-only">
        {title} media gallery
      </p>
      <div className="absolute inset-0">
        <DealImage
          key={src}
          src={withIgdbImageSize(src, "t_1080p")}
          alt=""
          fill
          priority={priority}
          fit="cover"
          sizes="(max-width: 1024px) 100vw, 72rem"
          className="object-center"
        />
      </div>
      {canNavigate ? (
        <>
          <GalleryNavButton direction="prev" onClick={onPrev} />
          <GalleryNavButton direction="next" onClick={onNext} />
        </>
      ) : null}
      {showProgress ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-stroke/60"
          aria-hidden
        >
          <div
            key={slideKey}
            className="h-full bg-accent"
            style={{
              width: "100%",
              transformOrigin: "left",
              animation: `deal-gallery-progress ${AUTO_ADVANCE_MS}ms linear forwards`,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function useGalleryPlayback(options: {
  slideCount: number;
  reducedMotion: boolean;
  paused: boolean;
  inView: boolean;
  rootRef: RefObject<HTMLDivElement | null>;
}): [number, (next: number | ((current: number) => number)) => void] {
  const { slideCount, reducedMotion, paused, inView, rootRef } = options;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slideCount < 2 || reducedMotion || paused || !inView) {
      return;
    }
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % slideCount);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [slideCount, reducedMotion, paused, inView]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || slideCount < 2) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (!rootRef.current?.contains(document.activeElement)) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((current) => (current - 1 + slideCount) % slideCount);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setIndex((current) => (current + 1) % slideCount);
      }
    }
    node.addEventListener("keydown", onKeyDown);
    return () => node.removeEventListener("keydown", onKeyDown);
  }, [slideCount, rootRef]);

  return [index, setIndex];
}

interface DealMediaGalleryProps {
  screenshotUrls: string[];
  title: string;
}

export function DealMediaGallery({
  screenshotUrls,
  title,
}: DealMediaGalleryProps) {
  const labelId = useId();
  const reducedMotion = usePrefersReducedMotion();
  const [paused, setPaused] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef);

  const slides = uniqueUrls(screenshotUrls);
  const [index, setIndex] = useGalleryPlayback({
    slideCount: slides.length,
    reducedMotion,
    paused,
    inView,
    rootRef,
  });

  if (slides.length === 0) {
    return null;
  }

  const canNavigate = slides.length > 1;
  const current = slides[index] ?? slides[0];
  const showProgress = canNavigate && !reducedMotion && !paused && inView;

  return (
    <div
      ref={rootRef}
      className="flex w-full flex-col gap-3"
      tabIndex={canNavigate ? 0 : undefined}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <GalleryStage
        src={current}
        priority={index === 0}
        showProgress={showProgress}
        slideKey={index}
        canNavigate={canNavigate}
        onPrev={() =>
          setIndex(
            (currentIndex) =>
              (currentIndex - 1 + slides.length) % slides.length,
          )
        }
        onNext={() =>
          setIndex((currentIndex) => (currentIndex + 1) % slides.length)
        }
        labelId={labelId}
        title={title}
      />
      {canNavigate ? (
        <GalleryThumbStrip
          slides={slides}
          index={index}
          onSelect={setIndex}
        />
      ) : null}
    </div>
  );
}
