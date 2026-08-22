import { NextResponse } from "next/server";
import {
  connectDB,
  Company,
  Price,
  DailyClose,
} from "../../../../../../shared/index.js";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const tradingCode = code.toUpperCase();

  try {
    await connectDB();

    const [company, price, history] = await Promise.all([
      Company.findOne({ tradingCode }).lean(),
      Price.findOne({ tradingCode }).lean(),
      DailyClose.find({ tradingCode }).sort({ date: 1 }).lean(),
    ]);

    if (!company) {
      return NextResponse.json(
        { ok: false, error: "Stock not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, company, price, history });
  } catch (err) {
    console.error("GET /api/stocks/[code]/history failed:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch stock data." },
      { status: 500 },
    );
  }
}
