import {
  cheapsharkDealsResponseSchema,
  cheapsharkStoresResponseSchema,
} from "./schema";
import { normalizeCheapsharkDeal } from "./normalize";
import type { NormalizedDeal } from "@/types/deal";

const CHEAPSHARK_API = "https://www.cheapshark.com/api/1.0";
const MAX_PAGES = 10;
const PAGE_SIZE = 60;

/** CheapShark/Cloudflare reject missing or generic Node fetch User-Agents. */
const CHEAPSHARK_USER_AGENT =
  "BrokeGamer/1.2 (+https://github.com/dnelband/brokegamer; deal aggregator)";

const cheapsharkFetchInit: RequestInit = {
  headers: {
    Accept: "application/json",
    "User-Agent": CHEAPSHARK_USER_AGENT,
  },
};

async function fetchStoreNames(): Promise<Map<string, string>> {
  const response = await fetch(`${CHEAPSHARK_API}/stores`, cheapsharkFetchInit);

  if (!response.ok) {
    throw new Error(`CheapShark stores fetch failed: ${response.status}`);
  }

  const json: unknown = await response.json();
  const stores = cheapsharkStoresResponseSchema.parse(json);

  return new Map(stores.map((store) => [store.storeID, store.storeName]));
}

export async function fetchDeals(): Promise<NormalizedDeal[]> {
  const storeNames = await fetchStoreNames();
  const deals: NormalizedDeal[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url = new URL(`${CHEAPSHARK_API}/deals`);
    url.searchParams.set("upperPrice", "15");
    url.searchParams.set("pageNumber", String(page));
    url.searchParams.set("pageSize", String(PAGE_SIZE));

    const response = await fetch(url, cheapsharkFetchInit);

    if (!response.ok) {
      throw new Error(`CheapShark deals fetch failed: ${response.status}`);
    }

    const json: unknown = await response.json();
    const pageDeals = cheapsharkDealsResponseSchema.parse(json);

    if (pageDeals.length === 0) {
      break;
    }

    for (const deal of pageDeals) {
      const normalized = normalizeCheapsharkDeal(deal, storeNames);
      if (normalized) {
        deals.push(normalized);
      }
    }

    if (pageDeals.length < PAGE_SIZE) {
      break;
    }
  }

  return deals;
}
