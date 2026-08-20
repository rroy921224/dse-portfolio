import mongoose from "mongoose";

/**
 * One document per stock PER DAY (not per scrape cycle) — this is what
 * PriceHistory was originally meant to be before we found it generating
 * hundreds of thousands of docs/day. ~395 docs/day here, not per-15-min.
 *
 * Populated by a separate daily job (worker/saveDailyClose.js), run once
 * shortly after market close, NOT by the regular price scraper.
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
      // Stored as "YYYY-MM-DD" (Bangladesh calendar date), not a full
      // Date/timestamp — we only care about the calendar day, and a string
      // key makes the upsert query trivial and avoids timezone ambiguity.
      type: String,
      required: true,
    },
    close: {
      type: Number,
      required: true,
    },
    source: {
      // Which raw field this value came from — useful for knowing, in
      // hindsight, whether it was the exchange's settled close or a
      // fallback to last-traded-price (see notes on closep's reliability).
      type: String,
      enum: ["closep", "ltp"],
      required: true,
    },
  },
  { timestamps: true },
);

// One row per stock per day — re-running the job the same day upserts,
// never duplicates.
DailyCloseSchema.index({ tradingCode: 1, date: 1 }, { unique: true });

export default mongoose.models.DailyClose ||
  mongoose.model("DailyClose", DailyCloseSchema);
