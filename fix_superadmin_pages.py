import os, textwrap

BASE = r"C:/Users/PC/Farumasi-app/farumasi_super_admin/src/app/(portal)"

# ──────────────────────────────────────────────────────────
# HOSPITALS
# ──────────────────────────────────────────────────────────
hospitals = '''\
"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, SearchInput, FilterTabs } from "@/components/ui";
import { Building2, Loader2 } from "lucide-react";

interface Hospital {
  id: string;
  name: string;
  hospital_type?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  district?: string | null;
  status: string;
  verification_status: string;
  license_number?: string | null;
  created_at: string;
}

const STATUS_FILTERS = ["All", "active", "inactive", "suspended"] as const;

export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  useEffect(() => {
    api.get<Hospital[]>("/hospitals/", { params: { limit: 100 } })
      .then(r => setHospitals(r.data))
      .catch(() => setHospitals([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = hospitals.filter(h => {
    const matchSearch = !search || h.name.toLowerCase().includes(search.toLowerCase()) || (h.district ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || h.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Hospitals" subtitle={loading ? "Loading…" : `${hospitals.length} registered hospitals`} breadcrumb="Platform Management" />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading hospitals…</div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-farumasi-600" />
              <CardTitle>Hospital Management</CardTitle>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <FilterTabs options={STATUS_FILTERS as unknown as string[]} value={statusFilter} onChange={setStatusFilter} />
              <SearchInput value={search} onChange={setSearch} placeholder="Search hospitals..." className="w-48" />
            </div>
          </CardHeader>
          <Table>
            <Thead>
              <tr>
                <Th>Hospital</Th>
                <Th>District</Th>
                <Th>Type</Th>
                <Th>Verification</Th>
                <Th>Status</Th>
                <Th>Joined</Th>
              </tr>
            </Thead>
            <tbody>
              {filtered.length === 0 ? (
                <Tr><Td colSpan={6} className="text-center text-sm text-slate-400 py-8">No hospitals found.</Td></Tr>
              ) : filtered.map(h => (
                <Tr key={h.id}>
                  <Td>
                    <div>
                      <p className="text-[12px] font-semibold text-slate-900">{h.name}</p>
                      <p className="text-[10px] text-slate-400">{h.email ?? h.license_number ?? "—"}</p>
                    </div>
                  </Td>
                  <Td className="text-[12px] text-slate-500">{h.district ?? "—"}</Td>
                  <Td><Badge variant="default">{h.hospital_type ?? "General"}</Badge></Td>
                  <Td><Badge variant={h.verification_status === "verified" ? "success" : h.verification_status === "pending" ? "warning" : "neutral"}>{h.verification_status}</Badge></Td>
                  <Td><Badge variant={h.status === "active" ? "success" : h.status === "suspended" ? "error" : "neutral"}>{h.status}</Badge></Td>
                  <Td className="text-[12px] text-slate-400">{formatDate(h.created_at)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
'''

# ──────────────────────────────────────────────────────────
# DELIVERY
# ──────────────────────────────────────────────────────────
delivery = '''\
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
        api.get<PaginatedOrders>("/orders/", { params: { limit: 200 } })
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
'''

# ──────────────────────────────────────────────────────────
# COMMISSIONS
# ──────────────────────────────────────────────────────────
commissions = '''\
"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { formatRWF, formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, StatCard } from "@/components/ui";
import { Receipt, Loader2 } from "lucide-react";

interface RevenueRecord {
  id: string;
  order_id: string;
  partner_type: string;
  pharmacy_id?: string | null;
  partner_company_id?: string | null;
  gross_amount: number;
  platform_commission: number;
  net_amount: number;
  status: string;
  created_at: string;
  pharmacy?: { id: string; name: string } | null;
  partner_company?: { id: string; name: string } | null;
}

export default function CommissionsPage() {
  const [records, setRecords] = useState<RevenueRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<RevenueRecord[]>("/revenue/", { params: { limit: 100 } })
      .then(r => setRecords(r.data))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, []);

  const total = records.reduce((a, c) => a + c.platform_commission, 0);
  const pending = records.filter(c => c.status === "pending").length;
  const settled = records.filter(c => c.status === "settled" || c.status === "completed").length;

  return (
    <div className="space-y-5">
      <PageHeader title="Commissions" subtitle="Platform commission records" breadcrumb="Finance" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Commission" value={formatRWF(total)} icon={Receipt} color="text-farumasi-700" />
        <StatCard label="Pending" value={pending} icon={Receipt} color="text-amber-700" />
        <StatCard label="Settled" value={settled} icon={Receipt} color="text-emerald-700" />
        <StatCard label="Total Records" value={records.length} icon={Receipt} color="text-slate-700" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading commissions…</div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Receipt className="w-4 h-4 text-farumasi-600" /><CardTitle>Commission Records</CardTitle></div>
          </CardHeader>
          <Table>
            <Thead>
              <tr>
                <Th>Order ID</Th>
                <Th>Entity</Th>
                <Th>Type</Th>
                <Th>Gross</Th>
                <Th>Commission</Th>
                <Th>Net</Th>
                <Th>Status</Th>
                <Th>Date</Th>
              </tr>
            </Thead>
            <tbody>
              {records.length === 0 ? (
                <Tr><Td colSpan={8} className="text-center text-sm text-slate-400 py-8">No commission records found.</Td></Tr>
              ) : records.map(c => (
                <Tr key={c.id}>
                  <Td className="text-[11px] font-mono text-slate-500">{c.order_id.slice(0, 8)}…</Td>
                  <Td className="text-[12px] font-semibold text-slate-900">
                    {c.pharmacy?.name ?? c.partner_company?.name ?? c.partner_type ?? "—"}
                  </Td>
                  <Td><Badge variant="default">{c.partner_type ?? "—"}</Badge></Td>
                  <Td className="text-[12px] text-slate-600">{formatRWF(c.gross_amount)}</Td>
                  <Td className="text-[12px] font-semibold text-farumasi-700">{formatRWF(c.platform_commission)}</Td>
                  <Td className="text-[12px] text-emerald-700 font-semibold">{formatRWF(c.net_amount)}</Td>
                  <Td><Badge variant={c.status === "completed" || c.status === "settled" ? "success" : c.status === "pending" ? "warning" : "neutral"}>{c.status}</Badge></Td>
                  <Td className="text-[12px] text-slate-400">{formatDate(c.created_at)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
'''

