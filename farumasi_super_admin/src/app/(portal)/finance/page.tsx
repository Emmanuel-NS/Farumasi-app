"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatRWF } from "@/lib/utils";
import { PageHeader, StatCard, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { DollarSign, TrendingUp, ArrowDownToLine, Receipt, ChevronRight, Banknote } from "lucide-react";
import { revenueService, type RevenueSummary } from "@/lib/services/revenue.service";
import { withdrawalsService } from "@/lib/services/withdrawals.service";
import { manualPaymentsService } from "@/lib/services/manual-payments.service";
import { analyticsService, type PaymentAnalyticsSummary } from "@/lib/services/analytics.service";
import { SafeChartContainer } from "@/components/charts/SafeChartContainer";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

const METHOD_COLORS: Record<string, string> = {
  manual_momo: "#7c3aed",
  mtn_momo: "#f59e0b",
  card: "#2563eb",
  none: "#94a3b8",
};

export default function FinanceOverviewPage() {
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [payments, setPayments] = useState<PaymentAnalyticsSummary | null>(null);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [pendingManualPayments, setPendingManualPayments] = useState(0);

  useEffect(() => {
    revenueService.getSummary().then(setSummary).catch(() => {});
    analyticsService.getPaymentSummary().then(setPayments).catch(() => {});
    withdrawalsService
      .getWithdrawals()
      .then((list) => {
        const pending = list.filter((w) => w.status === "Pending" || w.status === "Under Review");
        setPendingWithdrawals(pending.length);
        setPendingAmount(pending.reduce((a, w) => a + w.amount, 0));
      })
      .catch(() => {});
    manualPaymentsService.pendingCount().then(setPendingManualPayments).catch(() => {});
  }, []);

  const paymentChart = (payments?.by_method ?? []).map((m) => ({
    name: m.label,
    amount: Math.round(m.amount / 1000),
    method: m.method,
    count: m.count,
  }));

  const links = [
    {
      href: "/finance/revenue",
      title: "Revenue",
      desc: "Platform gross, commission and transaction ledger",
      icon: Receipt,
    },
    {
      href: "/finance/manual-payments",
      title: "Manual MoMo Payments",
      desc: "Review patient payment proofs and confirm transactions",
      icon: Banknote,
    },
    {
      href: "/finance/withdrawals",
      title: "Withdrawals",
      desc: "Approve and track partner & pharmacy payout requests",
      icon: ArrowDownToLine,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Finance Hub"
        subtitle="Platform money flow — revenue, commissions and payouts"
        breadcrumb="Finance"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Gross revenue" value={formatRWF(summary?.total_gross ?? 0)} icon={DollarSign} color="text-farumasi-700" />
        <StatCard label="Commission earned" value={formatRWF(summary?.total_commission ?? 0)} icon={TrendingUp} color="text-blue-700" />
        <StatCard
          label="Net earnings (partners)"
          value={formatRWF(summary?.total_net ?? 0)}
          icon={TrendingUp}
          color="text-emerald-700"
          sublabel={summary ? `${summary.available_settlement_count ?? 0} settled ledger entries` : undefined}
        />
        <StatCard
          label="Payments collected"
          value={formatRWF(payments?.total_collected ?? 0)}
          icon={Banknote}
          color="text-violet-700"
          sublabel={payments ? `${payments.successful_count} successful` : undefined}
        />
      </div>

      {paymentChart.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payments by method</CardTitle>
          </CardHeader>
          <CardContent>
            <SafeChartContainer height={220}>
              <BarChart data={paymentChart} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(value, _name, item) => [
                    `${Number(value ?? 0)}K RWF · ${(item as { payload?: { count?: number } }).payload?.count ?? 0} txns`,
                    "Collected",
                  ]}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {paymentChart.map((entry) => (
                    <Cell key={entry.method} fill={METHOD_COLORS[entry.method] ?? "#1e9e68"} />
                  ))}
                </Bar>
              </BarChart>
            </SafeChartContainer>
            {(payments?.awaiting_review_count ?? 0) > 0 && (
              <p className="text-xs text-violet-700 mt-3">
                {payments?.awaiting_review_count} manual payment(s) (
                {formatRWF(payments?.awaiting_review_amount ?? 0)}) awaiting review — not in chart until approved.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {links.map(({ href, title, desc, icon: Icon }) => (
          <Link key={href} href={href} prefetch={false}>
            <Card className="hover:border-farumasi-300 hover:shadow-md transition-all h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-farumasi-600" />
                    <CardTitle>{title}</CardTitle>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">{desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {pendingManualPayments > 0 && (
        <Card className="border-violet-200 bg-violet-50/50">
          <CardContent className="py-4">
            <p className="text-sm text-violet-900">
              <strong>{pendingManualPayments}</strong> manual MoMo payment(s) awaiting review.{" "}
              <Link href="/finance/manual-payments" className="text-farumasi-700 font-semibold underline">
                Review now →
              </Link>
            </p>
          </CardContent>
        </Card>
      )}

      {pendingWithdrawals > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="py-4">
            <p className="text-sm text-amber-900">
              <strong>{pendingWithdrawals}</strong> withdrawal request(s) totalling{" "}
              <strong>{formatRWF(pendingAmount)}</strong> need review.{" "}
              <Link href="/finance/withdrawals" className="text-farumasi-700 font-semibold underline">
                Open withdrawals →
              </Link>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
