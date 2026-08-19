"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Holding {
  tradingCode: string;
  sector: string;
  totalInvested: number;
}

interface SectorSummary {
  sector: string;
  stockCount: number;
  tradingCodes: string[];
  invested: number;
  percent: number;
}

const COLORS = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#ea580c",
  "#9333ea",
  "#0891b2",
  "#ca8a04",
  "#db2777",
  "#4f46e5",
  "#059669",
  "#b91c1c",
  "#7c3aed",
  "#0d9488",
  "#c2410c",
  "#be185d",
];

function computeSectorSummary(holdings: Holding[]): SectorSummary[] {
  const grandTotal = holdings.reduce((sum, h) => sum + h.totalInvested, 0);

  const bySector = new Map<
    string,
    { invested: number; count: number; tradingCodes: string[] }
  >();
  for (const h of holdings) {
    const existing = bySector.get(h.sector) ?? {
      invested: 0,
      count: 0,
      tradingCodes: [],
    };
    existing.invested += h.totalInvested;
    existing.count += 1;
    existing.tradingCodes.push(h.tradingCode);
    bySector.set(h.sector, existing);
  }

  return [...bySector.entries()]
    .map(([sector, { invested, count, tradingCodes }]) => ({
      sector,
      stockCount: count,
      tradingCodes,
      invested,
      percent: grandTotal > 0 ? (invested / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.invested - a.invested);
}

export default function SectorBreakdown({ holdings }: { holdings: Holding[] }) {
  if (holdings.length === 0) return null;

  const data = computeSectorSummary(holdings);

  return (
    <div className="border rounded-lg p-4 mb-6">
      <h2 className="text-lg font-medium mb-4">Sector Allocation</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="invested"
                nameKey="sector"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, _name, props) => {
                  const numValue =
                    typeof value === "number" ? value : Number(value);
                  const payload = props?.payload as
                    | { sector?: string; percent?: number }
                    | undefined;
                  const percent = payload?.percent ?? 0;
                  const sector = payload?.sector ?? "";
                  return [
                    `৳${numValue.toLocaleString()} (${percent.toFixed(1)}%)`,
                    sector,
                  ];
                }}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                wrapperStyle={{ fontSize: "12px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b">
              <tr>
                <th className="py-2">Sector</th>
                <th className="py-2">Stocks</th>
                <th className="py-2">Investment</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={row.sector} className="border-b last:border-0">
                  <td className="py-2 align-top">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      {row.sector}
                    </span>
                  </td>
                  <td className="py-2 align-top text-gray-500">
                    {row.tradingCodes.join(", ")}
                  </td>
                  <td className="py-2 align-top">
                    <div>৳{row.invested.toLocaleString()}</div>
                    <div className="text-xs text-gray-400">
                      {row.percent.toFixed(1)}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
