"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatRWF, formatDate } from "@/lib/utils";
import { getApiError } from "@/lib/services/auth.service";
import {
  analyticsService,
  type PaymentTransactionRow,
} from "@/lib/services/analytics.service";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  PageHeader,
  Badge,
  Table,
  Thead,
  Th,
  Td,
  Tr,
  EmptyState,
  ErrorBanner,
} from "@/components/ui";
import { Banknote, RefreshCw } from "lucide-react";

const METHOD_LABELS: Record<string, string> = {
  manual_momo: "MoMo Pay Code",
  mtn_momo: "MTN MoMo",
  card: "Card (Pesapal)",
  none: "Zero / waived",
};

const STATUS_FILTERS = ["All", "successful", "awaiting_review", "pending", "failed", "rejected"] as const;
const METHOD_FILTERS = ["All", "manual_momo", "mtn_momo", "card"] as const;

function methodLabel(method: string): string {
  return METHOD_LABELS[method] ?? method.replace(/_/g, " ");
}

function statusVariant(status: string): "success" | "warning" | "neutral" {
  if (status === "successful") return "success";
  if (status === "awaiting_review" || status === "pending") return "warning";
  return "neutral";
}

export default function FinancePaymentsPage() {
  const [items, setItems] = useState<PaymentTransactionRow[]>([]);
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("All");
  const [method, setMethod] = useState<(typeof METHOD_FILTERS)[number]>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    analyticsService
      .getPaymentTransactions({
        status: status === "All" ? undefined : status,
        method: method === "All" ? undefined : method,
        limit: 150,
      })
      .then(setItems)
      .catch((err) => setError(getApiError(err, "Failed to load payment transactions")))
      .finally(() => setLoading(false));
  }, [status, method]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const successful = items.filter((t) => t.status === "successful");
    return {
      count: successful.length,
      amount: successful.reduce((sum, t) => sum + t.amount, 0),
    };
  }, [items]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payment Transactions"
        subtitle="All collected patient payments — MTN MoMo, card, and approved MoMo Pay Code"
        breadcrumb="Finance"
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                status === s
                  ? "bg-farumasi-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-farumasi-300"
              }`}
            >
              {s === "All" ? "All statuses" : s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 ml-auto">
          {METHOD_FILTERS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                method === m
                  ? "bg-violet-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-violet-300"
              }`}
            >
              {m === "All" ? "All methods" : methodLabel(m)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {status === "All" && method === "All" && items.length > 0 && (
        <Card className="border-violet-200 bg-violet-50/40">
          <CardContent className="py-3 flex flex-wrap gap-6 text-sm">
            <p className="text-violet-900">
              <Banknote className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              <strong>{totals.count}</strong> successful in view ·{" "}
              <strong>{formatRWF(totals.amount)}</strong> collected
            </p>
            <p className="text-xs text-violet-700">
              Approved manual MoMo payments appear here with status <em>successful</em> and method{" "}
              <em>MoMo Pay Code</em> — same ledger as MTN and card.
            </p>
          </CardContent>
        </Card>
      )}

      {loading && items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-500">Loading transactions…</CardContent>
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Banknote}
          title="No payment transactions"
          description="Patient payments will appear here once submitted or approved."
        />
      ) : (
        <Card>
          <Table>
            <Thead>
              <Tr>
                <Th>Order</Th>
                <Th>Patient</Th>
                <Th>Method</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
                <Th>Paid / reviewed</Th>
                <Th>Reference</Th>
              </Tr>
            </Thead>
            <tbody>
              {items.map((txn) => (
                <Tr key={txn.id}>
                  <Td>
                    <p className="font-semibold text-sm">{txn.order_code ?? txn.order_id.slice(0, 8)}</p>
                  </Td>
                  <Td>
                    <p className="text-sm">{txn.patient_name ?? "—"}</p>
                    <p className="text-[10px] text-slate-400">{txn.patient_email}</p>
                  </Td>
                  <Td>
                    <span className="text-xs font-medium text-slate-700">{methodLabel(txn.method)}</span>
                  </Td>
                  <Td className="font-semibold">{formatRWF(txn.amount)}</Td>
                  <Td>
                    <Badge variant={statusVariant(txn.status)}>{txn.status.replace(/_/g, " ")}</Badge>
                  </Td>
                  <Td className="text-xs text-slate-500">
                    {txn.paid_at
                      ? formatDate(txn.paid_at)
                      : txn.reviewed_at
                        ? formatDate(txn.reviewed_at)
                        : txn.created_at
                          ? formatDate(txn.created_at)
                          : "—"}
                  </Td>
                  <Td className="text-[10px] text-slate-500 font-mono max-w-[120px] truncate">
                    {txn.confirmed_momo_transaction_id ?? "—"}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
