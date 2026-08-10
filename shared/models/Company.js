import mongoose from "mongoose";

const CompanySchema = new mongoose.Schema(
  {
    tradingCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sector: {
      type: String,
      trim: true,
      index: true,
    },
    category: {
      type: String, // A, B, N, Z
      trim: true,
    },
    faceValue: {
      type: Number,
    },
    listedDate: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Company ||
  mongoose.model("Company", CompanySchema);
