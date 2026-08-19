"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import AddTransactionForm from "./AddTransactionForm";
import HoldingsTable from "./HoldingsTable";
import SectorBreakdown from "./SectorBreakdown";

interface Holding {
  tradingCode: string;
  sector: string;
  quantity: number;
  avgCost: number;
  totalInvested: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  realizedPL: number;
  priceUpdatedAt: string | null;
}

interface Summary {
  totalInvested: number;
  totalCurrentValue: number;
  totalUnrealizedPL: number;
  totalUnrealizedPLPercent: number;
  totalRealizedPL: number;
  totalPL: number;
}

interface PortfolioResponse {
  ok: boolean;
  holdings: Holding[];
  summary: Summary;
}

async function fetchPortfolio(): Promise<PortfolioResponse> {
  const res = await fetch("/api/portfolio");
  if (!res.ok) throw new Error("Failed to load portfolio");
  return res.json();
}

export default function PortfolioView() {
  const [showAddForm, setShowAddForm] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["portfolio"],
    queryFn: fetchPortfolio,
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return <PortfolioSkeleton />;
  }

  if (isError || !data?.ok) {
    return (
      <p className="text-red-500">
        Failed to load your portfolio. Please refresh.
      </p>
    );
  }

  const { holdings, summary } = data;

  return (
    <div>
      <SummaryCards summary={summary} />

      <div className="mt-6">
        <SectorBreakdown holdings={holdings} />
      </div>

      <div className="flex justify-between items-center my-6">
        <h2 className="text-lg font-medium">Holdings</h2>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="bg-black text-white rounded px-4 py-2 text-sm"
        >
          {showAddForm ? "Cancel" : "+ Add Transaction"}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6">
          <AddTransactionForm
            onSuccess={() => {
              setShowAddForm(false);
              queryClient.invalidateQueries({ queryKey: ["portfolio"] });
            }}
          />
        </div>
      )}

      {holdings.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No holdings yet — add your first transaction to get started.
        </p>
      ) : (
        <HoldingsTable holdings={holdings} />
      )}
    </div>
  );
}

function SummaryCards({ summary }: { summary: Summary }) {
  const cards = [
    { label: "Total Invested", value: summary.totalInvested },
    { label: "Current Value", value: summary.totalCurrentValue },
    {
      label: "Unrealized P/L",
      value: summary.totalUnrealizedPL,
      percent: summary.totalUnrealizedPLPercent,
      colored: true,
    },
    {
      label: "Total P/L (incl. realized)",
      value: summary.totalPL,
      colored: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="border rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">{c.label}</p>
          <p
            className={`text-lg font-semibold ${
              c.colored
                ? c.value >= 0
                  ? "text-green-600"
                  : "text-red-600"
                : ""
            }`}
          >
            ৳{c.value.toLocaleString()}
            {c.percent !== undefined && (
              <span className="text-sm ml-1">
                ({c.percent >= 0 ? "+" : ""}
                {c.percent}%)
              </span>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}

function PortfolioSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-lg" />
        ))}
      </div>
      <div className="h-64 bg-gray-100 rounded-lg" />
    </div>
  );
}
