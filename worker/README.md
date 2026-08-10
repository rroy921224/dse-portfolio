# /worker

Standalone scraper process. Runs independently of the Next.js app, on its
own schedule, writing to the same MongoDB the app reads from.

## Setup

```bash
cd worker
npm install
cp .env.example .env
# then edit .env and paste your real MONGODB_URI
```

## Run

```bash
npm run dev     # auto-restarts on file changes (good for local dev)
# or
npm start        # plain node, no auto-restart
```

You should see logs like:

```
[2026-07-31T10:00:00.000Z] INFO: Worker starting. Schedule: */30 * * * * *
[2026-07-31T10:00:00.500Z] INFO: Scrape cycle done: 350 written, 0 failed, 350 total (500ms)
```

## Important: verify the raw response shape first

`src/fetchers/dseFetcher.js` maps bdstock.org's response fields to our
schema, but the exact field names/casing in their real JSON response
haven't been confirmed yet. **Before trusting this in any real use:**

1. Temporarily add `console.log(JSON.stringify(data, null, 2))` right after
   the `axios.get(...)` call in `dseFetcher.js`.
2. Run the worker once, look at the actual raw output.
3. Adjust the field names in `normalizeRow()` to match exactly.
4. Remove the debug `console.log` once confirmed.

## Files

| File | Purpose |
|---|---|
| `index.js` | Entry point — sets up the cron schedule, checks market hours, calls the job |
| `src/jobs/scrapePrices.js` | One full scrape cycle: fetch → upsert `Price` → append `PriceHistory` |
| `src/fetchers/dseFetcher.js` | **The only file that knows about bdstock.org.** Swap data sources here only. |
| `src/lib/marketHours.js` | Returns true/false for "is DSE open right now" (Bangladesh time, Sun–Thu, 10am–2:30pm) |
| `src/lib/logger.js` | Timestamped console logging |

## Swapping the data source later

If `bdstock.org` goes down, gets rate-limited, or you move to a different
provider (another community API, or your own licensed feed), **only
`src/fetchers/dseFetcher.js` needs to change.** It must keep returning the
same normalized shape:

```js
[
  {
    tradingCode: "SQURPHARMA",
    ltp: 245.5,
    high: 248,
    low: 243,
    closep: 244,
    change: 1.5,
    changePercent: 0.61,
    volume: 125000,
    tradeCount: 450,
    valueMn: 30.5,
  },
  // ...
]
```

Nothing in `scrapePrices.js`, the schemas, or the Next.js app needs to know
where the data actually came from.

## Adjusting the schedule

Edit `CRON_SCHEDULE` in `index.js`. Current default is every 30 seconds
during market hours only. Cron syntax reference: `* * * * * *` = second,
minute, hour, day-of-month, month, day-of-week.

## Known limitations (intentional, for now)

- No holiday calendar yet — `isMarketOpen()` only checks weekday + time,
  not Bangladesh public holidays. DSE will simply return stale/repeated
  data on a holiday, which is harmless but not "smart" yet.
- No retry/backoff on failed fetches — a failed cycle just waits for the
  next cron tick. Fine at 30s intervals; revisit if the interval gets
  much longer.
- No alerting if the data source stays down for multiple cycles — worth
  adding once this matters (e.g. ping a Slack webhook after N consecutive
  failures).
