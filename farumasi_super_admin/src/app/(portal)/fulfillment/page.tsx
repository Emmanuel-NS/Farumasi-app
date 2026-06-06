"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, StatCard } from "@/components/ui";
import { CheckCircle2, AlertCircle, Clock, Loader2 } from "lucide-react";

interface BackendOrder {
  id: string;
  order_code?: string | null;
  order_status: string;
  created_at: string;
  completed_at?: string | null;
  pharmacy?: { id: string; name: string } | null;
  items: { id: string; quantity: number }[];
}
interface PaginatedOrders { items: BackendOrder[]; total: number }

export default function FulfillmentPage() {
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<PaginatedOrders>("/orders/", { params: { limit: 100 } })
      .then(r => setOrders(r.data.items))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  const completed = orders.filter(o => ["delivered","completed"].includes(o.order_status)).length;
  const failed = orders.filter(o => o.order_status === "cancelled").length;
  const partial = orders.filter(o => ["processing","pharmacy_accepted"].includes(o.order_status)).length;
  const fulfillmentRate = orders.length > 0 ? Math.round((completed / orders.length) * 100) : 0;

  const statusLabel = (s: string) => {
    if (["delivered","completed"].includes(s)) return "Fulfilled";
    if (s === "cancelled") return "Failed";
    if (["processing","pharmacy_accepted","ready_for_pickup","in_transit","out_for_delivery"].includes(s)) return "In Progress";
    return "Pending";
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Fulfillment Tracking" subtitle="Order fulfillment rates and pipeline management" breadcrumb="Operations" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Fulfillment Rate" value={`${fulfillmentRate}%`} icon={CheckCircle2} color="text-emerald-700" />
        <StatCard label="Failed" value={failed} icon={AlertCircle} color="text-red-700" />
        <StatCard label="Completed" value={completed} icon={CheckCircle2} color="text-emerald-700" />
        <StatCard label="In Progress" value={partial} icon={Clock} color="text-amber-700" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading fulfillment data…</div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-farumasi-600" />
              <CardTitle>Fulfillment Records</CardTitle>
            </div>
          </CardHeader>
          <Table>
            <Thead>
              <tr>
                <Th>Order ID</Th>
                <Th>Pharmacy</Th>
                <Th>Status</Th>
                <Th>Items</Th>
                <Th>Completed</Th>
              </tr>
            </Thead>
            <tbody>
              {orders.length === 0 ? (
                <Tr><Td colSpan={5} className="text-center text-sm text-slate-400 py-8">No orders found.</Td></Tr>
              ) : orders.map(o => (
                <Tr key={o.id}>
                  <Td className="text-[11px] font-mono text-slate-600">{o.order_code ?? o.id.slice(0, 8)}</Td>
                  <Td className="text-[12px] text-slate-600">{o.pharmacy?.name ?? "—"}</Td>
                  <Td>
                    <Badge variant={["delivered","completed"].includes(o.order_status) ? "success" : o.order_status === "cancelled" ? "error" : "warning"}>
                      {statusLabel(o.order_status)}
                    </Badge>
                  </Td>
                  <Td className="text-[12px] text-slate-600">{o.items.reduce((s, i) => s + i.quantity, 0)}</Td>
                  <Td className="text-[12px] text-slate-400">{o.completed_at ? formatDate(o.completed_at) : "—"}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
