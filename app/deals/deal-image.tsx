/**
 * Storefront / IGDB art via `/api/img` proxy + plain `<img>`.
 * Same-origin proxy only — no Vercel Image Optimization / `next/image`.
 *
 * Default fill fit is `width`: cover the box. Landscape may crop;
 * prefer `contain` on detail heroes when full art matters.
 */
import { clsx } from "clsx";

import { proxiedImageSrc } from "@/lib/img-proxy/proxied-image-src";

interface DealImageProps {
  src: string;
  alt?: string;
  fill?: boolean;
  priority?: boolean;
  /**
   * `width` — fill the box (object-cover).
   * `contain` — full art, may letterbox.
   * `cover` — fill box, may crop any side.
   */
  fit?: "width" | "contain" | "cover";
  className?: string;
  /** Kept for call-site compatibility; unused without `next/image` srcset. */
  sizes?: string;
}

function fitClass(fit: NonNullable<DealImageProps["fit"]>): string {
  switch (fit) {
    case "contain":
      return "object-contain";
    case "cover":
    case "width":
    default:
      return "object-cover";
  }
}

export function DealImage({
  src,
  alt = "",
  fill = false,
  priority = false,
  fit = "width",
  className,
}: DealImageProps) {
  const proxied = proxiedImageSrc(src);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- intentional: avoid Vercel Image Optimization quota
    <img
      src={proxied}
      alt={alt}
      width={fill ? undefined : 160}
      height={fill ? undefined : 210}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={clsx(
        fitClass(fit),
        fill && "absolute inset-0 h-full w-full",
        className,
      )}
    />
  );
}
