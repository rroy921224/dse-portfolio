import { NextResponse } from "next/server";
import { connectDB, Price } from "../../../../shared/index.js";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const codesParam = searchParams.get("codes"); // comma-separated, e.g. "SQURPHARMA,ACIFORMULA"

    const filter: Record<string, unknown> = {};

    if (codesParam) {
      const codes = codesParam
        .split(",")
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean);
      filter.tradingCode = { $in: codes };
    }

    const prices = await Price.find(filter).lean();

    return NextResponse.json({ ok: true, prices });
  } catch (err) {
    console.error("GET /api/prices failed:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch prices." },
      { status: 500 }
    );
  }
}
