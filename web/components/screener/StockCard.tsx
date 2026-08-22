"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { timeAgo } from "@/lib/marketHours";
import AverageCalculatorModal from "@/components/shared/AverageCalculatorModal";

interface PriceData {
  ltp: number;
  change: number;
  changePercent: number;
  scrapedAt?: string | null;
}

interface HoldingData {
  quantity: number;
  avgCost: number;
}

export default function StockCard({
  tradingCode,
  sector,
  price,
  holding,
}: {
  tradingCode: string;
  sector?: string;
  price: PriceData | null;
  holding: HoldingData | null;
}) {
  const queryClient = useQueryClient();
  const [showCalculator, setShowCalculator] = useState(false);

  const removeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/watchlist/${tradingCode}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });

  const isUp = (price?.change ?? 0) >= 0;

  let plInfo: { pl: number; plPercent: number } | null = null;
  if (holding && price) {
    const currentValue = holding.quantity * price.ltp;
    const invested = holding.quantity * holding.avgCost;
    const pl = currentValue - invested;
    const plPercent = invested > 0 ? (pl / invested) * 100 : 0;
    plInfo = { pl, plPercent };
  }

  return (
    <div className="border rounded-lg p-4 relative">
      <button
        onClick={() => removeMutation.mutate()}
        className="absolute top-2 right-2 text-gray-300 hover:text-red-500 text-sm"
        title="Remove from screener"
      >
        ✕
      </button>

      <Link
        href={`/stocks/${tradingCode}`}
        className="font-semibold hover:underline"
      >
        {tradingCode}
      </Link>
      {sector && <p className="text-xs text-gray-400 mb-2">{sector}</p>}

      {price ? (
        <>
          <p className="text-xl font-bold mt-1">
            ৳{price.ltp.toLocaleString()}
          </p>
          <p className={`text-sm ${isUp ? "text-green-600" : "text-red-600"}`}>
            {isUp ? "+" : ""}
            {price.change} ({isUp ? "+" : ""}
            {price.changePercent}%)
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Updated {timeAgo(price.scrapedAt)}
          </p>
        </>
      ) : (
        <p className="text-sm text-gray-400 mt-1">No price data</p>
      )}

      {plInfo && holding && (
        <div className="mt-3 pt-3 border-t text-xs">
          <p className="text-gray-500">
            Holding: {holding.quantity} @ avg ৳{holding.avgCost}
          </p>
          <p
            className={`font-medium ${
              plInfo.pl >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {plInfo.pl >= 0 ? "+" : ""}৳{plInfo.pl.toFixed(2)} (
            {plInfo.pl >= 0 ? "+" : ""}
            {plInfo.plPercent.toFixed(2)}%)
          </p>
        </div>
      )}

      <button
        onClick={() => setShowCalculator(true)}
        className="mt-3 w-full text-xs border rounded py-1.5 text-gray-600 hover:bg-gray-50"
      >
        🧮 Average Calculator
      </button>

      {showCalculator && (
        <AverageCalculatorModal
          tradingCode={tradingCode}
          currentPrice={price?.ltp ?? 0}
          holding={holding}
          onClose={() => setShowCalculator(false)}
        />
      )}
    </div>
  );
}
