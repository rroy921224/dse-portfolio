"use client";

import { useState, type FormEvent } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";

interface Company {
  tradingCode: string;
  name: string;
  sector: string;
}

async function fetchCompanies(search: string): Promise<Company[]> {
  const res = await fetch(
    `/api/companies?search=${encodeURIComponent(search)}&limit=20`,
  );
  const data = await res.json();
  return data.companies || [];
}

export default function AddTransactionForm({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const [tradingCode, setTradingCode] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("0.35");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");

  const { data: companies } = useQuery({
    queryKey: ["companies-search", search],
    queryFn: () => fetchCompanies(search),
    enabled: search.length > 0,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tradingCode,
          type,
          quantity: Number(quantity),
          price: Number(price),
          commissionPercent: Number(commissionPercent) || 0,
          date,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to save transaction");
      return data;
    },
    onSuccess: () => onSuccess(),
    onError: (err: Error) => setError(err.message),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!tradingCode) {
      setError("Please select a stock.");
      return;
    }
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
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-3">
      <div className="relative">
        <input
          type="text"
          placeholder="Search stock (e.g. ACIFORMULA)"
          value={tradingCode || search}
          onChange={(e) => {
            setSearch(e.target.value);
            setTradingCode("");
          }}
          className="w-full border rounded px-3 py-2"
        />
        {search && !tradingCode && companies && companies.length > 0 && (
          <ul className="absolute z-10 bg-white border rounded w-full mt-1 max-h-48 overflow-auto shadow-lg">
            {companies.map((c) => (
              <li
                key={c.tradingCode}
                onClick={() => {
                  setTradingCode(c.tradingCode);
                  setSearch("");
                }}
                className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
              >
                <span className="font-medium">{c.tradingCode}</span>{" "}
                <span className="text-gray-400">({c.sector})</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-3">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as "buy" | "sell")}
          className="border rounded px-3 py-2"
        >
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
        <input
          type="number"
          placeholder="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="border rounded px-3 py-2 flex-1"
          min={1}
        />
        <input
          type="number"
          placeholder="Price per share"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="border rounded px-3 py-2 flex-1"
          step="0.01"
          min={0}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border rounded px-3 py-2"
        />
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-500 flex items-center gap-2">
          Broker commission
          <input
            type="number"
            value={commissionPercent}
            onChange={(e) => setCommissionPercent(e.target.value)}
            className="border rounded px-2 py-1 w-20 text-sm"
            step="0.01"
            min={0}
            max={5}
          />
          %
        </label>

        {price && quantity && (
          <p className="text-xs text-gray-400">
            Effective {type === "buy" ? "cost" : "proceeds"} per share: ৳
            {(
              Number(price) *
              (type === "buy"
                ? 1 + Number(commissionPercent || 0) / 100
                : 1 - Number(commissionPercent || 0) / 100)
            ).toFixed(2)}
          </p>
        )}
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="bg-black text-white rounded px-4 py-2 text-sm disabled:opacity-50"
      >
        {mutation.isPending ? "Saving..." : "Save Transaction"}
      </button>
    </form>
  );
}
