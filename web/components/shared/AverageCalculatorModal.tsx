"use client";

import { useState, useMemo } from "react";

interface HoldingData {
  quantity: number;
  avgCost: number;
}

export default function AverageCalculatorModal({
  tradingCode,
  currentPrice,
  holding,
  onClose,
}: {
  tradingCode: string;
  currentPrice: number;
  holding: HoldingData | null;
  onClose: () => void;
}) {
  const [currentQty, setCurrentQty] = useState(String(holding?.quantity ?? 0));
  const [currentAvgPrice, setCurrentAvgPrice] = useState(
    String(holding?.avgCost ?? 0),
  );
  const [newQty, setNewQty] = useState("");
  const [newPrice, setNewPrice] = useState(String(currentPrice || ""));
  const [commissionPercent, setCommissionPercent] = useState("0.35");

  const result = useMemo(() => {
    const cQty = Number(currentQty) || 0;
    const cAvg = Number(currentAvgPrice) || 0;
    const nQty = Number(newQty) || 0;
    const nPrice = Number(newPrice) || 0;
    const commission = Number(commissionPercent) || 0;

    const effectiveNewPrice = nPrice * (1 + commission / 100);
    const currentInvested = cQty * cAvg;
    const newInvestment = nQty * effectiveNewPrice;
    const totalQty = cQty + nQty;
    const totalInvested = currentInvested + newInvestment;
    const newAvgPrice = totalQty > 0 ? totalInvested / totalQty : 0;

    return {
      effectiveNewPrice,
      totalQty,
      totalInvested,
      newAvgPrice,
      hasInput: nQty > 0 && nPrice > 0,
    };
  }, [currentQty, currentAvgPrice, newQty, newPrice, commissionPercent]);

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg p-6 w-full max-w-md"
      >
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold">
            Average Calculator — {tradingCode}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-black">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">
              Current Position
            </p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500">Qty</label>
                <input
                  type="number"
                  value={currentQty}
                  onChange={(e) => setCurrentQty(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  min={0}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500">Avg Price</label>
                <input
                  type="number"
                  value={currentAvgPrice}
                  onChange={(e) => setCurrentAvgPrice(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  step="0.01"
                  min={0}
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">
              New Purchase
            </p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500">Qty</label>
                <input
                  type="number"
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g. 500"
                  min={0}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500">Price</label>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  step="0.01"
                  min={0}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 flex items-center gap-2">
              Broker commission
              <input
                type="number"
                value={commissionPercent}
                onChange={(e) => setCommissionPercent(e.target.value)}
                className="border rounded px-2 py-1 w-20 text-sm"
                step="0.01"
                min={0}
              />
              %
            </label>
          </div>

          <div className="border-t pt-4">
            {result.hasInput ? (
              <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">New total quantity</span>
                  <span className="font-medium">
                    {result.totalQty.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">New total invested</span>
                  <span className="font-medium">
                    ৳{result.totalInvested.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-base pt-2 border-t mt-2">
                  <span className="font-medium">New average price</span>
                  <span className="font-bold text-blue-600">
                    ৳{result.newAvgPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-4">
                Enter a quantity and price above to calculate.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
