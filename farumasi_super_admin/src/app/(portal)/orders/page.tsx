"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { formatDate, formatRWF } from "@/lib/utils";
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
  SearchInput,
  FilterTabs,
  StatCard,
  EmptyState,
  ErrorBanner,
} from "@/components/ui";
import { ShoppingCart, Shield, Loader2 } from "lucide-react";
import { orderStatSublabels } from "@/lib/order-stats";
import {
  ordersService,
  orderBucketApiParam,
  type AdminOrderRow,
  type OrderFilterLabel,
} from "@/lib/services/orders.service";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import type { OrderAdminSummary } from "@/lib/services/admin-management.service";

const STATUS_FILTERS: OrderFilterLabel[] = ["All", "Pending", "In Progress", "Completed", "Cancelled"];

const BUCKET_LABEL: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrderFilterLabel>("All");
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [summary, setSummary] = useState<OrderAdminSummary | null>(null);
  const [listTotal, setListTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearch(q);
  }, [searchParams]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      ordersService.getSummary(),
      ordersService.listAdmin({ limit: DEFAULT_PAGE_SIZE, bucket: orderBucketApiParam(status) }),
    ])
      .then(([sum, list]) => {
        setSummary(sum);
        setOrders(list.items);
        setListTotal(list.total);
      })
      .catch((err) => setError(getApiError(err, "Failed to load orders")))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = () => {
    if (loadingMore || orders.length >= listTotal) return;
    setLoadingMore(true);
    ordersService
      .listAdmin({
        offset: orders.length,
        limit: DEFAULT_PAGE_SIZE,
        bucket: orderBucketApiParam(status),
      })
      .then((list) => {
        setOrders((prev) => [...prev, ...list.items]);
        setListTotal(list.total);
      })
      .catch((err) => setError(getApiError(err, "Failed to load more orders")))
      .finally(() => setLoadingMore(false));
  };

  const rxSubs = orderStatSublabels(summary);

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    return !q || o.orderCode.toLowerCase().includes(q) || o.sellerName.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Orders"
        subtitle={`${summary?.total ?? 0} platform orders — same lifecycle buckets as pharmacist & partner portals`}
        breadcrumb="Operations"
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-slate-100 border border-slate-200 text-sm text-slate-600">
        <Shield className="w-4 h-4 text-farumasi-600 shrink-0 mt-0.5" />
        <p>
          Counts come from the full database, not just this page. <strong>Pending</strong> = awaiting action;{" "}
          <strong>In progress</strong> = accepted through out-for-delivery; <strong>Completed</strong> = fulfilled;{" "}
          <strong>Cancelled</strong> = cancelled, rejected, or failed. Patient names stay in other portals.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total orders" value={summary?.total ?? "—"} icon={ShoppingCart} color="text-slate-700" sublabel={rxSubs.total} />
        <StatCard label="Pending" value={summary?.pending ?? "—"} icon={ShoppingCart} color="text-amber-700" sublabel={rxSubs.pending ?? "Awaiting confirmation"} />
        <StatCard label="In progress" value={summary?.in_progress ?? "—"} icon={ShoppingCart} color="text-blue-700" sublabel={rxSubs.inProgress ?? "Being prepared or delivered"} />
        <StatCard
          label="Completed"
          value={summary?.completed ?? "—"}
          icon={ShoppingCart}
          color="text-emerald-700"
          sublabel={rxSubs.completed ?? (summary ? `${formatRWF(summary.completed_revenue)} revenue` : undefined)}
        />
        <StatCard label="Cancelled" value={summary?.cancelled ?? "—"} icon={ShoppingCart} color="text-red-700" sublabel={rxSubs.cancelled} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-farumasi-600" />
            <CardTitle>Order registry</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <FilterTabs
              options={STATUS_FILTERS}
              value={status}
              onChange={setStatus}
              counts={
                summary
                  ? {
                      All: summary.total,
                      Pending: summary.pending,
                      "In Progress": summary.in_progress,
                      Completed: summary.completed,
                      Cancelled: summary.cancelled,
                    }
                  : undefined
              }
            />
            <SearchInput value={search} onChange={setSearch} placeholder="Search order code or seller…" className="w-56" />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Showing {filtered.length} of {listTotal} in “{status}” filter
          </p>
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Order code</Th>
              <Th>Type</Th>
              <Th>Seller</Th>
              <Th>Stage</Th>
              <Th>Detail status</Th>
              <Th>Payment</Th>
              <Th>Total</Th>
              <Th>Items</Th>
              <Th>Placed</Th>
            </tr>
          </Thead>
          <tbody>
            {loading && (
              <Tr>
                <Td colSpan={9} className="text-center py-10 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading…
                </Td>
              </Tr>
            )}
            {!loading && filtered.length === 0 && (
              <Tr>
                <Td colSpan={9}>
                  <EmptyState icon={ShoppingCart} title="No orders match" description="Adjust status or search filters." />
                </Td>
              </Tr>
            )}
            {!loading &&
              filtered.map((o) => (
                <Tr key={o.id}>
                  <Td className="text-[12px] font-mono font-semibold text-slate-800">{o.orderCode}</Td>
                  <Td>
                    <Badge variant={o.orderKind === "prescription" ? "purple" : "info"}>
                      {o.orderKind === "prescription" ? "Prescription" : "Partner"}
                    </Badge>
                  </Td>
                  <Td>
                    <p className="text-[12px] font-medium text-slate-800">{o.sellerName}</p>
                    <p className="text-[10px] text-slate-400 capitalize">{o.sellerKind}</p>
                  </Td>
                  <Td>
                    <Badge
                      variant={
                        o.bucket === "completed"
                          ? "success"
                          : o.bucket === "pending"
                            ? "warning"
                            : o.bucket === "cancelled"
                              ? "error"
                              : "info"
                      }
                    >
                      {BUCKET_LABEL[o.bucket]}
                    </Badge>
                  </Td>
                  <Td className="text-[12px] text-slate-600">{o.status}</Td>
                  <Td>
                    <Badge variant={o.paymentStatus.toLowerCase() === "paid" ? "success" : "warning"}>{o.paymentStatus}</Badge>
                  </Td>
                  <Td className="text-[12px] font-semibold text-farumasi-700">{formatRWF(o.total)}</Td>
                  <Td className="text-[12px] text-slate-600">{o.itemCount}</Td>
                  <Td className="text-[12px] text-slate-400">{formatDate(o.createdAt)}</Td>
                </Tr>
              ))}
          </tbody>
        </Table>
        {!loading && orders.length < listTotal && (
          <div className="p-4 border-t flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="text-xs font-medium text-farumasi-700 hover:underline disabled:opacity-50"
            >
              {loadingMore ? "Loading…" : `Load more (${orders.length} of ${listTotal})`}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
