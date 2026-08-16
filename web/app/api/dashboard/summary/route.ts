import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  computeHoldings,
  round2,
  type TransactionLike,
} from "@/lib/portfolioCalculations";
import { connectDB, Transaction, Price } from "../../../../../shared/index.js";

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
  const holdingsMap = computeHoldings(
    transactions as unknown as TransactionLike[],
  );
  const activeHoldings = [...holdingsMap.values()].filter(
    (h) => h.quantity > 0,
  );

  if (activeHoldings.length === 0) {
    return NextResponse.json({
      ok: true,
      hasHoldings: false,
      holdingsCount: 0,
      totalCurrentValue: 0,
      totalInvested: 0,
      todaysPL: 0,
      todaysPLPercent: 0,
      totalUnrealizedPL: 0,
      totalUnrealizedPLPercent: 0,
      topGainer: null,
      topLoser: null,
    });
  }

  const tradingCodes = activeHoldings.map((h) => h.tradingCode);
  const prices = await Price.find({
    tradingCode: { $in: tradingCodes },
  }).lean();
  const priceMap = new Map(prices.map((p) => [p.tradingCode, p]));

  let totalCurrentValue = 0;
  let totalInvested = 0;
  let todaysPL = 0;
  let previousTotalValue = 0; // total value at yesterday's close, for today's % calc

  const enriched = activeHoldings.map((h) => {
    const price = priceMap.get(h.tradingCode);
    const currentPrice = price?.ltp ?? 0;
    const change = price?.change ?? 0; // absolute change vs yesterday's close
    const changePercent = price?.changePercent ?? 0;
    const ycp = price?.ycp ?? currentPrice - change;
    const currentValue = h.quantity * currentPrice;

    totalCurrentValue += currentValue;
    totalInvested += h.totalInvested;
    todaysPL += change * h.quantity;
    previousTotalValue += ycp * h.quantity;

    return {
      tradingCode: h.tradingCode,
      currentPrice,
      changePercent,
    };
  });

  const todaysPLPercent =
    previousTotalValue > 0 ? (todaysPL / previousTotalValue) * 100 : 0;
  const totalUnrealizedPL = totalCurrentValue - totalInvested;
  const totalUnrealizedPLPercent =
    totalInvested > 0 ? (totalUnrealizedPL / totalInvested) * 100 : 0;

  const sortedByChangePercent = [...enriched].sort(
    (a, b) => b.changePercent - a.changePercent,
  );
  const topGainer = sortedByChangePercent[0] ?? null;
  const topLoser =
    sortedByChangePercent[sortedByChangePercent.length - 1] ?? null;

  return NextResponse.json({
    ok: true,
    hasHoldings: true,
    holdingsCount: activeHoldings.length,
    totalCurrentValue: round2(totalCurrentValue),
    totalInvested: round2(totalInvested),
    todaysPL: round2(todaysPL),
    todaysPLPercent: round2(todaysPLPercent),
    totalUnrealizedPL: round2(totalUnrealizedPL),
    totalUnrealizedPLPercent: round2(totalUnrealizedPLPercent),
    topGainer: topGainer && {
      tradingCode: topGainer.tradingCode,
      changePercent: round2(topGainer.changePercent),
      currentPrice: topGainer.currentPrice,
    },
    topLoser: topLoser && {
      tradingCode: topLoser.tradingCode,
      changePercent: round2(topLoser.changePercent),
      currentPrice: topLoser.currentPrice,
    },
  });
}
