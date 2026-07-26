import { describe, expect, it } from "vitest";

import {
  canonicalizeWishlistMatchTitle,
  stripStorefrontTitleNoise,
  wishlistTitlesMatch,
} from "./deal-utils";

describe("stripStorefrontTitleNoise", () => {
  it("strips dual PS4 & PS5 platform tags", () => {
    expect(stripStorefrontTitleNoise("Borderlands 3  PS4™ &  PS5™")).toBe(
      "Borderlands 3",
    );
    expect(
      stripStorefrontTitleNoise("Insurgency: Sandstorm [PS4 & PS5]"),
    ).toBe("Insurgency: Sandstorm");
    expect(
      stripStorefrontTitleNoise("Back 4 Blood: Standard Edition PS4 & PS5"),
    ).toBe("Back 4 Blood: Standard Edition");
  });

  it("strips for/für PS suffixes and trademarks", () => {
    expect(stripStorefrontTitleNoise("NBA 2K26 für PS5®")).toBe("NBA 2K26");
    expect(stripStorefrontTitleNoise("Some Game for PS4")).toBe("Some Game");
  });

  it("strips a trailing parenthetical", () => {
    expect(
      stripStorefrontTitleNoise("Watch Dogs Legion - Deluxe Edition (Ubisoft)"),
    ).toBe("Watch Dogs Legion - Deluxe Edition");
  });
});

describe("canonicalizeWishlistMatchTitle", () => {
  it("strips deluxe edition suffix", () => {
    expect(
      canonicalizeWishlistMatchTitle(
        "SYNDUALITY: Echo of Ada Deluxe Edition",
      ),
    ).toBe("synduality echo of ada");
  });

  it("strips ultimate edition suffix", () => {
    expect(
      canonicalizeWishlistMatchTitle(
        "SYNDUALITY: Echo of Ada Ultimate Edition",
      ),
    ).toBe("synduality echo of ada");
  });

  it("strips digital deluxe before deluxe", () => {
    expect(
      canonicalizeWishlistMatchTitle("CODE VEIN Digital Deluxe Edition"),
    ).toBe("code vein");
  });

  it("strips standard edition and PS platform tags together", () => {
    expect(
      canonicalizeWishlistMatchTitle(
        "Back 4 Blood: Standard Edition PS4 & PS5",
      ),
    ).toBe("back 4 blood");
  });

  it("leaves base title unchanged", () => {
    expect(canonicalizeWishlistMatchTitle("SYNDUALITY: Echo of Ada")).toBe(
      "synduality echo of ada",
    );
  });

  it("does not strip unrelated trailing words", () => {
    expect(
      canonicalizeWishlistMatchTitle("SYNDUALITY: Echo of Ada Fan Pack"),
    ).toBe("synduality echo of ada fan pack");
  });
});

describe("wishlistTitlesMatch", () => {
  it("matches base game to deluxe edition", () => {
    expect(
      wishlistTitlesMatch(
        "SYNDUALITY: Echo of Ada",
        "SYNDUALITY: Echo of Ada Deluxe Edition",
      ),
    ).toBe(true);
  });

  it("matches base game to ultimate edition", () => {
    expect(
      wishlistTitlesMatch(
        "SYNDUALITY: Echo of Ada",
        "SYNDUALITY: Echo of Ada Ultimate Edition",
      ),
    ).toBe(true);
  });

  it("matches IGDB base name to PSN dual-platform title", () => {
    expect(
      wishlistTitlesMatch("Human: Fall Flat", "Human: Fall Flat PS4 & PS5"),
    ).toBe(true);
  });

  it("does not match unrelated titles", () => {
    expect(
      wishlistTitlesMatch("Hollow Knight", "Hollow Knight Silksong"),
    ).toBe(false);
  });

  it("still matches exact titles", () => {
    expect(
      wishlistTitlesMatch(
        "SYNDUALITY: Echo of Ada Deluxe Edition",
        "SYNDUALITY: Echo of Ada Deluxe Edition",
      ),
    ).toBe(true);
  });
});
