"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import EditTransactionModal from "./EditTransactionModal";
import AverageCalculatorModal from "@/components/shared/AverageCalculatorModal";

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

interface Transaction {
  _id: string;
  type: "buy" | "sell";
  quantity: number;
  price: number;
  commissionPercent?: number;
  date: string;
  notes?: string;
}

async function fetchTransactions(code: string): Promise<Transaction[]> {
  const res = await fetch(`/api/portfolio/transactions?code=${code}`);
  const data = await res.json();
  return data.transactions || [];
}

export default function HoldingsTable({ holdings }: { holdings: Holding[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="border rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-500">
          <tr>
            <th className="px-4 py-2">Stock</th>
            <th className="px-4 py-2">Qty</th>
            <th className="px-4 py-2">Avg Cost</th>
            <th className="px-4 py-2">Invested</th>
            <th className="px-4 py-2">Current Price</th>
            <th className="px-4 py-2">Current Value</th>
            <th className="px-4 py-2">P/L</th>
            <th className="px-4 py-2"></th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => (
            <HoldingRow
              key={h.tradingCode}
              holding={h}
              expanded={expanded === h.tradingCode}
              onToggle={() =>
                setExpanded(expanded === h.tradingCode ? null : h.tradingCode)
              }
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HoldingRow({
  holding,
  expanded,
  onToggle,
}: {
  holding: Holding;
  expanded: boolean;
  onToggle: () => void;
}) {
  const queryClient = useQueryClient();
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions", holding.tradingCode],
    queryFn: () => fetchTransactions(holding.tradingCode),
    enabled: expanded,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/portfolio/${id}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({
        queryKey: ["transactions", holding.tradingCode],
      });
    },
  });

  const isProfit = holding.unrealizedPL >= 0;

  return (
    <>
      <tr
        onClick={onToggle}
        className="border-t cursor-pointer hover:bg-gray-50"
      >
        <td className="px-4 py-3 font-medium">{holding.tradingCode}</td>
        <td className="px-4 py-3">{holding.quantity}</td>
        <td className="px-4 py-3">৳{holding.avgCost.toLocaleString()}</td>
        <td className="px-4 py-3">৳{holding.totalInvested.toLocaleString()}</td>
        <td className="px-4 py-3">৳{holding.currentPrice.toLocaleString()}</td>
        <td className="px-4 py-3">৳{holding.currentValue.toLocaleString()}</td>
        <td
          className={`px-4 py-3 ${isProfit ? "text-green-600" : "text-red-600"}`}
        >
          {isProfit ? "+" : ""}৳{holding.unrealizedPL.toLocaleString()} (
          {holding.unrealizedPLPercent}%)
        </td>
        <td className="px-4 py-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowCalculator(true);
            }}
            title="Average Calculator"
            className="text-gray-400 hover:text-black"
          >
            🧮
          </button>
        </td>
        <td className="px-4 py-3 text-gray-400">{expanded ? "▲" : "▼"}</td>
      </tr>

      {expanded && (
        <tr className="border-t bg-gray-50">
          <td colSpan={9} className="px-4 py-3">
            {isLoading ? (
              <p className="text-gray-400 text-xs">Loading history...</p>
            ) : transactions && transactions.length > 0 ? (
              <table className="w-full text-xs">
                <thead className="text-gray-500">
                  <tr>
                    <th className="text-left py-1">Date</th>
                    <th className="text-left py-1">Type</th>
                    <th className="text-left py-1">Qty</th>
                    <th className="text-left py-1">Price</th>
                    <th className="text-left py-1">Commission</th>
                    <th className="text-left py-1">P/L</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => {
                    const effectivePrice =
                      t.type === "buy"
                        ? t.price * (1 + (t.commissionPercent ?? 0) / 100)
                        : t.price * (1 - (t.commissionPercent ?? 0) / 100);
                    const pl =
                      (holding.currentPrice - effectivePrice) * t.quantity;
                    const isPlProfit = pl >= 0;
                    const caption =
                      t.type === "buy"
                        ? "if held today"
                        : "vs. holding instead";

                    return (
                      <tr key={t._id} className="border-t">
                        <td className="py-1">
                          {new Date(t.date).toLocaleDateString()}
                        </td>
                        <td className="py-1 capitalize">{t.type}</td>
                        <td className="py-1">{t.quantity}</td>
                        <td className="py-1">৳{t.price}</td>
                        <td className="py-1 text-gray-500">
                          {t.commissionPercent ?? 0}%
                        </td>
                        <td className="py-1">
                          <div
                            className={
                              isPlProfit ? "text-green-600" : "text-red-600"
                            }
                          >
                            {isPlProfit ? "+" : ""}৳{pl.toFixed(2)}
                          </div>
                          <div className="text-gray-400 text-[10px]">
                            {caption}
                          </div>
                        </td>
                        <td className="py-1 text-right space-x-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTransaction(t);
                            }}
                            className="text-blue-500 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMutation.mutate(t._id);
                            }}
                            className="text-red-500 hover:underline"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-400 text-xs">No transactions.</p>
            )}
          </td>
        </tr>
      )}

      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          tradingCode={holding.tradingCode}
          onClose={() => setEditingTransaction(null)}
        />
      )}

      {showCalculator && (
        <AverageCalculatorModal
          tradingCode={holding.tradingCode}
          currentPrice={holding.currentPrice}
          holding={{ quantity: holding.quantity, avgCost: holding.avgCost }}
          onClose={() => setShowCalculator(false)}
        />
      )}
    </>
  );
}
