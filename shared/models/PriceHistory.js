import mongoose from "mongoose";

/**
 * Time-series collection: one point written per stock on every scrape cycle.
 * Using Mongo's native `timeseries` option (Mongoose 6.3+) instead of a plain
 * collection — much better storage/query efficiency for this write pattern.
 *
 * NOTE: if a `pricehistories` (or whatever the derived collection name is)
 * already exists as a REGULAR collection from earlier testing, Mongo will not
 * let you convert it — drop it once before this schema first runs, or the
 * timeseries options will silently be ignored on an existing collection.
 */
const PriceHistorySchema = new mongoose.Schema(
  {
    tradingCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    ltp: {
      type: Number,
      required: true,
    },
    volume: Number,
    timestamp: {
      type: Date,
      required: true,
    },
  },
  {
    timeseries: {
      timeField: "timestamp",
      metaField: "tradingCode",
      granularity: "minutes",
    },
    // Optional: auto-expire old points after e.g. 180 days to control storage.
    // expireAfterSeconds: 60 * 60 * 24 * 180,
  }
);

// Helpful compound index for "give me this stock's history in a date range"
PriceHistorySchema.index({ tradingCode: 1, timestamp: 1 });

export default mongoose.models.PriceHistory ||
  mongoose.model("PriceHistory", PriceHistorySchema);
