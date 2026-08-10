import "dotenv/config";
import mongoose from "mongoose";
import { runScrapeJob } from "./src/jobs/scrapePrices.js";
import { isMarketOpen } from "./src/lib/marketHours.js";
import { logger } from "./src/lib/logger.js";

/**
 * Entry point for GitHub Actions (or any external scheduler) — runs ONE
 * scrape cycle and exits, instead of index.js's persistent cron loop.
 *
 * index.js (the cron loop) is still what you run locally with `npm run dev`
 * — this file is ONLY for the deployed/scheduled version, since there's no
 * always-on free hosting for a persistent process anymore.
 */

const SKIP_MARKET_HOURS_CHECK = process.env.SKIP_MARKET_HOURS_CHECK === "true";

async function main() {
  if (!SKIP_MARKET_HOURS_CHECK && !isMarketOpen()) {
    logger.info("Market closed — skipping this run.");
    await mongoose.disconnect();
    process.exit(0);
  }

  await runScrapeJob();

  // Important in a one-shot script: without this, the open MongoDB
  // connection keeps the Node process alive indefinitely, and the GitHub
  // Actions job would hang until it times out instead of finishing cleanly.
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  logger.error("Scrape run failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
