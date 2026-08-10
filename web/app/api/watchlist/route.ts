import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB, Watchlist, Company, Price } from "../../../../shared/index.js";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const entries = await Watchlist.find({ userId: session.user.id }).lean();
  const tradingCodes = entries.map((e) => e.tradingCode);

  const [companies, prices] = await Promise.all([
    Company.find({ tradingCode: { $in: tradingCodes } }).lean(),
    Price.find({ tradingCode: { $in: tradingCodes } }).lean(),
  ]);

  const companyMap = new Map(companies.map((c) => [c.tradingCode, c]));
  const priceMap = new Map(prices.map((p) => [p.tradingCode, p]));

  // Preserve the order they were added in (oldest first)
  const watchlist = entries
    .sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime())
    .map((e) => ({
      tradingCode: e.tradingCode,
      addedAt: e.addedAt,
      company: companyMap.get(e.tradingCode) || null,
      price: priceMap.get(e.tradingCode) || null,
    }));

  return NextResponse.json({ ok: true, watchlist });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const tradingCode = (body.tradingCode || "").toString().trim().toUpperCase();

    if (!tradingCode) {
      return NextResponse.json(
        { ok: false, error: "tradingCode is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const exists = await Company.exists({ tradingCode });
    if (!exists) {
      return NextResponse.json(
        { ok: false, error: "Unknown trading code" },
        { status: 404 }
      );
    }

    // upsert = adding an already-watchlisted stock again is a harmless no-op,
    // not an error (the unique index on {userId, tradingCode} makes this safe)
    await Watchlist.findOneAndUpdate(
      { userId: session.user.id, tradingCode },
      { userId: session.user.id, tradingCode },
      { upsert: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/watchlist failed:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to add to watchlist." },
      { status: 500 }
    );
  }
}
