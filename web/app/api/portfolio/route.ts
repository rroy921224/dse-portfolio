import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { computeHoldings, round2 } from "@/lib/portfolioCalculations";
import { connectDB, Transaction, Price } from "../../../../shared/index.js";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  await connectDB();

  const transactions = await Transaction.find({
    userId: session.user.id,
  }).lean();
  const holdingsMap = computeHoldings(transactions);
  const allHoldings = [...holdingsMap.values()];

  const activeHoldings = allHoldings.filter((h) => h.quantity > 0);
  const tradingCodes = activeHoldings.map((h) => h.tradingCode);

  const prices = await Price.find({
    tradingCode: { $in: tradingCodes },
  }).lean();
  const priceMap = new Map(prices.map((p) => [p.tradingCode, p]));

  let totalInvested = 0;
  let totalCurrentValue = 0;

  const holdings = activeHoldings.map((h) => {
    const price = priceMap.get(h.tradingCode);
    const currentPrice = price?.ltp ?? 0;
    const currentValue = h.quantity * currentPrice;
    const unrealizedPL = currentValue - h.totalInvested;
    const unrealizedPLPercent =
      h.totalInvested > 0 ? (unrealizedPL / h.totalInvested) * 100 : 0;

    totalInvested += h.totalInvested;
    totalCurrentValue += currentValue;

    return {
      tradingCode: h.tradingCode,
      quantity: h.quantity,
      avgCost: round2(h.avgCost),
      totalInvested: round2(h.totalInvested),
      currentPrice,
      currentValue: round2(currentValue),
      unrealizedPL: round2(unrealizedPL),
      unrealizedPLPercent: round2(unrealizedPLPercent),
      realizedPL: round2(h.realizedPL),
      priceUpdatedAt: price?.scrapedAt ?? null,
    };
  });

  const totalRealizedPL = round2(
    allHoldings.reduce((sum, h) => sum + h.realizedPL, 0),
  );
  const totalUnrealizedPL = round2(totalCurrentValue - totalInvested);
  const totalUnrealizedPLPercent =
    totalInvested > 0 ? round2((totalUnrealizedPL / totalInvested) * 100) : 0;

  return NextResponse.json({
    ok: true,
    holdings,
    summary: {
      totalInvested: round2(totalInvested),
      totalCurrentValue: round2(totalCurrentValue),
      totalUnrealizedPL,
      totalUnrealizedPLPercent,
      totalRealizedPL,
      totalPL: round2(totalRealizedPL + totalUnrealizedPL),
    },
  });
}

const transactionSchema = z.object({
  tradingCode: z.string().min(1),
  type: z.enum(["buy", "sell"]),
  quantity: z.number().positive(),
  price: z.number().nonnegative(),
  commissionPercent: z.number().min(0).max(5).default(0.35),
  date: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();
    const parsed = transactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Invalid input",
        },
        { status: 400 },
      );
    }

    const { type, quantity, price, commissionPercent, date, notes } =
      parsed.data;
    const tradingCode = parsed.data.tradingCode.toUpperCase();

    await connectDB();

    if (type === "sell") {
      const existingTransactions = await Transaction.find({
        userId: session.user.id,
        tradingCode,
      }).lean();

      const holdingsMap = computeHoldings(existingTransactions);
      const currentQty = holdingsMap.get(tradingCode)?.quantity ?? 0;

      if (quantity > currentQty) {
        return NextResponse.json(
          {
            ok: false,
            error: `You only hold ${currentQty} shares of ${tradingCode}.`,
          },
          { status: 400 },
        );
      }
    }

    const transaction = await Transaction.create({
      userId: session.user.id,
      tradingCode,
      type,
      quantity,
      price,
      commissionPercent,
      date: date ? new Date(date) : new Date(),
      notes,
    });

    return NextResponse.json({ ok: true, transaction });
  } catch (err) {
    console.error("POST /api/portfolio failed:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to record transaction." },
      { status: 500 },
    );
  }
}
