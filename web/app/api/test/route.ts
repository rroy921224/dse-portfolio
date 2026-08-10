import { NextResponse } from "next/server";
import { connectDB, Company, Price } from "../../../../shared/index.js";

export async function GET() {
  try {
    await connectDB();

    const [companyCount, priceCount, samplePrice] = await Promise.all([
      Company.countDocuments(),
      Price.countDocuments(),
      Price.findOne().lean(),
    ]);

    return NextResponse.json({
      ok: true,
      companyCount,
      priceCount,
      samplePrice,
    });
  } catch (err) {
    console.error("DB test route failed:", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
