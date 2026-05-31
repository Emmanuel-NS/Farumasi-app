"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, PageHeader, Badge, StatCard } from "@/components/ui";
import { Layers, Building2, Store, Users, Loader2, Construction } from "lucide-react";

interface PlatformCounts {
  pharmacies: number;
  partners: number;
  hospitals: number;
  users: number;
}

export default function SubscriptionsPage() {
  const [counts, setCounts] = useState<PlatformCounts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ total: number }>("/pharmacies/", { params: { limit: 1 } }),
      api.get<{ items: unknown[]; total: number }>("/partners/", { params: { limit: 1 } }).catch(() => ({ data: { total: 0 } })),
      api.get<{ total: number }>("/hospitals/", { params: { limit: 1 } }),
      api.get<{ total: number }>("/users/", { params: { limit: 1 } }),
    ]).then(([ph, pa, ho, us]) => {
      setCounts({
        pharmacies: ph.data.total ?? 0,
        partners: (pa.data as { total: number }).total ?? 0,
        hospitals: ho.data.total ?? 0,
        users: us.data.total ?? 0,
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const PLAN_TIERS = [
    { name: "Pharmacy Starter", target: "Independent pharmacies", price: "RWF 20,000/mo", color: "text-blue-700", bg: "bg-blue-50", count: counts?.pharmacies },
    { name: "Partner Company", target: "Pharmacy chains & companies", price: "RWF 60,000/mo", color: "text-purple-700", bg: "bg-purple-50", count: counts?.partners },
    { name: "Hospital Plan", target: "Hospitals & health facilities", price: "RWF 50,000/mo", color: "text-emerald-700", bg: "bg-emerald-50", count: counts?.hospitals },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Subscriptions" subtitle="Platform subscriber entities and plan overview" breadcrumb="Finance" />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading subscription data…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Pharmacies" value={counts?.pharmacies ?? 0} icon={Store} color="text-blue-700" />
            <StatCard label="Partner Companies" value={counts?.partners ?? 0} icon={Layers} color="text-purple-700" />
            <StatCard label="Hospitals" value={counts?.hospitals ?? 0} icon={Building2} color="text-emerald-700" />
            <StatCard label="Total Users" value={counts?.users ?? 0} icon={Users} color="text-slate-700" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLAN_TIERS.map((p) => (
              <Card key={p.name} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900">{p.name}</p>
                    <p className={`text-[11px] font-semibold mt-0.5 ${p.color}`}>{p.price}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{p.target}</p>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
                <div className={`rounded-lg px-3 py-2 ${p.bg} mt-2`}>
                  <p className={`text-[13px] font-bold ${p.color}`}>{p.count ?? "—"} registered</p>
                </div>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="py-12 flex flex-col items-center gap-3 text-center text-muted-foreground">
              <Construction className="w-7 h-7 opacity-40" />
              <p className="text-sm font-medium">Subscription Billing Management — Coming Soon</p>
              <p className="text-xs max-w-sm">Automated billing cycles, invoice generation, and subscription lifecycle management are planned for a future release.</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
