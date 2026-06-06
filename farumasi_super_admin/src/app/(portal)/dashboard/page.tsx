"use client";

import { useEffect, useState, useMemo } from "react";
import { formatRWF, cn, timeAgo } from "@/lib/utils";
import { StatCard, Card, CardHeader, CardTitle, CardContent, Badge, ProgressBar } from "@/components/ui";
import Link from "next/link";
import {
  Users, ShoppingBag, Truck, Stethoscope, FileText,
  Activity,
  Navigation, BadgeCheck, TrendingUp, ClipboardList,
  Shield, DollarSign, ChevronRight, Pill, Leaf, Sparkles, Package,
  ArrowDownToLine, AlertCircle,
} from "lucide-react";
import {
  XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
} from "recharts";
import { SafeChartContainer } from "@/components/charts/SafeChartContainer";
import { analyticsService, type AdminSummary } from "@/lib/services/analytics.service";
import { ordersService } from "@/lib/services/orders.service";
import {
  adminManagementService,
  type OrderAdminSummary,
  type PatientCatalogInsights,
} from "@/lib/services/admin-management.service";
import { orderStatSublabels } from "@/lib/order-stats";
import api from "@/lib/api";
import { withdrawalsService } from "@/lib/services/withdrawals.service";
import type { WithdrawalRequest } from "@/types";

