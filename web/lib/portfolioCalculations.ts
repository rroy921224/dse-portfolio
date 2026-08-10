export interface TransactionLike {
  tradingCode: string;
  type: "buy" | "sell";
  quantity: number;
  price: number;
  commissionPercent?: number;
  date: Date | string;
}

export interface Holding {
  tradingCode: string;
  quantity: number;
  avgCost: number;
  totalInvested: number;
  realizedPL: number;
}

/**
 * Replays a user's transactions in chronological order to derive current
 * holdings, using WEIGHTED-AVERAGE cost basis (not FIFO — see project notes
 * on why weighted-average was chosen for v1).
 *
 * Broker commission is folded directly into the EFFECTIVE price used for
 * every calculation:
 *   - Buy:  effectivePrice = price * (1 + commissionPercent / 100)  → raises cost
 *   - Sell: effectivePrice = price * (1 - commissionPercent / 100)  → lowers proceeds
 * This means avgCost, totalInvested, and realizedPL are all commission-
 * inclusive automatically, without needing separate commission bookkeeping
 * at every call site.
 *
 * Buy: blends the new purchase into the running average cost.
 * Sell: realizes P/L against the CURRENT average cost, reduces quantity,
 *       but does NOT change avgCost (weighted-average method).
 *
 * Returns a Map keyed by tradingCode. A holding with quantity === 0 means
 * it was fully sold off at some point — still useful for realizedPL history.
 */
export function computeHoldings(
  transactions: TransactionLike[],
): Map<string, Holding> {
  const holdings = new Map<string, Holding>();

  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  for (const tx of sorted) {
    const code = tx.tradingCode;
    // Missing commissionPercent (e.g. transactions recorded before this
    // field existed) is treated as 0%, not an error.
    const commissionPercent = tx.commissionPercent ?? 0;

    let holding = holdings.get(code);

    if (!holding) {
      holding = {
        tradingCode: code,
        quantity: 0,
        avgCost: 0,
        totalInvested: 0,
        realizedPL: 0,
      };
      holdings.set(code, holding);
    }

    if (tx.type === "buy") {
      const effectivePrice = tx.price * (1 + commissionPercent / 100);
      const newTotalInvested =
        holding.totalInvested + tx.quantity * effectivePrice;
      const newQuantity = holding.quantity + tx.quantity;
      holding.avgCost = newQuantity > 0 ? newTotalInvested / newQuantity : 0;
      holding.quantity = newQuantity;
      holding.totalInvested = newTotalInvested;
    } else {
      // sell — clamp to available quantity as a safety net against bad data
      // (the API route should already prevent over-selling before this runs)
      const sellQty = Math.min(tx.quantity, holding.quantity);
      const effectiveSellPrice = tx.price * (1 - commissionPercent / 100);
      const realizedForThisSale =
        (effectiveSellPrice - holding.avgCost) * sellQty;

      holding.realizedPL += realizedForThisSale;
      holding.quantity -= sellQty;
      // avgCost is unchanged (weighted-average method) — invested amount
      // shrinks proportionally to the remaining quantity.
      holding.totalInvested = holding.quantity * holding.avgCost;
    }
  }

  return holdings;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
