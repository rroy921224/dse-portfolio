"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AddStockPanel from "./AddStockPanel";
import StockCard from "./StockCard";
import { isMarketOpen } from "@/lib/marketHours";

interface WatchlistEntry {
  tradingCode: string;
  company: { sector?: string; name?: string } | null;
  price: {
    ltp: number;
    change: number;
    changePercent: number;
    scrapedAt?: string | null;
  } | null;
}

interface WatchlistResponse {
  ok: boolean;
  watchlist: WatchlistEntry[];
}

interface Holding {
  tradingCode: string;
  quantity: number;
  avgCost: number;
}

interface PortfolioResponse {
  ok: boolean;
  holdings: Holding[];
}

async function fetchWatchlist(): Promise<WatchlistResponse> {
  const res = await fetch("/api/watchlist");
  if (!res.ok) throw new Error("Failed to load watchlist");
  return res.json();
}

async function fetchPortfolio(): Promise<PortfolioResponse> {
  const res = await fetch("/api/portfolio");
  if (!res.ok) throw new Error("Failed to load portfolio");
  return res.json();
}

const REFRESH_OPTIONS = [
  { label: "Off", value: null },
  { label: "5s", value: 5_000 },
  { label: "15s", value: 15_000 },
  { label: "30s", value: 30_000 },
  { label: "60s", value: 60_000 },
];

export default function ScreenerView() {
  const [intervalMs, setIntervalMs] = useState<number | null>(30_000);
  const marketOpen = isMarketOpen();

  const watchlistQuery = useQuery({
    queryKey: ["watchlist"],
    queryFn: fetchWatchlist,
    refetchInterval: intervalMs ?? false,
  });

  const portfolioQuery = useQuery({
    queryKey: ["portfolio-for-screener"],
    queryFn: fetchPortfolio,
  });

  const holdingsMap = new Map<string, Holding>(
    (portfolioQuery.data?.holdings ?? []).map((h) => [h.tradingCode, h]),
  );

  const watchlistCodes = new Set(
    (watchlistQuery.data?.watchlist ?? []).map((w) => w.tradingCode),
  );

  function handleManualRefresh() {
    watchlistQuery.refetch();
    portfolioQuery.refetch();
  }

  return (
    <div>
      {!marketOpen && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-2 mb-4">
          Market is currently closed (DSE trades Sun–Thu, 10:00am–2:30pm BD
          time). Prices below are from the last available scrape, not live.
        </div>
      )}

      <AddStockPanel watchlistCodes={watchlistCodes} />

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">
          Your Watchlist ({watchlistQuery.data?.watchlist.length ?? 0})
        </h2>

        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-500">
            Refresh:
            <select
              value={intervalMs ?? "off"}
              onChange={(e) =>
                setIntervalMs(
                  e.target.value === "off" ? null : Number(e.target.value),
                )
              }
              className="border rounded px-2 py-1 ml-2 text-sm"
            >
              {REFRESH_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.value ?? "off"}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={handleManualRefresh}
            disabled={watchlistQuery.isFetching}
            title="Refresh now"
            className="border rounded px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {watchlistQuery.isFetching ? "⟳ Refreshing..." : "⟳ Refresh"}
          </button>
        </div>
      </div>

      {watchlistQuery.isLoading ? (
        <GridSkeleton />
      ) : watchlistQuery.isError ? (
        <p className="text-red-500 text-sm">Failed to load your watchlist.</p>
      ) : watchlistQuery.data!.watchlist.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No stocks in your screener yet — use &quot;Browse &amp; Add
          Stocks&quot; above to get started.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {watchlistQuery.data!.watchlist.map((w) => (
            <StockCard
              key={w.tradingCode}
              tradingCode={w.tradingCode}
              sector={w.company?.sector}
              price={w.price}
              holding={holdingsMap.get(w.tradingCode) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-32 bg-gray-100 rounded-lg" />
      ))}
    </div>
  );
}
