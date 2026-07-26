import { describe, expect, it } from "vitest";

import { youtubeEmbedUrl, youtubeVideoIdFromUrl } from "./youtube";

describe("youtubeVideoIdFromUrl", () => {
  it("parses watch urls", () => {
    expect(
      youtubeVideoIdFromUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("parses youtu.be urls", () => {
    expect(youtubeVideoIdFromUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("returns null for non-youtube", () => {
    expect(youtubeVideoIdFromUrl("https://example.com/v=abc")).toBeNull();
  });
});

describe("youtubeEmbedUrl", () => {
  it("builds embed with autoplay after user gesture", () => {
    expect(youtubeEmbedUrl("dQw4w9WgXcQ")).toContain(
      "youtube.com/embed/dQw4w9WgXcQ",
    );
    expect(youtubeEmbedUrl("dQw4w9WgXcQ")).toContain("autoplay=1");
  });
});
