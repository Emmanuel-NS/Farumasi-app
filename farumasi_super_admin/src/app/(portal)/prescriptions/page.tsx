"use client";

import { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";
import { getApiError } from "@/lib/services/auth.service";
import {
  Card,
  CardHeader,
  CardTitle,
  PageHeader,
  Badge,
  Table,
  Thead,
  Th,
  Td,
  Tr,
  StatCard,
  FilterTabs,
  EmptyState,
  ErrorBanner,
} from "@/components/ui";
import { FileText, Shield, CheckCircle2, Clock, Loader2, ShoppingCart } from "lucide-react";
import {
  prescriptionsService,
  matchesRxFilter,
  isCancelledRx,
  type AdminPrescriptionRow,
  type RxFilterLabel,
} from "@/lib/services/prescriptions.service";
import type { PrescriptionAdminSummary } from "@/lib/services/admin-management.service";
import { cn } from "@/lib/utils";

const ACTIVE_FILTERS: RxFilterLabel[] = ["All", "New", "Under Review", "Cart Sent", "Fulfilled"];

export default function PrescriptionsPage() {
  const [mainTab, setMainTab] = useState<"requests" | "cancelled">("requests");
  const [filter, setFilter] = useState<RxFilterLabel>("All");
  const [rows, setRows] = useState<AdminPrescriptionRow[]>([]);
  const [summary, setSummary] = useState<PrescriptionAdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([prescriptionsService.listAdmin(), prescriptionsService.getSummary()])
      .then(([list, sum]) => {
        setRows(list.items);
        setSummary(sum);
      })
      .catch((err) => setError(getApiError(err, "Failed to load prescriptions")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const cancelledRows = rows.filter((r) => isCancelledRx(r.statusKey));
  const activeRows = rows.filter((r) => !isCancelledRx(r.statusKey));
  const filtered =
    mainTab === "cancelled" ? cancelledRows : activeRows.filter((r) => matchesRxFilter(r, filter));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Prescriptions"
        subtitle={`${summary?.total ?? 0} prescriptions — mirrors pharmacist “Prescription Requests” workflow`}
        breadcrumb="Operations"
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-100 text-sm text-indigo-900">
        <Shield className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Same stages as the pharmacist portal: <strong>New</strong> (patient submitted),{" "}
          <strong>Under Review</strong> (pharmacist working), <strong>Cart Sent</strong> (reviewed — ready for patient),{" "}
          <strong>Fulfilled</strong>. Cart items = medicines added by pharmacists during review.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total" value={summary?.total ?? "—"} icon={FileText} color="text-slate-700" />
        <StatCard label="New requests" value={summary?.new_requests ?? "—"} icon={Clock} color="text-amber-700" sublabel="Draft + active" />
        <StatCard label="Under review" value={summary?.under_review ?? "—"} icon={FileText} color="text-blue-700" />
        <StatCard label="Cart sent" value={summary?.cart_sent ?? "—"} icon={ShoppingCart} color="text-farumasi-700" sublabel="Reviewed — patient can order" />
        <StatCard label="Fulfilled" value={summary?.fulfilled ?? "—"} icon={CheckCircle2} color="text-emerald-700" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Pharmacist cart items"
          value={summary?.total_cart_items ?? "—"}
          icon={FileText}
          color="text-purple-700"
          sublabel={`${summary?.with_cart_items ?? 0} Rx with items · ${summary?.without_cart_items ?? 0} without`}
        />
        <StatCard label="Cancelled / expired" value={summary?.cancelled_expired ?? "—"} icon={FileText} color="text-slate-500" />
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        {(
          [
            { key: "requests" as const, label: "Requests", count: activeRows.length },
            { key: "cancelled" as const, label: "Cancelled", count: cancelledRows.length },
          ] as const
        ).map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setMainTab(key)}
            className={cn(
              "flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all",
              mainTab === key ? "bg-white text-farumasi-700 shadow-sm" : "text-slate-500 hover:text-slate-700",
            )}
          >
            {label}
            {count > 0 && (
              <span
                className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  mainTab === key ? "bg-farumasi-600 text-white" : "bg-slate-200 text-slate-500",
                )}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-farumasi-600" />
            <CardTitle>Prescription registry</CardTitle>
          </div>
          {mainTab === "requests" && (
            <FilterTabs
              options={ACTIVE_FILTERS}
              value={filter}
              onChange={setFilter}
              counts={
                summary
                  ? {
                      All: activeRows.length,
                      New: summary.new_requests,
                      "Under Review": summary.under_review,
                      "Cart Sent": summary.cart_sent,
                      Fulfilled: summary.fulfilled,
                    }
                  : undefined
              }
            />
          )}
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Reference</Th>
              <Th>Type</Th>
              <Th>Stage</Th>
              <Th>Cart items</Th>
              <Th>Created</Th>
            </tr>
          </Thead>
          <tbody>
            {loading && (
              <Tr>
                <Td colSpan={5} className="text-center py-10 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading…
                </Td>
              </Tr>
            )}
            {!loading && filtered.length === 0 && (
              <Tr>
                <Td colSpan={5}>
                  <EmptyState icon={FileText} title="No prescriptions match" description="Try a different filter or tab." />
                </Td>
              </Tr>
            )}
            {!loading &&
              filtered.map((p) => (
                <Tr key={p.id}>
                  <Td className="text-[12px] font-mono font-semibold text-slate-800">{p.reference}</Td>
                  <Td className="text-[12px] text-slate-600 capitalize">{p.prescriptionType}</Td>
                  <Td>
                    <Badge
                      variant={
                        p.statusKey === "fulfilled" || p.statusKey === "partially_fulfilled"
                          ? "success"
                          : p.statusKey === "active" || p.statusKey === "draft"
                            ? "warning"
                            : p.statusKey === "under_review"
                              ? "info"
                              : p.statusKey === "reviewed"
                                ? "default"
                                : p.statusKey === "cancelled" || p.statusKey === "expired"
                                  ? "error"
                                  : "neutral"
                      }
                    >
                      {p.status}
                    </Badge>
                  </Td>
                  <Td className="text-[12px] text-slate-600">{p.itemCount}</Td>
                  <Td className="text-[12px] text-slate-400">{formatDate(p.createdAt)}</Td>
                </Tr>
              ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
