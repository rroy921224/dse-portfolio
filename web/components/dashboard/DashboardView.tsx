"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

interface Mover {
  tradingCode: string;
  changePercent: number;
  currentPrice: number;
}

interface DashboardSummary {
  ok: boolean;
  hasHoldings: boolean;
  holdingsCount: number;
  totalCurrentValue: number;
  totalInvested: number;
  todaysPL: number;
  todaysPLPercent: number;
  totalUnrealizedPL: number;
  totalUnrealizedPLPercent: number;
  topGainer: Mover | null;
  topLoser: Mover | null;
}

async function fetchSummary(): Promise<DashboardSummary> {
  const res = await fetch("/api/dashboard/summary");
  if (!res.ok) throw new Error("Failed to load dashboard");
  return res.json();
}

export default function DashboardView() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: fetchSummary,
    refetchInterval: 30_000, // matches the scraper's own cycle
  });

  if (isLoading) return <DashboardSkeleton />;

  if (isError || !data?.ok) {
    return (
      <p className="text-red-500">Failed to load dashboard. Please refresh.</p>
    );
  }

  if (!data.hasHoldings) {
    return (
      <div className="border rounded-lg p-8 text-center">
        <p className="text-gray-500 mb-4">
          You don&apos;t have any holdings yet.
        </p>
        <Link
          href="/portfolio"
          className="inline-block bg-black text-white rounded px-4 py-2 text-sm"
        >
          Go to Portfolio
        </Link>
      </div>
    );
  }

  const isPLPositive = data.todaysPL >= 0;
  const isUnrealizedPositive = data.totalUnrealizedPL >= 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card
          label="Portfolio Value"
          value={`৳${data.totalCurrentValue.toLocaleString()}`}
        />
        <Card
          label="Today's P/L"
          value={`${isPLPositive ? "+" : ""}৳${data.todaysPL.toLocaleString()} (${
            isPLPositive ? "+" : ""
          }${data.todaysPLPercent}%)`}
          colorClass={isPLPositive ? "text-green-600" : "text-red-600"}
        />
        <Card
          label="Unrealized P/L"
          value={`${isUnrealizedPositive ? "+" : ""}৳${data.totalUnrealizedPL.toLocaleString()} (${
            isUnrealizedPositive ? "+" : ""
          }${data.totalUnrealizedPLPercent}%)`}
          colorClass={isUnrealizedPositive ? "text-green-600" : "text-red-600"}
        />
        <Card label="Holdings" value={String(data.holdingsCount)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MoverCard title="Top Gainer Today" mover={data.topGainer} positive />
        <MoverCard
          title="Top Loser Today"
          mover={data.topLoser}
          positive={false}
        />
      </div>

      <div className="border rounded-lg p-4">
        <Link href="/portfolio" className="text-sm underline">
          View full portfolio →
        </Link>
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: string;
  colorClass?: string;
}) {
  return (
    <div className="border rounded-lg p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-semibold ${colorClass || ""}`}>{value}</p>
    </div>
  );
}

function MoverCard({
  title,
  mover,
  positive,
}: {
  title: string;
  mover: Mover | null;
  positive: boolean;
}) {
  return (
    <div className="border rounded-lg p-4">
      <p className="text-xs text-gray-500 mb-2">{title}</p>
      {mover ? (
        <div className="flex justify-between items-center">
          <span className="font-medium">{mover.tradingCode}</span>
          <span className={positive ? "text-green-600" : "text-red-600"}>
            {mover.changePercent >= 0 ? "+" : ""}
            {mover.changePercent}% (৳{mover.currentPrice})
          </span>
        </div>
      ) : (
        <p className="text-gray-400 text-sm">—</p>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-20 bg-gray-100 rounded-lg" />
        <div className="h-20 bg-gray-100 rounded-lg" />
      </div>
    </div>
  );
}
