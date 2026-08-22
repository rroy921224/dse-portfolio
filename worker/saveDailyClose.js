import "dotenv/config";
import axios from "axios";
import mongoose from "mongoose";
import { connectDB, Company, DailyClose } from "../shared/index.js";
import { logger } from "./src/lib/logger.js";

/**
 * Run once daily, shortly after market close. Loops through every company
 * and fetches TODAY's single-day record from bdstock.org's /historical
 * endpoint (start=end=today) — this gives the FULL field set including
 * openp (opening price), which the old Price-collection-based approach
 * couldn't provide (that endpoint doesn't have openp at all).
 *
 * Confirmed via timing test: a single-day request takes ~1-3s per stock
 * (not the ~100s seen for multi-year ranges) — so looping all ~395 stocks
 * takes roughly 15-20 minutes total, well within GitHub Actions limits.
 *
 * Triggered by its own GitHub Actions workflow (daily-close.yml).
 */

const FORCE = process.env.FORCE_SAVE === "true";
const DELAY_MS = 300; // small courtesy delay between requests

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toNumber(val) {
  if (val === undefined || val === null || val === "") return undefined;
  const n = Number(String(val).replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

async function fetchTodayForStock(tradingCode, dateStr) {
  const url = `https://bdstock.org/v1/dse/historical?code=${tradingCode}&start=${dateStr}&end=${dateStr}`;
  const { data } = await axios.get(url, { timeout: 20_000 });
  const rows = data?.data ?? [];
  return rows.filter((r) => r.DATE && r.DATE.trim() !== "");
}

async function main() {
  if (!FORCE && !isTradingDayToday()) {
    logger.info("Not a trading day (Fri/Sat) — skipping daily close save.");
    await mongoose.disconnect();
    process.exit(0);
  }

  await connectDB();

  const companies = await Company.find({}).lean();
  const date = todayBangladeshDateString();

  logger.info(
    `Saving daily close for ${date} — ${companies.length} companies...`,
  );

  let saved = 0;
  let skipped = 0;
  let failed = 0;

  for (const company of companies) {
    const tradingCode = company.tradingCode;

    try {
      const rows = await fetchTodayForStock(tradingCode, date);
      const row = rows[0];

      if (!row) {
        skipped++;
        continue; // no data at all for today (e.g. suspended stock)
      }

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
        skipped++;
        continue;
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
      saved++;
    } catch (err) {
      failed++;
      logger.error(`Failed for ${tradingCode}:`, err.message);
    }

    await sleep(DELAY_MS);
  }

  logger.info(
    `Daily close saved for ${date}: ${saved} saved, ${skipped} skipped, ${failed} failed.`,
  );

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  logger.error("Daily close job failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
