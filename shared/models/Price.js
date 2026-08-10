import mongoose from "mongoose";

const PriceSchema = new mongoose.Schema(
  {
    tradingCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    ltp: {
      // Last Traded Price
      type: Number,
      required: true,
    },
    high: Number,
    low: Number,
    closep: Number, // previous closing price
    ycp: Number, // yesterday's closing price (as DSE reports it, distinct from closep)
    change: Number, // absolute change vs previous close
    changePercent: Number,
    volume: Number,
    tradeCount: Number,
    valueMn: Number, // total trade value in millions (as DSE reports it)
    scrapedAt: {
      // when the scraper actually read this from DSE
      type: Date,
      required: true,
    },
  },
  { timestamps: true }, // createdAt/updatedAt = when OUR db doc was last touched
);

export default mongoose.models.Price || mongoose.model("Price", PriceSchema);
