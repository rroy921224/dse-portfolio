"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Legend,
} from "recharts";

interface DailyRecord {
  date: string;
  close: number;
  high?: number;
  low?: number;
  volume?: number;
  tradeCount?: number;
}

interface StockHistoryResponse {
  ok: boolean;
  company: { tradingCode: string; name: string; sector: string } | null;
  price: {
    ltp: number;
    change: number;
    changePercent: number;
  } | null;
  history: DailyRecord[];
  error?: string;
}

async function fetchStockHistory(code: string): Promise<StockHistoryResponse> {
  const res = await fetch(`/api/stocks/${code}/history`);
  return res.json();
}

const RANGE_OPTIONS: { label: string; days: number | null }[] = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
  { label: "All", days: null },
];

export default function StockDetailView({
  tradingCode,
}: {
  tradingCode: string;
}) {
  const [range, setRange] = useState<number | null>(180); // default 6M

  const { data, isLoading, isError } = useQuery({
    queryKey: ["stock-history", tradingCode],
    queryFn: () => fetchStockHistory(tradingCode),
  });

  const filteredHistory = useMemo(() => {
    if (!data?.history) return [];
    if (range === null) return data.history;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - range);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    return data.history.filter((h) => h.date >= cutoffStr);
  }, [data, range]);

  if (isLoading) {
    return <div className="animate-pulse h-96 bg-gray-100 rounded-lg" />;
  }

  if (isError || !data?.ok) {
    return (
      <p className="text-red-500">
        {data?.error || "Failed to load stock data."}
      </p>
    );
  }

  const { company, price } = data;
  const isUp = (price?.change ?? 0) >= 0;

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/screener"
          className="text-sm text-gray-400 hover:underline"
        >
          ← Back
        </Link>
        <div className="flex items-baseline gap-3 mt-2">
          <h1 className="text-2xl font-semibold">{tradingCode}</h1>
          {company?.sector && (
            <span className="text-sm text-gray-400">{company.sector}</span>
          )}
        </div>
        {price && (
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-2xl font-bold">
              ৳{price.ltp?.toLocaleString()}
            </span>
            <span
              className={`text-sm ${isUp ? "text-green-600" : "text-red-600"}`}
            >
              {isUp ? "+" : ""}
              {price.change} ({isUp ? "+" : ""}
              {price.changePercent}%)
            </span>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 mb-2">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            onClick={() => setRange(opt.days)}
            className={`text-xs px-3 py-1 rounded border ${
              range === opt.days
                ? "bg-black text-white border-black"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="border rounded-lg p-4 mb-6">
        <p className="text-sm font-medium text-gray-500 mb-2">Price History</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredHistory}>
              <defs>
                <linearGradient id="priceColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={30} />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value) => {
                  const numValue =
                    typeof value === "number" ? value : Number(value);
                  return [`৳${numValue}`, "Close"];
                }}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke="#2563eb"
                fill="url(#priceColor)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <p className="text-sm font-medium text-gray-500 mb-2">
          Volume &amp; Trade Count
        </p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={filteredHistory}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={30} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11 }}
              />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar
                yAxisId="left"
                dataKey="volume"
                fill="#93c5fd"
                name="Volume"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="tradeCount"
                stroke="#dc2626"
                strokeWidth={2}
                dot={false}
                name="Trade Count"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
