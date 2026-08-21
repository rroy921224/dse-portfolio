import "dotenv/config";
import axios from "axios";
import mongoose from "mongoose";
import { connectDB, Company, DailyClose } from "../shared/index.js";
import { logger } from "./src/lib/logger.js";

/**
 * ONE-TIME BACKFILL — run manually via GitHub Actions (or locally).
 *
 * Loops through every company, fetches historical daily data from
 * bdstock.org's /historical endpoint, and upserts into DailyClose.
 *
 * Confirmed limits of this data source (via debugHistoricalRange.js):
 *   - Only ~2 years of history actually exists (back to ~Aug 2024),
 *     regardless of how far back you ask.
 *   - One request per stock returns its FULL available history in one
 *     call — no need to chunk into smaller date ranges.
 *
 * Rate-limited with a delay between requests — this is a free, unofficial
 * API and 395 sequential requests deserves to be done politely, not blasted.
 */

const START_DATE = "2024-01-01"; // safely before the source's actual data start
const DELAY_MS = 400; // pause between each stock's request

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toNumber(val) {
  if (val === undefined || val === null || val === "") return undefined;
  const n = Number(String(val).replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

async function fetchHistoryForStock(tradingCode) {
  const url = `https://bdstock.org/v1/dse/historical?code=${tradingCode}&start=${START_DATE}&end=${todayDateString()}`;
  const { data } = await axios.get(url, { timeout: 15_000 });
  const rows = data?.data ?? [];

  // Filter out the "No Day End Data" placeholder rows seen during testing
  return rows.filter((r) => r.DATE && r.DATE.trim() !== "");
}

async function main() {
  await connectDB();

  const companies = await Company.find({}).lean();
  logger.info(`Starting backfill for ${companies.length} companies...`);

  let totalSaved = 0;
  let totalSkipped = 0;
  let stocksProcessed = 0;
  let stocksFailed = 0;

  for (const company of companies) {
    const tradingCode = company.tradingCode;

    try {
      const rows = await fetchHistoryForStock(tradingCode);

      for (const row of rows) {
        const date = row.DATE; // already "YYYY-MM-DD"
        const ltp = toNumber(row["LTP*"]);
        const closep = toNumber(row["CLOSEP*"]);
        const openp = toNumber(row["OPENP*"]);
        const high = toNumber(row["HIGH"]);
        const low = toNumber(row["LOW"]);
        const tradeCount = toNumber(row["TRADE"]);
        const volume = toNumber(row["VOLUME"]);
        const valueMn = toNumber(row["VALUE (mn)"]);

        const useClosep = typeof closep === "number" && closep > 0;
        const close = useClosep ? closep : ltp;
        const source = useClosep ? "closep" : "ltp";

        if (typeof close !== "number" || close <= 0) {
          totalSkipped++;
          continue; // no usable price for this day at all
        }

        await DailyClose.findOneAndUpdate(
          { tradingCode, date },
          {
            tradingCode,
            date,
            close,
            source,
            ltp,
            closep,
            openp,
            high,
            low,
            tradeCount,
            volume,
            valueMn,
          },
          { upsert: true, returnDocument: "after" },
        );
        totalSaved++;
      }

      stocksProcessed++;
      logger.info(
        `[${stocksProcessed}/${companies.length}] ${tradingCode}: ${rows.length} days saved`,
      );
    } catch (err) {
      stocksFailed++;
      logger.error(`Failed to backfill ${tradingCode}:`, err.message);
    }

    await sleep(DELAY_MS);
  }

  logger.info(
    `Backfill complete. ${totalSaved} day-records saved, ${totalSkipped} skipped (no usable price), ${stocksFailed} stocks failed entirely.`,
  );

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  logger.error("Backfill failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
