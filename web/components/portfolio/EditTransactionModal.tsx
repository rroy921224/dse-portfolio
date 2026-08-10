"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface Transaction {
  _id: string;
  type: "buy" | "sell";
  quantity: number;
  price: number;
  commissionPercent?: number;
  date: string;
  notes?: string;
}

export default function EditTransactionModal({
  transaction,
  tradingCode,
  onClose,
}: {
  transaction: Transaction;
  tradingCode: string;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState(String(transaction.quantity));
  const [price, setPrice] = useState(String(transaction.price));
  const [commissionPercent, setCommissionPercent] = useState(
    String(transaction.commissionPercent ?? 0),
  );
  const [date, setDate] = useState(transaction.date.slice(0, 10));
  const [notes, setNotes] = useState(transaction.notes || "");
  const [error, setError] = useState("");

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/portfolio/${transaction._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: Number(quantity),
          price: Number(price),
          commissionPercent: Number(commissionPercent) || 0,
          date,
          notes,
        }),
      });
      const data = await res.json();
      if (!data.ok)
        throw new Error(data.error || "Failed to update transaction");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({
        queryKey: ["transactions", tradingCode],
      });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!quantity || Number(quantity) <= 0) {
      setError("Enter a valid quantity.");
      return;
    }
    if (!price || Number(price) < 0) {
      setError("Enter a valid price.");
      return;
    }

    mutation.mutate();
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg p-6 w-full max-w-sm"
      >
        <h3 className="text-lg font-semibold mb-4">
          Edit {transaction.type === "buy" ? "Buy" : "Sell"} — {tradingCode}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full border rounded px-3 py-2"
              min={1}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Price per share</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full border rounded px-3 py-2"
              step="0.01"
              min={0}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">
              Broker commission (%)
            </label>
            <input
              type="number"
              value={commissionPercent}
              onChange={(e) => setCommissionPercent(e.target.value)}
              className="w-full border rounded px-3 py-2"
              step="0.01"
              min={0}
              max={5}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border rounded py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 bg-black text-white rounded py-2 text-sm disabled:opacity-50"
            >
              {mutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
