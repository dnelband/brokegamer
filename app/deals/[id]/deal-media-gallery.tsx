"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { clsx } from "clsx";

import { withIgdbImageSize } from "@/lib/enrichment/igdb-image-url";
import {
  youtubeEmbedUrl,
  youtubeVideoIdFromUrl,
} from "@/lib/youtube";

import { DealImage } from "../deal-image";

const AUTO_ADVANCE_MS = 4500;

type GallerySlide =
  | { kind: "trailer"; youtubeId: string; posterUrl: string | null }
  | { kind: "screenshot"; url: string };

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

function buildSlides(options: {
  videoUrls: string[];
  screenshotUrls: string[];
  coverUrl: string | null;
}): GallerySlide[] {
  const shots = uniqueUrls(options.screenshotUrls);
  const poster =
    shots[0] != null
      ? withIgdbImageSize(shots[0], "t_1080p")
      : options.coverUrl;
  const slides: GallerySlide[] = [];

  for (const url of uniqueUrls(options.videoUrls)) {
    const youtubeId = youtubeVideoIdFromUrl(url);
    if (!youtubeId) {
      continue;
    }
    slides.push({ kind: "trailer", youtubeId, posterUrl: poster });
    break; // v1: one trailer chip
  }

  for (const url of shots) {
    slides.push({ kind: "screenshot", url });
  }
  return slides;
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

function useInView(
  ref: RefObject<HTMLElement | null>,
  onLeaveView?: () => void,
): boolean {
  const [inView, setInView] = useState(true);
  const onLeaveRef = useRef(onLeaveView);

  useEffect(() => {
    onLeaveRef.current = onLeaveView;
  }, [onLeaveView]);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry?.isIntersecting ?? true;
        setInView(visible);
        if (!visible) {
          onLeaveRef.current?.();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);
  return inView;
}

function useTrailerPlayback(rootRef: RefObject<HTMLDivElement | null>): {
  playingTrailer: boolean;
  inView: boolean;
  playTrailer: () => void;
  stopTrailer: () => void;
} {
  const [playingTrailer, setPlayingTrailer] = useState(false);

  function stopTrailer() {
    setPlayingTrailer(false);
  }

  const inView = useInView(rootRef, stopTrailer);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        setPlayingTrailer(false);
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return {
    playingTrailer,
    inView,
    playTrailer: () => setPlayingTrailer(true),
    stopTrailer,
  };
}

function useGalleryPlayback(options: {
  slides: GallerySlide[];
  reducedMotion: boolean;
  paused: boolean;
  inView: boolean;
  rootRef: RefObject<HTMLDivElement | null>;
}): [number, (next: number | ((current: number) => number)) => void] {
  const { slides, reducedMotion, paused, inView, rootRef } = options;
  const [index, setIndex] = useState(0);
  const slideCount = slides.length;
  const current = slides[index];
  const canAutoAdvance =
    slideCount > 1 &&
    current?.kind === "screenshot" &&
    !reducedMotion &&
    !paused &&
    inView;

  useEffect(() => {
    if (!canAutoAdvance) {
      return;
    }
    const id = window.setInterval(() => {
      setIndex((currentIndex) => {
        for (let step = 1; step <= slideCount; step += 1) {
          const next = (currentIndex + step) % slideCount;
          if (slides[next]?.kind === "screenshot") {
            return next;
          }
        }
        return currentIndex;
      });
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [canAutoAdvance, slideCount, slides]);

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
        setIndex((currentIndex) => (currentIndex - 1 + slideCount) % slideCount);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setIndex((currentIndex) => (currentIndex + 1) % slideCount);
      }
    }
    node.addEventListener("keydown", onKeyDown);
    return () => node.removeEventListener("keydown", onKeyDown);
  }, [slideCount, rootRef]);

  return [index, setIndex];
}

function PlayIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="size-10"
      aria-hidden
    >
      <path d="M8 5.14v13.72L19 12 8 5.14z" />
    </svg>
  );
}

