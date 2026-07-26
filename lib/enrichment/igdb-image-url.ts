/** IGDB CDN size tokens — https://api-docs.igdb.com/#images */

const IGDB_SIZE_RE = /\/t_[a-z0-9_]+\//i;

export type IgdbImageSize =
  | "t_thumb"
  | "t_cover_big"
  | "t_screenshot_med"
  | "t_screenshot_huge"
  | "t_1080p";

/** Normalize protocol-relative IGDB paths and set the size token. */
export function igdbImageUrl(
  path: string | undefined,
  size: IgdbImageSize,
): string | null {
  if (!path) {
    return null;
  }
  const withProtocol = path.startsWith("//") ? `https:${path}` : path;
  if (IGDB_SIZE_RE.test(withProtocol)) {
    return withProtocol.replace(IGDB_SIZE_RE, `/${size}/`);
  }
  return withProtocol;
}

/**
 * Upgrade an already-stored IGDB URL to a larger size at render time
 * (older rows may still use t_thumb / t_cover_big for screenshots).
 */
export function withIgdbImageSize(
  url: string,
  size: IgdbImageSize,
): string {
  if (!url.includes("images.igdb.com") && !url.includes("igdb.com/igdb/image")) {
    return url;
  }
  return igdbImageUrl(url, size) ?? url;
}
