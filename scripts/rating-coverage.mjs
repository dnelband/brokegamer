import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("POSTGRES_URL or DATABASE_URL required");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false });

const rows = await sql`
  SELECT
    source,
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE rating IS NULL)::int AS missing_rating,
    COUNT(*) FILTER (WHERE rating IS NOT NULL)::int AS with_rating,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE rating IS NULL) / NULLIF(COUNT(*), 0),
      1
    ) AS missing_pct
  FROM deals
  GROUP BY source
  ORDER BY source
`;

console.log("Rating coverage by source:");
console.table(rows);

const totals = await sql`
  SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE rating IS NULL)::int AS missing_rating,
    COUNT(*) FILTER (WHERE rating IS NOT NULL)::int AS with_rating,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE rating IS NULL) / NULLIF(COUNT(*), 0),
      1
    ) AS missing_pct
  FROM deals
`;

console.log("Overall:", totals[0]);

/** Snapshot from #23 (prod, ~2026-07-26) before matcher improvements. */
const BASELINE_MISSING = {
  cheapshark: { total: 572, missing: 26 },
  psn: { total: 186, missing: 97 },
  xbox: { total: 34, missing: 15 },
};

const deltas = rows.map((row) => {
  const baseline = BASELINE_MISSING[row.source];
  if (!baseline) {
    return {
      source: row.source,
      baseline_missing: "—",
      now_missing: row.missing_rating,
      recovered: "—",
    };
  }
  const recovered = baseline.missing - row.missing_rating;
  return {
    source: row.source,
    baseline_missing: baseline.missing,
    now_missing: row.missing_rating,
    recovered,
    baseline_pct: `${((baseline.missing / baseline.total) * 100).toFixed(1)}%`,
    now_pct: `${row.missing_pct}%`,
  };
});

console.log("\nVs #23 baseline (missing ratings):");
console.table(deltas);

await sql.end({ timeout: 5 });
