import { NextResponse } from "next/server";
import { connectDB, Company } from "../../../../shared/index.js";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const sector = searchParams.get("sector")?.trim();
    const limit = Math.min(Number(searchParams.get("limit")) || 100, 500);

    const filter: Record<string, unknown> = { isActive: true };

    if (sector) {
      filter.sector = sector;
    }

    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [{ tradingCode: regex }, { name: regex }];
    }

    const companies = await Company.find(filter)
      .sort({ tradingCode: 1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ ok: true, companies });
  } catch (err) {
    console.error("GET /api/companies failed:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch companies." },
      { status: 500 },
    );
  }
}
