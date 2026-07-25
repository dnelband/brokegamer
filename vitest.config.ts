import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      // Only files exercised by the unit suite — not fetchers / IGDB / DB I/O.
      include: [
        "lib/currency.ts",
        "lib/deal-utils.ts",
        "lib/format-platform.ts",
        "lib/format-rating.ts",
        "lib/pricing.ts",
        "lib/search-query.ts",
        "lib/app-version.ts",
        "lib/changelog.ts",
        "lib/cron/auth.ts",
        "lib/db/database-url.ts",
        "lib/db/source-health.ts",
        "lib/db/wishlists.ts",
        "lib/deals/**/*.ts",
        "lib/img-proxy/**/*.ts",
        "lib/sources/cheapshark/normalize.ts",
        "lib/sources/cheapshark/store-registry.ts",
        "lib/sources/cheapshark/store-url.ts",
        "lib/sources/psn/config.ts",
        "lib/sources/psn/normalize.ts",
        "lib/sources/psn/store-url.ts",
        "lib/sources/xbox/config.ts",
        "lib/sources/xbox/normalize.ts",
        "lib/sources/xbox/store-url.ts",
      ],
      exclude: ["lib/**/*.test.ts", "lib/**/*.d.ts"],
      reporter: ["text", "html"],
      thresholds: {
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