function TrailerStage({
  youtubeId,
  posterUrl,
  playing,
  onPlay,
}: {
  youtubeId: string;
  posterUrl: string | null;
  playing: boolean;
  onPlay: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // YouTube keeps decoding audio after soft nav unless src is blanked before
  // the iframe leaves the document (React remove alone is not always enough).
  useEffect(() => {
    if (!playing) {
      return;
    }
    const frame = iframeRef.current;
    if (!frame) {
      return;
    }
    const embed = youtubeEmbedUrl(youtubeId);
    frame.src = embed;
    return () => {
      frame.src = "about:blank";
    };
  }, [playing, youtubeId]);

  if (playing) {
    return (
      <iframe
        ref={iframeRef}
        title="Game trailer"
        // src set in effect so Strict Mode remount restores embed after blanking
        className="absolute inset-0 h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return (
    <>
      {posterUrl ? (
        <DealImage
          src={posterUrl}
          alt=""
          fill
          fit="cover"
          sizes="(max-width: 1024px) 100vw, 72rem"
        />
      ) : (
        <div className="absolute inset-0 bg-surface-2" />
      )}
      <button
        type="button"
        onClick={onPlay}
        className="absolute inset-0 z-10 flex items-center justify-center bg-bg/35 text-fg transition-colors duration-150 hover:bg-bg/45"
        aria-label="Play trailer"
      >
        <span className="flex size-16 items-center justify-center rounded-full border border-stroke bg-bg/85 text-accent">
          <PlayIcon />
        </span>
      </button>
    </>
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
        "absolute top-1/2 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-md border border-stroke bg-bg/80 text-fg backdrop-blur-[2px] transition-colors duration-150 hover:bg-surface-2",
        direction === "prev" ? "left-2" : "right-2",
      )}
      aria-label={direction === "prev" ? "Previous" : "Next"}
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

function GalleryThumbStrip({
  slides,
  index,
  onSelect,
}: {
  slides: GallerySlide[];
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
      aria-label="Media thumbnails"
    >
      {slides.map((slide, slideIndex) => {
        const thumbSrc =
          slide.kind === "trailer"
            ? slide.posterUrl
            : withIgdbImageSize(slide.url, "t_screenshot_med");
        return (
          <button
            key={
              slide.kind === "trailer"
                ? `trailer-${slide.youtubeId}`
                : slide.url
            }
            type="button"
            role="tab"
            ref={(node) => {
              thumbRefs.current[slideIndex] = node;
            }}
            aria-selected={slideIndex === index}
            aria-label={
              slide.kind === "trailer"
                ? "Show trailer"
                : `Show screenshot ${slideIndex + 1}`
            }
            onClick={() => onSelect(slideIndex)}
            className={clsx(
              "relative h-14 w-24 shrink-0 overflow-hidden rounded-md border transition-[border-color,opacity] duration-150",
              slideIndex === index
                ? "border-accent opacity-100"
                : "border-stroke opacity-65 hover:opacity-90",
            )}
          >
            {thumbSrc ? (
              <DealImage
                src={thumbSrc}
                alt=""
                fill
                fit="cover"
                sizes="96px"
              />
            ) : (
              <span className="flex h-full items-center justify-center bg-surface-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
                Trailer
              </span>
            )}
            {slide.kind === "trailer" ? (
              <span className="absolute inset-x-0 bottom-0 bg-bg/80 py-0.5 text-center text-[9px] font-semibold uppercase tracking-wide text-accent">
                Trailer
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function GalleryStageFrame({
  labelId,
  title,
  current,
  playingTrailer,
  onPlayTrailer,
  canNavigate,
  showProgress,
  slideKey,
  onPrev,
  onNext,
}: {
  labelId: string;
  title: string;
  current: GallerySlide;
  playingTrailer: boolean;
  onPlayTrailer: () => void;
  canNavigate: boolean;
  showProgress: boolean;
  slideKey: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const hideChrome = current.kind === "trailer" && playingTrailer;

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
        {current.kind === "trailer" ? (
          <TrailerStage
            youtubeId={current.youtubeId}
            posterUrl={current.posterUrl}
            playing={playingTrailer}
            onPlay={onPlayTrailer}
          />
        ) : (
          <DealImage
            key={current.url}
            src={withIgdbImageSize(current.url, "t_1080p")}
            alt=""
            fill
            priority={slideKey === 0}
            fit="cover"
            sizes="(max-width: 1024px) 100vw, 72rem"
          />
        )}
      </div>
      {canNavigate && !hideChrome ? (
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

interface DealMediaGalleryProps {
  screenshotUrls: string[];
  videoUrls: string[];
  coverUrl: string | null;
  title: string;
}

export function DealMediaGallery({
  screenshotUrls,
  videoUrls,
  coverUrl,
  title,
}: DealMediaGalleryProps) {
  const labelId = useId();
  const reducedMotion = usePrefersReducedMotion();
  const [paused, setPaused] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { playingTrailer, inView, playTrailer, stopTrailer } =
    useTrailerPlayback(rootRef);
  const slides = buildSlides({ videoUrls, screenshotUrls, coverUrl });
  const [index, setIndex] = useGalleryPlayback({
    slides,
    reducedMotion,
    paused: paused || playingTrailer,
    inView,
    rootRef,
  });

  if (slides.length === 0) {
    return null;
  }

  const current = slides[index] ?? slides[0];
  const canNavigate = slides.length > 1;
  const showProgress =
    canNavigate &&
    current.kind === "screenshot" &&
    !reducedMotion &&
    !paused &&
    !playingTrailer &&
    inView;

  function goTo(next: number | ((currentIndex: number) => number)) {
    stopTrailer();
    setIndex(next);
  }

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
      <GalleryStageFrame
        labelId={labelId}
        title={title}
        current={current}
        playingTrailer={playingTrailer}
        onPlayTrailer={playTrailer}
        canNavigate={canNavigate}
        showProgress={showProgress}
        slideKey={index}
        onPrev={() => goTo((i) => (i - 1 + slides.length) % slides.length)}
        onNext={() => goTo((i) => (i + 1) % slides.length)}
      />
      {canNavigate ? (
        <GalleryThumbStrip slides={slides} index={index} onSelect={goTo} />
      ) : null}
    </div>
  );
}
