import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "csv-parse/sync";
import { connectDB, Company, Price } from "../../../shared/index.js";
import { logger } from "../lib/logger.js";

/**
 * ONE-TIME SCRIPT — run manually, not scheduled via cron.
 *
 * Usage:
 *   node src/jobs/seedCompanies.js
 *   node src/jobs/seedCompanies.js path/to/other-file.csv   (optional override)
 *
 * Source: Kaggle "Fundamental Dataset of Bangladeshi Stocks" — only has
 * Symbol + Sector (no full company name), so `name` is seeded as a
 * placeholder equal to tradingCode. Fill in real names manually later.
 *
 * Strategy:
 *   1. Parse CSV, build symbol -> sector map (most recent Year wins if a
 *      symbol has inconsistent sector labels across rows).
 *   2. Pull distinct tradingCodes already present in `Price` (the current
 *      live-traded universe, populated by the scraper).
 *   3. Upsert a Company doc per tradingCode — sector from CSV if matched,
 *      "Unknown" if not (e.g. very recently listed stock not in the 2023
 *      dataset).
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath =
  process.argv[2] || path.join(__dirname, "../../data/finance.csv");

async function main() {
  if (!fs.existsSync(csvPath)) {
    logger.error(`CSV not found at ${csvPath}`);
    process.exit(1);
  }

  logger.info(`Reading CSV: ${csvPath}`);
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  // symbol -> { sector, year } — keep the most recent year's sector per symbol
  const symbolSectorMap = new Map();
  for (const row of records) {
    const symbol = (row["Symbol"] || "").trim().toUpperCase();
    const sector = (row["Sector"] || "").trim();
    const year = Number(row["Year"]) || 0;
    if (!symbol) continue;

    const existing = symbolSectorMap.get(symbol);
    if (!existing || year > existing.year) {
      symbolSectorMap.set(symbol, { sector, year });
    }
  }
  logger.info(`Parsed ${symbolSectorMap.size} distinct symbols from CSV`);

  await connectDB();

  const tradingCodes = await Price.distinct("tradingCode");
  logger.info(
    `Found ${tradingCodes.length} distinct trading codes in Price collection`,
  );

  if (tradingCodes.length === 0) {
    logger.warn(
      "No trading codes found in Price collection — run the scraper (index.js) at least once before seeding companies.",
    );
    process.exit(1);
  }

  let matched = 0;
  let unmatched = 0;

  for (const tradingCode of tradingCodes) {
    const csvEntry = symbolSectorMap.get(tradingCode);
    const sector = csvEntry?.sector || "Unknown";
    if (csvEntry) matched++;
    else unmatched++;

    await Company.findOneAndUpdate(
      { tradingCode },
      {
        tradingCode,
        // Placeholder — CSV has no full company name field. Update manually later.
        name: tradingCode,
        sector,
        isActive: true,
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
  }

  logger.info(
    `Done. ${matched} matched to a CSV sector, ${unmatched} unmatched (set to "Unknown").`,
  );

  if (unmatched > 0) {
    const unmatchedCodes = tradingCodes.filter((c) => !symbolSectorMap.has(c));
    logger.info(
      "Unmatched codes (likely newer listings not in the 2023 dataset):",
    );
    logger.info(unmatchedCodes.join(", "));
  }

  process.exit(0);
}

main().catch((err) => {
  logger.error("Seed script failed:", err);
  process.exit(1);
});
