import { describe, expect, it } from "vitest";

import {
  compareDealsOfTheDay,
  eurosSaved,
  pickHomeDeals,
  rankDealsOfTheDay,
} from "./deals-of-the-day";
import type { GameOffer } from "@/types/deal";

function offer(
  overrides: Partial<GameOffer> & Pick<GameOffer, "groupKey" | "title">,
): GameOffer {
  const minPriceEur = overrides.minPriceEur ?? 5;
  const maxOriginalPriceEur = overrides.maxOriginalPriceEur ?? 10;
  const platforms = overrides.platforms ?? ["PC"];
  return {
    imageUrl: null,
    genres: [],
    platforms,
    rating: null,
    ratingSource: null,
    sourceReleaseDate: null,
    distributionFormat: "digital",
    minPriceEur,
    maxOriginalPriceEur,
    offers: [
      {
        id: "1",
        source: "cheapshark",
        title: overrides.title,
        storeName: "Steam",
        steamAppId: null,
        externalStoreUid: null,
        priceEur: minPriceEur,
        originalPriceEur: maxOriginalPriceEur,
        url: "",
        imageUrl: null,
        sourceReleaseDate: null,
        distributionFormat: "digital",
        genres: [],
        platforms,
        rating: overrides.rating ?? null,
        ratingSource: overrides.ratingSource ?? null,
      },
    ],
    offerCount: 1,
    ...overrides,
  };
}

describe("eurosSaved", () => {
  it("uses lead offer original minus sale and floors at zero", () => {
    expect(
      eurosSaved(
        offer({
          groupKey: "a",
          title: "A",
          minPriceEur: 4,
          maxOriginalPriceEur: 20,
        }),
      ),
    ).toBe(16);
    expect(
      eurosSaved(
        offer({
          groupKey: "b",
          title: "B",
          minPriceEur: 10,
          maxOriginalPriceEur: 8,
        }),
      ),
    ).toBe(0);
  });
});

describe("compareDealsOfTheDay", () => {
  it("ranks any scored deal above unscored, even with smaller savings", () => {
    const scored = offer({
      groupKey: "scored",
      title: "Scored",
      minPriceEur: 5,
      maxOriginalPriceEur: 15,
      rating: 93,
      ratingSource: "metacritic",
    });
    const unscored = offer({
      groupKey: "unscored",
      title: "Unscored",
      minPriceEur: 2,
      maxOriginalPriceEur: 80,
      rating: null,
    });
    expect(compareDealsOfTheDay(scored, unscored)).toBeLessThan(0);
    expect(rankDealsOfTheDay([unscored, scored])[0]?.groupKey).toBe("scored");
  });

  it("among scored deals prefers larger euro savings then rating then date", () => {
    const bigSave = offer({
      groupKey: "big",
      title: "Big",
      minPriceEur: 5,
      maxOriginalPriceEur: 60,
      rating: 50,
      ratingSource: "igdb",
    });
    const smallSave = offer({
      groupKey: "small",
      title: "Small",
      minPriceEur: 1,
      maxOriginalPriceEur: 10,
      rating: 95,
      ratingSource: "metacritic",
    });
    expect(compareDealsOfTheDay(bigSave, smallSave)).toBeLessThan(0);

    const higherRated = offer({
      groupKey: "hi",
      title: "Hi",
      minPriceEur: 5,
      maxOriginalPriceEur: 20,
      rating: 90,
      ratingSource: "igdb",
      sourceReleaseDate: "2020-01-01",
    });
    const lowerRated = offer({
      groupKey: "lo",
      title: "Lo",
      minPriceEur: 5,
      maxOriginalPriceEur: 20,
      rating: 70,
      ratingSource: "igdb",
      sourceReleaseDate: "2024-01-01",
    });
    expect(compareDealsOfTheDay(higherRated, lowerRated)).toBeLessThan(0);
  });
});

describe("pickHomeDeals", () => {
  it("splits DOTD then platform rows without overlap", () => {
    const games = [
      offer({
        groupKey: "pc-hero",
        title: "PC Hero",
        platforms: ["PC"],
        minPriceEur: 2,
        maxOriginalPriceEur: 50,
        rating: 95,
        ratingSource: "metacritic",
      }),
      offer({
        groupKey: "pc-2",
        title: "PC Two",
        platforms: ["PC"],
        minPriceEur: 3,
        maxOriginalPriceEur: 40,
        rating: 90,
        ratingSource: "igdb",
      }),
      offer({
        groupKey: "pc-3",
        title: "PC Three",
        platforms: ["PC"],
        minPriceEur: 4,
        maxOriginalPriceEur: 30,
        rating: 85,
        ratingSource: "igdb",
      }),
      offer({
        groupKey: "ps-1",
        title: "PS One",
        platforms: ["PS5"],
        minPriceEur: 5,
        maxOriginalPriceEur: 45,
        rating: 88,
        ratingSource: "igdb",
      }),
      offer({
        groupKey: "xbox-1",
        title: "Xbox One",
        platforms: ["Xbox Series X|S"],
        minPriceEur: 6,
        maxOriginalPriceEur: 35,
        rating: 80,
        ratingSource: "store",
      }),
      offer({
        groupKey: "pc-row",
        title: "PC Row",
        platforms: ["PC"],
        minPriceEur: 7,
        maxOriginalPriceEur: 25,
        rating: 75,
        ratingSource: "igdb",
      }),
    ];

    const picks = pickHomeDeals(games);
    // Ranked: pc-hero (save 48, 95) → ps-1 (save 40, 88) → pc-2 (save 37, 90)
    expect(picks.dealsOfTheDay.map((g) => g.groupKey)).toEqual([
      "pc-hero",
      "ps-1",
      "pc-2",
    ]);

    const pcRow = picks.platformRows.find((row) => row.id === "pc");
    const psRow = picks.platformRows.find((row) => row.id === "playstation");
    const xboxRow = picks.platformRows.find((row) => row.id === "xbox");

    expect(pcRow?.games.map((g) => g.groupKey)).toEqual(["pc-3", "pc-row"]);
    expect(psRow).toBeUndefined();
    expect(xboxRow?.games.map((g) => g.groupKey)).toEqual(["xbox-1"]);

    const allKeys = [
      ...picks.dealsOfTheDay.map((g) => g.groupKey),
      ...picks.platformRows.flatMap((row) => row.games.map((g) => g.groupKey)),
    ];
    expect(new Set(allKeys).size).toBe(allKeys.length);
  });
});
