"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, StatCard } from "@/components/ui";
import { Truck, Navigation, Clock, CheckCircle2, Loader2 } from "lucide-react";

interface OrderItem { id: string; quantity: number; unit_price: number; product?: { name: string } | null }
interface BackendOrder {
  id: string;
  order_code?: string | null;
  order_status: string;
  delivery_method?: string | null;
  delivery_address?: string | null;
  is_delivery?: boolean;
  created_at: string;
  completed_at?: string | null;
  rider?: { id: string; user?: { full_name: string } | null } | null;
  patient?: { id: string; user?: { id: string; full_name: string } | null } | null;
  pharmacy?: { id: string; name: string; district?: string | null } | null;
  items: OrderItem[];
}
interface PaginatedOrders { items: BackendOrder[]; total: number }

export default function DeliveryPage() {
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<PaginatedOrders>("/orders/", { params: { limit: 100, is_delivery: true } })
      .then(r => setOrders(r.data.items))
      .catch(() => {
        // Fallback: get all orders and filter
        api.get<PaginatedOrders>("/orders/", { params: { limit: 100 } })
          .then(r2 => setOrders(r2.data.items.filter(o => o.is_delivery || o.delivery_method === "delivery")))
          .catch(() => setOrders([]));
      })
      .finally(() => setLoading(false));
  }, []);

  const active = orders.filter(o => ["in_transit","out_for_delivery","ready_for_pickup"].includes(o.order_status)).length;
  const delivered = orders.filter(o => ["delivered","completed"].includes(o.order_status)).length;
  const districts = new Set(orders.map(o => o.pharmacy?.district).filter(Boolean)).size;

  const statusLabel = (s: string) => {
    if (["delivered","completed"].includes(s)) return "Delivered";
    if (["in_transit","out_for_delivery"].includes(s)) return "In Transit";
    if (s === "pending" || s === "processing") return "Pending";
    if (s === "cancelled") return "Cancelled";
    return s;
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Delivery Operations" subtitle="Rider tracking and delivery performance" breadcrumb="Operations" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Deliveries" value={active} icon={Truck} color="text-blue-700" />
        <StatCard label="Completed" value={delivered} icon={CheckCircle2} color="text-emerald-700" />
        <StatCard label="Total Delivery Orders" value={orders.length} icon={Navigation} color="text-slate-700" />
        <StatCard label="Districts Covered" value={districts} icon={Clock} color="text-farumasi-700" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading deliveries…</div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-farumasi-600" /><CardTitle>Delivery Records</CardTitle></div>
          </CardHeader>
          <Table>
            <Thead>
              <tr>
                <Th>Order</Th>
                <Th>Rider</Th>
                <Th>Patient</Th>
                <Th>Pharmacy / District</Th>
                <Th>Status</Th>
                <Th>Date</Th>
              </tr>
            </Thead>
            <tbody>
              {orders.length === 0 ? (
                <Tr><Td colSpan={6} className="text-center text-sm text-slate-400 py-8">No delivery orders found.</Td></Tr>
              ) : orders.map(o => (
                <Tr key={o.id}>
                  <Td className="text-[11px] font-mono text-slate-600">{o.order_code ?? o.id.slice(0, 8)}</Td>
                  <Td className="text-[12px] font-semibold text-slate-900">{o.rider?.user?.full_name ?? "—"}</Td>
                  <Td className="text-[12px] text-slate-600">{o.patient?.user?.full_name ?? "—"}</Td>
                  <Td className="text-[12px] text-slate-600">{o.pharmacy?.name ?? "—"}{o.pharmacy?.district ? ` · ${o.pharmacy.district}` : ""}</Td>
                  <Td>
                    <Badge variant={["delivered","completed"].includes(o.order_status) ? "success" : ["in_transit","out_for_delivery"].includes(o.order_status) ? "info" : o.order_status === "cancelled" ? "error" : "neutral"}>
                      {statusLabel(o.order_status)}
                    </Badge>
                  </Td>
                  <Td className="text-[12px] text-slate-400">{o.completed_at ? formatDate(o.completed_at) : formatDate(o.created_at)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
