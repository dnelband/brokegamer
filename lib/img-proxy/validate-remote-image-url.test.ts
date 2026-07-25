import { describe, expect, it } from "vitest";

import {
  decodeProxiedImageParam,
  proxiedImageSrc,
} from "./proxied-image-src";
import {
  isBlockedIpAddress,
  parseRemoteImageUrl,
} from "./validate-remote-image-url";

describe("parseRemoteImageUrl", () => {
  it("accepts https image urls", () => {
    const result = parseRemoteImageUrl(
      "https://images.igdb.com/igdb/image/upload/t_cover_big/co1.jpg",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.url.hostname).toBe("images.igdb.com");
    }
  });

  it("rejects missing and invalid values", () => {
    expect(parseRemoteImageUrl(null).ok).toBe(false);
    expect(parseRemoteImageUrl("").ok).toBe(false);
    expect(parseRemoteImageUrl("not a url").ok).toBe(false);
  });

  it("rejects non-https protocols", () => {
    expect(parseRemoteImageUrl("http://cdn.example/a.jpg")).toEqual({
      ok: false,
      error: "protocol",
    });
    expect(parseRemoteImageUrl("ftp://cdn.example/a.jpg")).toEqual({
      ok: false,
      error: "protocol",
    });
  });

  it("rejects credentials in the url", () => {
    expect(
      parseRemoteImageUrl("https://user:pass@cdn.example/a.jpg"),
    ).toEqual({ ok: false, error: "credentials" });
  });

  it("rejects localhost and .local hosts", () => {
    expect(parseRemoteImageUrl("https://localhost/a.jpg")).toEqual({
      ok: false,
      error: "hostname",
    });
    expect(parseRemoteImageUrl("https://foo.local/a.jpg")).toEqual({
      ok: false,
      error: "hostname",
    });
  });

  it("rejects private literal ips", () => {
    expect(parseRemoteImageUrl("https://127.0.0.1/a.jpg")).toEqual({
      ok: false,
      error: "ip",
    });
    expect(parseRemoteImageUrl("https://10.0.0.5/a.jpg")).toEqual({
      ok: false,
      error: "ip",
    });
    expect(parseRemoteImageUrl("https://192.168.1.1/a.jpg")).toEqual({
      ok: false,
      error: "ip",
    });
  });

  it("rejects proxy loop paths", () => {
    expect(parseRemoteImageUrl("https://cdn.example/api/img?u=x")).toEqual({
      ok: false,
      error: "path",
    });
    expect(parseRemoteImageUrl("https://cdn.example/_next/image")).toEqual({
      ok: false,
      error: "path",
    });
  });
});

describe("isBlockedIpAddress", () => {
  it("blocks common private and link-local ranges", () => {
    expect(isBlockedIpAddress("127.0.0.1")).toBe(true);
    expect(isBlockedIpAddress("10.1.2.3")).toBe(true);
    expect(isBlockedIpAddress("172.16.0.1")).toBe(true);
    expect(isBlockedIpAddress("169.254.1.1")).toBe(true);
    expect(isBlockedIpAddress("::1")).toBe(true);
    expect(isBlockedIpAddress("fe80::1")).toBe(true);
  });

  it("allows public addresses", () => {
    expect(isBlockedIpAddress("8.8.8.8")).toBe(false);
    expect(isBlockedIpAddress("1.1.1.1")).toBe(false);
  });
});

describe("proxiedImageSrc", () => {
  it("builds a path-based api url without a query string", () => {
    const src = proxiedImageSrc("https://cdn.example/a b.jpg");
    expect(src.startsWith("/api/img/")).toBe(true);
    expect(src.includes("?")).toBe(false);
    const token = src.slice("/api/img/".length);
    expect(decodeProxiedImageParam(token)).toBe("https://cdn.example/a b.jpg");
  });
});
