import axios from "axios";

/**
 * ONE-OFF DEBUG SCRIPT — not part of the app, just for inspecting what
 * bdstock.org's /historical endpoint actually returns before we build a
 * real backfill script around it. Delete or ignore after use.
 *
 * Usage: node debugHistorical.js
 */

/* const TEST_CODE = "GP"; // a stock we know is actively traded
const START = "2026-08-01";
const END = "2026-08-20";

async function main() {
  const url = `https://bdstock.org/v1/dse/historical?code=${TEST_CODE}&start=${START}&end=${END}`;
  console.log("Fetching:", url);

  try {
    const { data } = await axios.get(url, { timeout: 10_000 });
    console.log("RAW RESPONSE:");
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Request failed:", err.message);
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Body:", JSON.stringify(err.response.data, null, 2));
    }
  }
}
main(); */

/**
 * ONE-OFF DEBUG SCRIPT — checks two things before we commit to a 5-year
 * backfill plan:
 *   1. How far back does bdstock.org's /historical endpoint actually have
 *      data? (it may not go back 5 years at all)
 *   2. Does requesting a huge range get capped/truncated, or does it
 *      genuinely return everything requested?
 *
 * Usage: node debugHistoricalRange.js
 */

const TEST_CODE = "GP";

async function testRange(label, start, end) {
  const url = `https://bdstock.org/v1/dse/historical?code=${TEST_CODE}&start=${start}&end=${end}`;
  console.log(`\n=== ${label} ===`);
  console.log("URL:", url);

  try {
    const { data } = await axios.get(url, { timeout: 15_000 });
    const rows = data?.data ?? [];
    console.log("Row count:", rows.length);
    if (rows.length > 0) {
      console.log("First row (most recent):", JSON.stringify(rows[0]));
      console.log("Last row (oldest):", JSON.stringify(rows[rows.length - 1]));
    } else {
      console.log("No data returned for this range.");
    }
  } catch (err) {
    console.error("Request failed:", err.message);
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Body:", JSON.stringify(err.response.data)?.slice(0, 500));
    }
  }
}

async function main() {
  // Test 1: request a full 5-year range in one call — see if it's capped
  await testRange("5-year range request", "2021-08-20", "2026-08-20");

  // small delay to be polite between test calls
  await new Promise((r) => setTimeout(r, 1000));

  // Test 2: request a very old, narrow window to see if data exists that far back at all
  await testRange("Old narrow window (2021)", "2021-01-01", "2021-01-31");

  await new Promise((r) => setTimeout(r, 1000));

  // Test 3: even older, to find the actual edge
  await testRange("Very old narrow window (2018)", "2018-01-01", "2018-01-31");
}

main();
