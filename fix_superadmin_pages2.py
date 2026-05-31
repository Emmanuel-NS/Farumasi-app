import os

BASE = r"C:/Users/PC/Farumasi-app/farumasi_super_admin/src/app/(portal)"

# ──────────────────────────────────────────────────────────
# FULFILLMENT — use real orders data
# ──────────────────────────────────────────────────────────
fulfillment = '''\
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
    api.get<PaginatedOrders>("/orders/", { params: { limit: 200 } })
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
'''

# Stub pages for features without real backend data yet
def make_stub(title: str, subtitle: str, icon: str) -> str:
    return f'''\
"use client";

import {{ {icon}, Construction }} from "lucide-react";
import {{ PageHeader }} from "@/components/shared/page-header";
import {{ Card, CardContent }} from "@/components/ui/card";

export default function Page() {{
  return (
    <div className="space-y-5">
      <PageHeader title="{title}" subtitle="{subtitle}" breadcrumb="Platform" />
      <Card>
        <CardContent className="py-16 flex flex-col items-center gap-3 text-center text-muted-foreground">
          <Construction className="w-8 h-8 opacity-40" />
          <p className="text-sm font-medium">Coming Soon</p>
          <p className="text-xs max-w-sm">This feature is planned for a future release. Real-time data will be available here once the backend module is complete.</p>
        </CardContent>
      </Card>
    </div>
  );
}}
'''

stubs = {
    "ai-insights/page.tsx":           ("AI Insights",             "AI-powered analytics and recommendations",         "Brain"),
    "forecasting/page.tsx":           ("Demand Forecasting",      "Predictive analytics for supply planning",          "TrendingUp"),
    "recommendations/page.tsx":       ("Recommendations",         "AI-driven product and process recommendations",     "Lightbulb"),
    "intelligence/page.tsx":          ("Business Intelligence",   "Advanced BI dashboards and reports",                "BarChart3"),
    "shortage-intelligence/page.tsx": ("Shortage Intelligence",   "Early warning system for medicine shortages",       "AlertTriangle"),
    "predictions/page.tsx":           ("Predictions",             "Machine-learning forecasts and scenario modeling",  "Activity"),
    "bi/page.tsx":                    ("Business Intelligence",   "Cross-portal analytics and reporting",              "PieChart"),
    "system-monitoring/page.tsx":     ("System Monitoring",       "Infrastructure health and performance metrics",     "Monitor"),
    "availability/page.tsx":          ("Availability",            "Platform availability and uptime tracking",         "Activity"),
    "integrations/page.tsx":          ("Integrations",            "Third-party service integrations",                  "Plug"),
    "feature-flags/page.tsx":         ("Feature Flags",           "Feature rollout and experimentation controls",      "Flag"),
    "api-management/page.tsx":        ("API Management",          "API keys, rate limits, and usage tracking",         "Code2"),
    "departments/page.tsx":           ("Departments",             "Hospital and pharmacy department management",       "Layers"),
    "roles/page.tsx":                 ("Roles & Permissions",     "Admin role definitions and access control",         "ShieldCheck"),
    "security/page.tsx":              ("Security",                "Security events, audit logs, and access policies",  "Shield"),
    "suppliers/page.tsx":             ("Suppliers",               "Pharmaceutical supplier management",                "Truck"),
    "ecosystem/page.tsx":             ("Ecosystem Overview",      "Platform-wide entity map and relationship graph",   "Globe"),
    "pharmacy-coordination/page.tsx": ("Pharmacy Coordination",   "Inter-pharmacy coordination and referrals",         "Building2"),
}

pages = {"fulfillment/page.tsx": fulfillment}

for rel, (title, subtitle, icon) in stubs.items():
    path_check = os.path.join(BASE, rel)
    # Check if real implementation exists - if so skip
    try:
        with open(path_check, 'r') as f:
            existing = f.read()
        if 'useEffect' in existing and 'mock' not in existing.lower():
            print(f"SKIP (already real): {rel}")
            continue
    except FileNotFoundError:
        pass
    pages[rel] = make_stub(title, subtitle, icon)

for rel, content in pages.items():
    path = os.path.join(BASE, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.lstrip())
    print(f"Written: {rel}")

print("All done.")
