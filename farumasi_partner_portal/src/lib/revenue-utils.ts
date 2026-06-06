import type { DateRangeValue } from "@/components/shared/date-range-filter";
import { getDateRangeStart } from "@/components/shared/date-range-filter";
import type { BackendRevenueRecord, BackendRevenueSummary } from "@/lib/services/revenue.service";
import { useLayoutDataStore } from "@/lib/store/layout-data";
import type { ChartDataPoint } from "@/types";

export const MIN_WITHDRAWAL_AMOUNT = 1000;

/** Inline validation for the withdrawal amount field (net balance, no extra fees). */
export function validateWithdrawAmount(
  raw: string,
  availableBalance: number,
  minAmount: number = MIN_WITHDRAWAL_AMOUNT,
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return "Enter an amount";

  const num = Number(trimmed);
  if (!Number.isFinite(num)) return "Enter a valid number";
  if (!Number.isInteger(num)) return "Use whole RWF amounts only (no decimals)";
  if (num <= 0) return "Amount must be greater than zero";
  if (num < minAmount) {
    return `Minimum withdrawal is RWF ${minAmount.toLocaleString()}`;
  }
  const max = Math.floor(availableBalance);
  if (num > max) {
    return max <= 0
      ? "No net balance available to withdraw"
      : `Amount exceeds available net balance (max ${max.toLocaleString()} RWF)`;
  }
  return null;
}

/** Push wallet balances into the shared topbar store. */
export function syncWalletToLayout(summary: BackendRevenueSummary): void {
  useLayoutDataStore.setState({
    availableBalance: summary.available_balance,
    pendingBalance: summary.pending_balance,
  });
}

export function filterByDateRange<T extends { created_at: string }>(
  rows: T[],
  range: DateRangeValue,
): T[] {
  const start = getDateRangeStart(range).getTime();
  return rows.filter((row) => new Date(row.created_at).getTime() >= start);
}

/** Build chronologically sorted chart points (net earnings + commission). */
export function buildRevenueChartData(
  transactions: BackendRevenueRecord[],
  range: DateRangeValue,
): ChartDataPoint[] {
  const filtered = filterByDateRange(transactions, range);
  const rows: { label: string; value: number; secondary: number; sortKey: number }[] = [];
  const index = new Map<string, number>();

  for (const tx of filtered) {
    const d = new Date(tx.created_at);
    let label: string;
    let sortKey: number;

    if (range === "today" || range === "week" || range === "14d") {
      label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      sortKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    } else if (range === "month") {
      label = `${d.toLocaleDateString("en-US", { month: "short" })} ${d.getDate()}`;
      sortKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    } else {
      label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      sortKey = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    }

    const key = String(sortKey);
    if (!index.has(key)) {
      index.set(key, rows.length);
      rows.push({ label, value: 0, secondary: 0, sortKey });
    }
    const i = index.get(key)!;
    rows[i].value += tx.net_amount;
    rows[i].secondary += tx.platform_commission;
  }

  return rows
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ label, value, secondary }) => ({ label, value, secondary }));
}

export const settlementStatusConfig: Record<string, { label: string; color: string }> = {
  available: { label: "Available", color: "bg-green-100 text-green-700 border-green-200" },
  settled: { label: "Available", color: "bg-green-100 text-green-700 border-green-200" },
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700 border-amber-200" },
  withdrawn: { label: "Withdrawn", color: "bg-slate-100 text-slate-600 border-slate-200" },
  reversed: { label: "Reversed", color: "bg-red-100 text-red-700 border-red-200" },
};
