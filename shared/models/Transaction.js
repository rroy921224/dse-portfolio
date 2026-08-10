import mongoose from "mongoose";

/**
 * Each buy/sell is its own document. Current holdings, avg. cost, and
 * realized/unrealized P/L are all DERIVED by aggregating these — we don't
 * store a mutable "current quantity" field anywhere, so the numbers are
 * always reconstructable and auditable from history.
 */
const TransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tradingCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["buy", "sell"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      // price per share at the time of this transaction (raw market price,
      // BEFORE broker commission — commission is tracked separately below)
      type: Number,
      required: true,
      min: 0,
    },
    commissionPercent: {
      // Broker commission rate at the time of this transaction, e.g. 0.35
      // means 0.35%. Stored per-transaction (not globally) since rates can
      // vary by broker or change over time — this keeps historical
      // transactions accurate even if the user's rate changes later.
      // Defaults to 0 so pre-existing transactions (recorded before this
      // field existed) are treated as zero-commission, not broken.
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    notes: String,
  },
  { timestamps: true },
);

// Common query pattern: "all transactions for this user, this stock, oldest first"
TransactionSchema.index({ userId: 1, tradingCode: 1, date: 1 });

export default mongoose.models.Transaction ||
  mongoose.model("Transaction", TransactionSchema);