interface BackendAuditLog {
  id: string;
  action: string;
  entity_type?: string | null;
  created_at: string;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [orderSummary, setOrderSummary] = useState<OrderAdminSummary | null>(null);
  const [catalogInsights, setCatalogInsights] = useState<PatientCatalogInsights | null>(null);
  const [recentAudit, setRecentAudit] = useState<BackendAuditLog[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<WithdrawalRequest[]>([]);

  useEffect(() => {
    analyticsService.getAdminSummary().then(setSummary).catch(() => {});
    ordersService.getSummary().then(setOrderSummary).catch(() => {});
    adminManagementService.getPatientCatalogInsights().then(setCatalogInsights).catch(() => {});
    withdrawalsService
      .getWithdrawals()
      .then((rows) => setPendingWithdrawals(rows.filter((w) => w.status === "Pending")))
      .catch(() => {});
    api
      .get<{ items: BackendAuditLog[]; total: number }>("/admin/audit-logs", { params: { limit: 6, offset: 0 } })
      .then((r) => setRecentAudit(r.data.items))
      .catch(() => {});
  }, []);

  const rxSubs = orderStatSublabels(orderSummary);

  const typeIcons: Record<string, React.ElementType> = {
    medicine: Pill,
    food_supplements: Leaf,
    medical_device: Stethoscope,
    cosmetics: Sparkles,
  };

  const ordersChart = useMemo(() => {
    if (!orderSummary) return [];
    return [
      { stage: "Pending", count: orderSummary.pending },
      { stage: "In progress", count: orderSummary.in_progress },
      { stage: "Completed", count: orderSummary.completed },
      { stage: "Cancelled", count: orderSummary.cancelled },
    ];
  }, [orderSummary]);

  const fulfillmentRate =
    summary && summary.total_orders > 0
      ? Math.round((summary.completed_orders / summary.total_orders) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">FARUMASI Ecosystem</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-0.5">Command Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Real-time overview of the FARUMASI healthcare ecosystem.</p>
      </div>

      <Card className={cn(
        "border-2",
        pendingWithdrawals.length > 0
          ? "border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50/80 shadow-sm"
          : "border-slate-200 bg-slate-50/50",
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-2.5">
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                pendingWithdrawals.length > 0 ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-500",
              )}>
                <ArrowDownToLine className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Withdrawal requests
                  {pendingWithdrawals.length > 0 && (
                    <Badge variant="warning">{pendingWithdrawals.length} pending</Badge>
                  )}
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Partner payout requests awaiting your review — pinned for quick access
                </p>
              </div>
            </div>
            <Link
              href="/finance/withdrawals"
              prefetch={false}
              className="inline-flex items-center gap-1 text-xs font-semibold text-farumasi-700 hover:underline shrink-0"
            >
              Open withdrawals <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {pendingWithdrawals.length === 0 ? (
            <p className="text-sm text-slate-500 py-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
              No pending withdrawal requests right now.
            </p>
          ) : (
            <div className="divide-y divide-amber-100/80 rounded-xl border border-amber-100 bg-white/70 overflow-hidden">
              {pendingWithdrawals.slice(0, 5).map((w) => (
                <Link
                  key={w.id}
                  href="/finance/withdrawals"
                  prefetch={false}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-amber-50/60 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {w.entityName} · {formatRWF(w.amount)}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {w.method}
                      {w.payoutAccount ? ` · ${w.payoutAccount}` : ""}
                      {w.requesterName ? ` · ${w.requesterName}` : ""}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(w.requestedAt)}</p>
                  </div>
                  <Badge variant="warning">Review</Badge>
                </Link>
              ))}
              {pendingWithdrawals.length > 5 && (
                <Link
                  href="/finance/withdrawals"
                  prefetch={false}
                  className="block text-center text-xs font-medium text-amber-800 py-2.5 hover:bg-amber-50/60"
                >
                  +{pendingWithdrawals.length - 5} more pending — view all
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={(summary?.total_users ?? 0).toLocaleString()} icon={Users} color="text-farumasi-700" />
        <StatCard label="Total Pharmacies" value={summary?.total_pharmacies ?? 0} icon={ShoppingBag} color="text-purple-700" />
        <StatCard label="Total Doctors" value={(summary?.total_doctors ?? 0).toLocaleString()} icon={Stethoscope} color="text-sky-700" />
        <StatCard label="Active Riders" value={summary?.total_riders ?? 0} icon={Navigation} color="text-teal-700" />
        <StatCard label="Total Orders" value={(summary?.total_orders ?? 0).toLocaleString()} icon={ShoppingBag} color="text-orange-700" />
        <StatCard label="Completed Orders" value={(summary?.completed_orders ?? 0).toLocaleString()} icon={BadgeCheck} color="text-emerald-700" />
        <StatCard label="Total Prescriptions" value={(summary?.total_prescriptions ?? 0).toLocaleString()} icon={FileText} color="text-indigo-700" />
        <StatCard label="Total Patients" value={(summary?.total_patients ?? 0).toLocaleString()} icon={Users} color="text-blue-700" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-slate-500 font-medium">Fulfillment Rate</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{fulfillmentRate}%</p>
          <ProgressBar value={fulfillmentRate} className="mt-2" color="bg-emerald-500" />
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 font-medium">Available Revenue (RWF)</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatRWF(summary?.available_revenue_net ?? 0)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Pending withdrawals: {summary?.pending_withdrawals ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 font-medium">Pending Orders</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{orderSummary?.pending ?? summary?.total_orders ?? 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">{rxSubs.pending ?? "Awaiting seller action"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 font-medium">In Progress</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{orderSummary?.in_progress ?? 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">{rxSubs.inProgress ?? "Accepted → out for delivery"}</p>
        </Card>
      </div>

      {/* Patient marketplace catalog */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">Patient marketplace</p>
            <h2 className="text-lg font-bold text-slate-900">Live product listings</h2>
            <p className="text-xs text-slate-500 mt-0.5">Active, in-stock listings visible on the patient app</p>
          </div>
          <Badge variant="success">Live</Badge>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            label="Total on patient app"
            value={catalogInsights?.total_listings ?? 0}
            icon={Package}
            color="text-farumasi-700"
            sublabel="Approved · in stock · available"
          />
          {(catalogInsights?.by_type ?? []).map((t) => (
            <StatCard
              key={t.product_type}
              label={t.label}
              value={t.total}
              icon={typeIcons[t.product_type] ?? Package}
              color="text-indigo-700"
              details={[
                { label: "Rx required", value: t.prescription_required },
                { label: "OTC / normal", value: t.over_the_counter },
              ]}
            />
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Orders Trend */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Order pipeline</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">Platform-wide — pending, in progress, completed, cancelled</p>
            </div>
            <Badge variant="success">Live</Badge>
          </CardHeader>
          <CardContent>
            <SafeChartContainer height={220}>
              <BarChart data={ordersChart} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="stage" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Orders" isAnimationActive={false} />
              </BarChart>
            </SafeChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order revenue</CardTitle>
            <p className="text-xs text-slate-400">Completed orders — platform-wide</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-slate-500">Completed order revenue</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                {formatRWF(orderSummary?.completed_revenue ?? 0)}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Completed orders</span>
                <span className="font-semibold text-slate-800">{orderSummary?.completed ?? 0}</span>
              </div>
              {orderSummary && orderSummary.prescription_completed > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Including prescription</span>
                  <span className="font-semibold text-violet-700">{orderSummary.prescription_completed}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Cancelled</span>
                <span className="font-semibold text-red-600">{orderSummary?.cancelled ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Platform ops — no marketplace / PHI */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-farumasi-600" />
              <CardTitle>Platform snapshot</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Total users", value: (summary?.total_users ?? 0).toLocaleString(), icon: Users, color: "text-blue-600" },
                { label: "Pharmacies", value: summary?.total_pharmacies ?? 0, icon: ShoppingBag, color: "text-purple-600" },
                { label: "Active riders", value: summary?.total_riders ?? 0, icon: Truck, color: "text-teal-600" },
                { label: "Pending orders", value: orderSummary?.pending ?? 0, icon: ClipboardList, color: "text-amber-600" },
                { label: "In progress", value: orderSummary?.in_progress ?? 0, icon: ShoppingBag, color: "text-blue-600" },
                { label: "Net revenue available", value: formatRWF(summary?.available_revenue_net ?? 0), icon: TrendingUp, color: "text-emerald-600" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <item.icon className={cn("w-3.5 h-3.5", item.color)} />
                    <span className="text-[12px] text-slate-600">{item.label}</span>
                  </div>
                  <span className="text-[12px] font-semibold text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                <CardTitle>Recent audit activity</CardTitle>
              </div>
              <Link href="/audit" prefetch={false} className="text-xs text-farumasi-600 font-semibold hover:underline">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentAudit.length === 0 ? (
              <p className="text-xs text-slate-400 px-4 py-4">No recent audit events.</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {recentAudit.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                      <Shield className="w-3 h-3 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-slate-800 truncate">
                        {log.action.replace(/_/g, " ")}
                      </p>
                      <p className="text-[10px] text-slate-400">{log.entity_type ?? "Platform"}</p>
                    </div>
                    <Badge variant="neutral">{new Date(log.created_at).toLocaleDateString()}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <CardTitle>Quick links</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {[
              { href: "/users/patients", label: "Manage patients", desc: "Accounts & status" },
              { href: "/pharmacies", label: "Pharmacies & companies", desc: "Seller onboarding" },
              { href: "/finance", label: "Finance hub", desc: "Revenue & withdrawals" },
              { href: "/orders", label: "Orders overview", desc: "Status without PHI" },
            ].map(({ href, label, desc }) => (
              <Link
                key={href}
                href={href}
                prefetch={false}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-slate-800">{label}</p>
                  <p className="text-[10px] text-slate-400">{desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