# ──────────────────────────────────────────────────────────
# FINANCIAL ANALYTICS
# ──────────────────────────────────────────────────────────
financial = '''\
"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { formatRWF } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, PageHeader, StatCard } from "@/components/ui";
import { TrendingUp, DollarSign, Loader2 } from "lucide-react";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface RevenueSummary {
  total_gross: number;
  total_commission: number;
  total_net: number;
  available_balance: number;
  pending_balance: number;
  withdrawn_total: number;
}

interface RevenueRecord {
  id: string;
  gross_amount: number;
  platform_commission: number;
  net_amount: number;
  status: string;
  created_at: string;
}

export default function FinancialAnalyticsPage() {
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [records, setRecords] = useState<RevenueRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<RevenueSummary>("/revenue/summary"),
      api.get<RevenueRecord[]>("/revenue/", { params: { limit: 200 } }),
    ])
      .then(([s, r]) => { setSummary(s.data); setRecords(r.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Group by month for chart
  const chartData = (() => {
    const grouped: Record<string, { date: string; revenue: number; commissions: number; orders: number }> = {};
    records.forEach(r => {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, "0")}`;
      if (!grouped[key]) grouped[key] = { date: key.slice(5), revenue: 0, commissions: 0, orders: 0 };
      grouped[key].revenue += Math.round(r.gross_amount / 1000);
      grouped[key].commissions += Math.round(r.platform_commission / 1000);
      grouped[key].orders++;
    });
    return Object.values(grouped).slice(-12);
  })();

  const breakdownItems = summary ? [
    { label: "Total Gross Revenue", value: summary.total_gross, color: "bg-emerald-500" },
    { label: "Platform Commission", value: summary.total_commission, color: "bg-blue-500" },
    { label: "Net Revenue (Partners)", value: summary.total_net, color: "bg-indigo-500" },
    { label: "Available Balance", value: summary.available_balance, color: "bg-teal-500" },
    { label: "Pending Balance", value: summary.pending_balance, color: "bg-amber-500" },
    { label: "Total Withdrawn", value: summary.withdrawn_total, color: "bg-slate-400" },
  ] : [];

  return (
    <div className="space-y-5">
      <PageHeader title="Financial Analytics" subtitle="Revenue analysis and financial health metrics" breadcrumb="Finance" />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading financial data…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Revenue" value={formatRWF(summary?.total_gross ?? 0)} icon={DollarSign} color="text-farumasi-700" />
            <StatCard label="Commission Earned" value={formatRWF(summary?.total_commission ?? 0)} icon={DollarSign} color="text-blue-700" />
            <StatCard label="Available Balance" value={formatRWF(summary?.available_balance ?? 0)} icon={DollarSign} color="text-emerald-700" />
            <StatCard label="Total Withdrawn" value={formatRWF(summary?.withdrawn_total ?? 0)} icon={TrendingUp} color="text-amber-700" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Revenue vs Commission (Monthly)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="revenue" fill="#1e9e68" radius={[4, 4, 0, 0]} name="Revenue (K RWF)" />
                    <Line type="monotone" dataKey="commissions" stroke="#6366f1" strokeWidth={2} dot={false} name="Commission (K RWF)" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Revenue Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {breakdownItems.map(item => {
                    const pct = summary && summary.total_gross > 0 ? Math.round((item.value / summary.total_gross) * 100) : 0;
                    return (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[12px] font-semibold text-slate-700">{item.label}</p>
                          <p className="text-[12px] font-bold text-slate-900">{pct}% <span className="font-normal text-slate-400 text-[10px]">{formatRWF(item.value)}</span></p>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
'''

pages = {
    "hospitals/page.tsx": hospitals,
    "delivery/page.tsx": delivery,
    "commissions/page.tsx": commissions,
    "financial-analytics/page.tsx": financial,
}

for rel, content in pages.items():
    path = os.path.join(BASE, rel)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.lstrip())
    print(f"Written: {rel}")

print("All done.")
