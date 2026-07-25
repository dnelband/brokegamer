/**
 * Storefront / IGDB art via `/api/img` proxy + next/image.
 * One allowlisted origin (ours); no per-CDN remotePatterns list.
 *
 * Default fill fit is `width`: cover the box. Landscape may crop;
 * prefer `contain` on detail heroes when full art matters.
 */
import Image from "next/image";
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
  sizes = "(max-width: 768px) 50vw, 25vw",
}: DealImageProps) {
  const proxied = proxiedImageSrc(src);

  if (fill) {
    return (
      <Image
        src={proxied}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className={clsx(fitClass(fit), className)}
      />
    );
  }

  return (
    <Image
      src={proxied}
      alt={alt}
      width={160}
      height={210}
      priority={priority}
      sizes={sizes}
      className={clsx(fitClass(fit), className)}
    />
  );
}
