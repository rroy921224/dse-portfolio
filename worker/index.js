import "dotenv/config";
import cron from "node-cron";
import { runScrapeJob } from "./src/jobs/scrapePrices.js";
import { isMarketOpen } from "./src/lib/marketHours.js";
import { logger } from "./src/lib/logger.js";

const CRON_SCHEDULE = "*/30 * * * * *"; // every 30 seconds (node-cron supports seconds field)

// In local dev, you'll often be working outside DSE trading hours (evenings,
// weekends) — set SKIP_MARKET_HOURS_CHECK=true in .env to scrape regardless
// of the day/time, so you always have fresh-ish data to build against.
// Leave this UNSET (or "false") in production — no reason to hit the API
// every 30s when the market's closed and nothing's actually changing.
const SKIP_MARKET_HOURS_CHECK = process.env.SKIP_MARKET_HOURS_CHECK === "true";

logger.info("Worker starting. Schedule:", CRON_SCHEDULE);
if (SKIP_MARKET_HOURS_CHECK) {
  logger.warn(
    "SKIP_MARKET_HOURS_CHECK is true — scraping regardless of DSE trading hours.",
  );
}

cron.schedule(CRON_SCHEDULE, async () => {
  if (!SKIP_MARKET_HOURS_CHECK && !isMarketOpen()) {
    logger.info("Market closed — skipping this cycle.");
    return;
  }

  try {
    await runScrapeJob();
  } catch (err) {
    // Safety net: runScrapeJob already handles its own errors internally,
    // but this ensures a totally unexpected throw never kills the cron loop.
    logger.error("Unexpected error in scrape job:", err);
  }
});

// Optional: run once immediately on startup too, useful for local dev so you
// don't have to wait for the next cron tick to see data flowing.
if (process.env.RUN_ON_STARTUP === "true") {
  runScrapeJob().catch((err) =>
    logger.error("Startup run failed:", err.message),
  );
}
