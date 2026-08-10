"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Company {
  tradingCode: string;
  name: string;
  sector: string;
}

const SECTORS = [
  "Bank",
  "Cement",
  "Ceramics",
  "Engineering",
  "Financial Institutions",
  "Food&Allied",
  "ITSector",
  "Insurance",
  "Jute",
  "Miscellaneous",
  "MutualFunds",
  "PaperPrint",
  "Pharmaceuticals&Chemicals",
  "Power&Fuel",
  "Services & Real Estate",
  "Tannery Industries",
  "Telecommunication",
  "Textile",
  "Travel&Lesiure",
];

async function fetchCompanies(
  search: string,
  sector: string,
): Promise<Company[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (sector) params.set("sector", sector);
  params.set("limit", "30");

  const res = await fetch(`/api/companies?${params.toString()}`);
  const data = await res.json();
  return data.companies || [];
}

export default function AddStockPanel({
  watchlistCodes,
}: {
  watchlistCodes: Set<string>;
}) {
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("");
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: companies, isLoading } = useQuery({
    queryKey: ["companies-browse", search, sector],
    queryFn: () => fetchCompanies(search, sector),
    enabled: open,
  });

  const addMutation = useMutation({
    mutationFn: async (tradingCode: string) => {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradingCode }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });

  return (
    <div className="border rounded-lg p-4 mb-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-medium flex items-center gap-2"
      >
        {open ? "▲" : "▼"} Browse &amp; Add Stocks
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Search by name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border rounded px-3 py-2 flex-1 text-sm"
            />
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="">All Sectors</option>
              {SECTORS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-64 overflow-y-auto border rounded divide-y">
            {isLoading ? (
              <p className="text-gray-400 text-sm p-3">Loading...</p>
            ) : companies && companies.length > 0 ? (
              companies.map((c) => {
                const alreadyAdded = watchlistCodes.has(c.tradingCode);
                return (
                  <div
                    key={c.tradingCode}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium">{c.tradingCode}</span>{" "}
                      <span className="text-gray-400">({c.sector})</span>
                    </div>
                    <button
                      onClick={() => addMutation.mutate(c.tradingCode)}
                      disabled={alreadyAdded || addMutation.isPending}
                      className={`text-xs px-3 py-1 rounded ${
                        alreadyAdded
                          ? "bg-gray-100 text-gray-400"
                          : "bg-black text-white hover:bg-gray-800"
                      }`}
                    >
                      {alreadyAdded ? "Added" : "+ Add"}
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-400 text-sm p-3">
                {search || sector
                  ? "No matches found."
                  : "Start typing to search."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
