import { describe, expect, it } from "vitest";

import { igdbImageUrl, withIgdbImageSize } from "./igdb-image-url";

describe("igdbImageUrl", () => {
  it("upgrades protocol-relative thumbs to cover size", () => {
    expect(
      igdbImageUrl("//images.igdb.com/igdb/image/upload/t_thumb/co1.jpg", "t_cover_big"),
    ).toBe("https://images.igdb.com/igdb/image/upload/t_cover_big/co1.jpg");
  });

  it("upgrades screenshot thumbs to 1080p", () => {
    expect(
      igdbImageUrl(
        "https://images.igdb.com/igdb/image/upload/t_thumb/sc1.jpg",
        "t_1080p",
      ),
    ).toBe("https://images.igdb.com/igdb/image/upload/t_1080p/sc1.jpg");
  });

  it("returns null for empty path", () => {
    expect(igdbImageUrl(undefined, "t_cover_big")).toBeNull();
  });
});

describe("withIgdbImageSize", () => {
  it("rewrites stored cover_big screenshot urls to 1080p", () => {
    expect(
      withIgdbImageSize(
        "https://images.igdb.com/igdb/image/upload/t_cover_big/sc1.jpg",
        "t_1080p",
      ),
    ).toBe("https://images.igdb.com/igdb/image/upload/t_1080p/sc1.jpg");
  });

  it("leaves non-IGDB urls unchanged", () => {
    expect(
      withIgdbImageSize("https://cdn.example.com/shot.jpg", "t_1080p"),
    ).toBe("https://cdn.example.com/shot.jpg");
  });
});
