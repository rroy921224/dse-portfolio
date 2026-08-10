import { connectDB, Price, PriceHistory } from "../../../shared/index.js";
import { fetchLatestPrices } from "../fetchers/dseFetcher.js";
import { logger } from "../lib/logger.js";

/**
 * Runs one full scrape cycle:
 *  1. Fetch latest prices (from whichever source is wired up in dseFetcher.js)
 *  2. Upsert each into `Price` (the "current snapshot" collection the app reads)
 *  3. Insert a point into `PriceHistory` (time-series, for charts later)
 *
 * Any single stock failing to parse/write does NOT stop the rest — we log
 * and continue, so one bad row never blocks updates for everything else.
 */
export async function runScrapeJob() {
  const startedAt = Date.now();
  await connectDB();

  let prices;
  try {
    prices = await fetchLatestPrices();
  } catch (err) {
    logger.error("Failed to fetch prices from data source:", err.message);
    return; // nothing to write this cycle — last known-good Price docs remain untouched
  }

  if (!prices.length) {
    logger.warn("Fetch succeeded but returned 0 rows — skipping this cycle.");
    return;
  }

  const scrapedAt = new Date();
  let successCount = 0;
  let failCount = 0;

  for (const row of prices) {
    try {
      await Price.findOneAndUpdate(
        { tradingCode: row.tradingCode },
        { ...row, scrapedAt },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
      );

      /* await PriceHistory.create({
        tradingCode: row.tradingCode,
        ltp: row.ltp,
        volume: row.volume,
        timestamp: scrapedAt,
      }); */

      successCount++;
    } catch (err) {
      failCount++;
      logger.error(`Failed to write ${row.tradingCode}:`, err.message);
    }
  }

  const durationMs = Date.now() - startedAt;
  logger.info(
    `Scrape cycle done: ${successCount} written, ${failCount} failed, ${prices.length} total (${durationMs}ms)`,
  );
}
