import axios from "axios";

/**
 * This is the ONLY file in the whole project that knows bdstock.org exists.
 * If this source ever goes down, gets rate-limited, or you switch to a
 * different provider (another community API, or your own licensed feed
 * later), you change THIS file only — nothing downstream needs to know.
 *
 * Everything downstream (the scrape job, the DB writes) works against the
 * NORMALIZED shape returned by `fetchLatestPrices()`, not the raw API shape.
 */

const BASE_URL = "https://bdstock.org/v1/dse";
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Fetches the latest snapshot for all DSE stocks and normalizes field names
 * to match our own Price schema, so nothing downstream has to know about
 * bdstock.org's raw response shape (e.g. "LTP*", "CLOSEP*" etc.).
 *
 * @returns {Promise<Array<NormalizedPrice>>}
 */
export async function fetchLatestPrices() {
  const { data } = await axios.get(`${BASE_URL}/latest`, {
    timeout: REQUEST_TIMEOUT_MS,
  });

  // Confirmed raw shape from bdstock.org (2026-07-31): array of objects with
  // keys like "TRADING CODE", "LTP*", "HIGH", "LOW", "CLOSEP*", "YCP*",
  // "CHANGE", "TRADE", "VALUE (mn)", "VOLUME". If bdstock.org changes their
  // response shape in the future, this is the only place to update.
  const rows = Array.isArray(data) ? data : (data?.data ?? []);

  return rows
    .map(normalizeRow)
    .filter((row) => row.tradingCode && Number.isFinite(row.ltp));
}

function normalizeRow(row) {
  const ltp = toNumber(row["LTP*"]);
  const ycp = toNumber(row["YCP*"]); // yesterday's closing price
  const change = toNumber(row["CHANGE"]);

  return {
    tradingCode: (row["TRADING CODE"] || "").toString().trim().toUpperCase(),
    ltp,
    high: toNumber(row["HIGH"]),
    low: toNumber(row["LOW"]),
    closep: toNumber(row["CLOSEP*"]), // today's closing price
    ycp, // yesterday's closing price — kept for reference / change% calc
    change,
    // API doesn't provide change% directly — derive it from change & YCP.
    changePercent:
      change !== undefined && ycp
        ? Number(((change / ycp) * 100).toFixed(2))
        : undefined,
    volume: toNumber(row["VOLUME"]),
    tradeCount: toNumber(row["TRADE"]),
    valueMn: toNumber(row["VALUE (mn)"]),
  };
}

function toNumber(val) {
  if (val === undefined || val === null || val === "") return undefined;
  const n = Number(String(val).replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
}
