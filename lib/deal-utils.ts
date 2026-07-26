import { createHash } from "node:crypto";

export function buildDealId(source: string, sourceDealId: string): string {
  return createHash("sha256")
    .update(`${source}:${sourceDealId}`)
    .digest("hex")
    .slice(0, 32);
}

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Strip storefront-only noise before title matching (PSN platform tags,
 * trademarks, trailing publisher parens). Safe for wishlist + IGDB enrichment.
 */
export function stripStorefrontTitleNoise(title: string): string {
  return (
    title
      .replace(/[™®©]/gu, "")
      // [PS4 & PS5] / (PS4 & PS5)
      .replace(/\s*[[(]\s*ps[45]\s*(?:[&+]|and)\s*ps[45]\s*[\])]\s*$/giu, "")
      // trailing PS4 & PS5 / PS4 and PS5
      .replace(/\s+ps[45]\s*(?:[&+]|and)\s*ps[45]\s*$/giu, "")
      .replace(/\s+(?:for|für)\s+ps[45]\s*$/giu, "")
      .replace(/\s+ps[45]\s*$/giu, "")
      .replace(/\s*[&+]\s*ps[45]\s*$/giu, "")
      // e.g. (Ubisoft), (Early Access)
      .replace(/\s*\([^)]*\)\s*$/u, "")
      .replace(/\s*[-:|–—]\s*$/u, "")
      .replace(/\s+/gu, " ")
      .trim()
  );
}

/** Longest first so multi-word suffixes win over shorter overlaps. */
const MATCH_EDITION_SUFFIXES = [
  "game of the year edition",
  "digital deluxe edition",
  "standard recruit edition",
  "definitive edition",
  "ultimate edition",
  "complete edition",
  "standard edition",
  "enhanced edition",
  "console edition",
  "deluxe edition",
  "gold edition",
] as const;

/**
 * Base title for wishlist ↔ deal and IGDB enrichment matching.
 * Strips storefront noise, then at most one trailing edition suffix
 * from a small explicit allowlist.
 */
export function canonicalizeWishlistMatchTitle(title: string): string {
  let normalized = normalizeTitle(stripStorefrontTitleNoise(title));

  for (const suffix of MATCH_EDITION_SUFFIXES) {
    const trailing = ` ${suffix}`;
    if (normalized.endsWith(trailing)) {
      normalized = normalized.slice(0, -trailing.length).trimEnd();
      break;
    }
  }

  return normalized;
}

export function wishlistTitlesMatch(a: string, b: string): boolean {
  return canonicalizeWishlistMatchTitle(a) === canonicalizeWishlistMatchTitle(b);
}
