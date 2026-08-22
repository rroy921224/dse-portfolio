import "dotenv/config";
import axios from "axios";
import mongoose from "mongoose";
import { connectDB, Company, DailyClose } from "../shared/index.js";
import { logger } from "./src/lib/logger.js";

/**
 * ONE-TIME BACKFILL — run manually and LOCALLY.
 *
 * Runs through ALL companies from #1 every time, unconditionally — no
 * stock-level "already done, skip" pre-filter. Correctness over speed:
 * a stock-level skip risks treating a PARTIALLY-saved stock (interrupted
 * mid-run) as fully done and permanently skipping it with incomplete data.
 *
 * Instead, safety comes from the per-DAY upsert on {tradingCode, date}:
 * already-saved days get overwritten with the same data (harmless no-op
 * in effect), missing days get inserted. Guaranteed no gaps, at the cost
 * of re-fetching from the API for stocks already complete on every re-run.
 */

const START_DATE = "2024-01-01";
const DELAY_MS = 400;

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
  const { data } = await axios.get(url, { timeout: 30_000 });
  const rows = data?.data ?? [];
  return rows.filter((r) => r.DATE && r.DATE.trim() !== "");
}

async function main() {
  await connectDB();

  const companies = await Company.find({}).lean();
  logger.info(
    `Starting backfill for ${companies.length} companies (from #1, no skipping)...`,
  );

  let totalSaved = 0;
  let totalSkippedRows = 0;
  let stocksProcessed = 0;
  let stocksFailed = 0;

  for (const company of companies) {
    const tradingCode = company.tradingCode;

    try {
      const rows = await fetchHistoryForStock(tradingCode);

      for (const row of rows) {
        const date = row.DATE;
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
          totalSkippedRows++;
          continue;
        }

        // Upsert on {tradingCode, date} — inserts if missing, overwrites
        // with the same data (harmless) if already saved. This is what
        // makes re-running safe without needing stock-level tracking.
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
    `Backfill complete. ${totalSaved} day-records saved/updated, ${totalSkippedRows} rows skipped (no usable price), ${stocksFailed} stocks failed entirely.`,
  );

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  logger.error("Backfill failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
