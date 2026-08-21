import "dotenv/config";
import mongoose from "mongoose";
import { connectDB, Price, DailyClose } from "../shared/index.js";
import { logger } from "./src/lib/logger.js";

/**
 * Run ONCE, shortly after market close. Reads whatever's currently sitting
 * in `Price` (the live snapshot collection) and freezes it into `DailyClose`
 * — one row per stock for today's date, capturing all daily fields
 * available from the scraper (LTP, closep, high, low, trade count, volume,
 * value). "Adjusted opening price" is NOT captured — confirmed not
 * available from bdstock.org's /latest endpoint at all.
 *
 * NOT part of the regular 15-min scrape cycle — this is a separate job,
 * triggered by its own GitHub Actions workflow (daily-close.yml).
 */

const FORCE = process.env.FORCE_SAVE === "true";

function isTradingDayToday() {
  const BD_UTC_OFFSET_HOURS = 6;
  const bdTime = new Date(Date.now() + BD_UTC_OFFSET_HOURS * 60 * 60_000);
  const day = bdTime.getUTCDay(); // 0=Sun ... 6=Sat
  return day !== 5 && day !== 6; // DSE weekend is Friday/Saturday
}

function todayBangladeshDateString() {
  const BD_UTC_OFFSET_HOURS = 6;
  const bdTime = new Date(Date.now() + BD_UTC_OFFSET_HOURS * 60 * 60_000);
  return bdTime.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

async function main() {
  if (!FORCE && !isTradingDayToday()) {
    logger.info("Not a trading day (Fri/Sat) — skipping daily close save.");
    await mongoose.disconnect();
    process.exit(0);
  }

  await connectDB();

  const prices = await Price.find({}).lean();
  if (prices.length === 0) {
    logger.warn("No documents in Price collection — nothing to save.");
    await mongoose.disconnect();
    process.exit(0);
  }

  const date = todayBangladeshDateString();
  let saved = 0;
  let failed = 0;

  for (const p of prices) {
    try {
      // Prefer the exchange's settled closing price; fall back to last
      // traded price when closep is missing/zero (a known gap with our
      // current data source — see project notes).
      const useClosep = typeof p.closep === "number" && p.closep > 0;
      const close = useClosep ? p.closep : p.ltp;
      const source = useClosep ? "closep" : "ltp";

      if (typeof close !== "number" || close <= 0) {
        failed++;
        continue; // skip stocks with no usable price at all
      }

      await DailyClose.findOneAndUpdate(
        { tradingCode: p.tradingCode, date },
        {
          tradingCode: p.tradingCode,
          date,
          close,
          source,
          ltp: p.ltp,
          closep: p.closep,
          high: p.high,
          low: p.low,
          tradeCount: p.tradeCount,
          volume: p.volume,
          valueMn: p.valueMn,
        },
        { upsert: true, returnDocument: "after" },
      );
      saved++;
    } catch (err) {
      failed++;
      logger.error(
        `Failed to save daily close for ${p.tradingCode}:`,
        err.message,
      );
    }
  }

  logger.info(
    `Daily close saved for ${date}: ${saved} saved, ${failed} failed.`,
  );

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  logger.error("Daily close job failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
