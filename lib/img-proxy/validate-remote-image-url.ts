import dns from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "kubernetes.default",
  "kubernetes.default.svc",
]);

/** Reject obvious proxy loops and Next optimizer recursion. */
const BLOCKED_PATH_PREFIXES = ["/api/img", "/_next/image"];

export type RemoteImageUrlError =
  | "missing"
  | "invalid"
  | "protocol"
  | "credentials"
  | "hostname"
  | "path"
  | "ip"
  | "dns";

export type RemoteImageUrlResult =
  | { ok: true; url: URL }
  | { ok: false; error: RemoteImageUrlError };

type Ipv4Rule =
  | { kind: "a"; a: number }
  | { kind: "ab"; a: number; b: number }
  | { kind: "a-b-range"; a: number; bMin: number; bMax: number };

const BLOCKED_IPV4_RULES: Ipv4Rule[] = [
  { kind: "a", a: 0 },
  { kind: "a", a: 10 },
  { kind: "a", a: 127 },
  { kind: "ab", a: 169, b: 254 },
  { kind: "ab", a: 192, b: 168 },
  { kind: "a-b-range", a: 172, bMin: 16, bMax: 31 },
  { kind: "a-b-range", a: 100, bMin: 64, bMax: 127 },
  { kind: "a-b-range", a: 198, bMin: 18, bMax: 19 },
];

function matchesIpv4Rule(a: number, b: number, rule: Ipv4Rule): boolean {
  switch (rule.kind) {
    case "a":
      return a === rule.a;
    case "ab":
      return a === rule.a && b === rule.b;
    case "a-b-range":
      return a === rule.a && b >= rule.bMin && b <= rule.bMax;
  }
}

function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return true;
  }
  const [a, b] = parts;
  if (a === undefined || b === undefined) {
    return true;
  }
  return BLOCKED_IPV4_RULES.some((rule) => matchesIpv4Rule(a, b, rule));
}

function isBlockedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::" || normalized === "::1") {
    return true;
  }
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }
  if (normalized.startsWith("fe80")) {
    return true;
  }
  // IPv4-mapped IPv6 (:ffff:a.b.c.d)
  const mapped = normalized.match(/^:ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped?.[1]) {
    return isBlockedIpv4(mapped[1]);
  }
  return false;
}

export function isBlockedIpAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    return isBlockedIpv4(ip);
  }
  if (net.isIPv6(ip)) {
    return isBlockedIpv6(ip);
  }
  return true;
}

/**
 * Parse + cheap static checks (no DNS). Safe to use in unit tests without network.
 */
export function parseRemoteImageUrl(raw: string | null): RemoteImageUrlResult {
  if (raw === null || raw.trim() === "") {
    return { ok: false, error: "missing" };
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: "invalid" };
  }

  if (url.protocol !== "https:") {
    return { ok: false, error: "protocol" };
  }

  if (url.username || url.password) {
    return { ok: false, error: "credentials" };
  }

  const hostname = url.hostname.toLowerCase();
  if (
    !hostname ||
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    return { ok: false, error: "hostname" };
  }

  // Literal IP host
  if (net.isIP(hostname) && isBlockedIpAddress(hostname)) {
    return { ok: false, error: "ip" };
  }

  const path = url.pathname.toLowerCase();
  if (BLOCKED_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return { ok: false, error: "path" };
  }

  return { ok: true, url };
}

/**
 * Full validation including DNS resolution of all A/AAAA records.
 */
export async function validateRemoteImageUrl(
  raw: string | null,
): Promise<RemoteImageUrlResult> {
  const parsed = parseRemoteImageUrl(raw);
  if (!parsed.ok) {
    return parsed;
  }

  const { hostname } = parsed.url;
  if (net.isIP(hostname)) {
    return parsed;
  }

  let addresses: Array<{ address: string }>;
  try {
    addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    return { ok: false, error: "dns" };
  }

  if (addresses.length === 0) {
    return { ok: false, error: "dns" };
  }

  if (addresses.some((entry) => isBlockedIpAddress(entry.address))) {
    return { ok: false, error: "ip" };
  }

  return parsed;
}
