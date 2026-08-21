import mongoose from "mongoose";

/**
 * One document per stock PER DAY (not per scrape cycle). Populated by a
 * separate daily job (worker/saveDailyClose.js), run once shortly after
 * market close, NOT by the regular 15-min price scraper.
 *
 * Field coverage note: "adjusted opening price" was requested but is NOT
 * provided by bdstock.org's /latest endpoint at all (confirmed by
 * inspecting the raw response) — so it's intentionally absent here. All
 * other requested daily fields ARE available and captured below.
 */
const DailyCloseSchema = new mongoose.Schema(
  {
    tradingCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    date: {
      // "YYYY-MM-DD" Bangladesh calendar date — string key keeps the
      // upsert query trivial and avoids timezone ambiguity.
      type: String,
      required: true,
    },
    close: {
      // Convenience field: closep if available (>0), else falls back to
      // ltp. Kept for any code that just wants "the" closing number
      // without caring which underlying field it came from.
      type: Number,
      required: true,
    },
    source: {
      // Which field `close` above actually came from.
      type: String,
      enum: ["closep", "ltp"],
      required: true,
    },
    ltp: {
      // Last traded price, always stored explicitly (regardless of what
      // `close`/`source` resolved to), since "last trading price" was
      // requested as its own distinct value.
      type: Number,
    },
    closep: {
      // Exchange's settled closing price, stored explicitly. May be 0 or
      // absent on days it wasn't available from the source — check
      // `source` above to know whether `close` used this or fell back.
      type: Number,
    },
    high: Number,
    low: Number,
    tradeCount: Number,
    volume: Number,
    valueMn: Number,
  },
  { timestamps: true }
);

// One row per stock per day — re-running the job the same day upserts,
// never duplicates.
DailyCloseSchema.index({ tradingCode: 1, date: 1 }, { unique: true });

export default mongoose.models.DailyClose ||
  mongoose.model("DailyClose", DailyCloseSchema);