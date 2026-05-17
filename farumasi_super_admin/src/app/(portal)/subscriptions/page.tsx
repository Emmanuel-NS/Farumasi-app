"use client";

import { Card, CardHeader, CardTitle, CardContent, PageHeader, Badge, StatCard } from "@/components/ui";
import { Layers, Calendar, DollarSign } from "lucide-react";

const plans = [
  { name: "Basic Hospital Plan", price: "RWF 50,000/mo", hospitals: 23, status: "Active" },
  { name: "Pro Hospital Plan", price: "RWF 150,000/mo", hospitals: 18, status: "Active" },
  { name: "Pharmacy Starter", price: "RWF 20,000/mo", pharmacies: 145, status: "Active" },
  { name: "Pharmacy Pro", price: "RWF 60,000/mo", pharmacies: 89, status: "Active" },
  { name: "Supplier Plan", price: "RWF 35,000/mo", suppliers: 8, status: "Active" },
];

export default function SubscriptionsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Subscriptions" subtitle="Platform subscription plans and revenue" breadcrumb="Finance" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Plans" value={plans.length} icon={Layers} color="text-farumasi-700" />
        <StatCard label="Hospitals on Plans" value={41} icon={Calendar} color="text-blue-700" />
        <StatCard label="Pharmacies on Plans" value={234} icon={DollarSign} color="text-purple-700" />
        <StatCard label="Subscription Rev." value="RWF 12.4M" icon={DollarSign} color="text-emerald-700" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {plans.map((p) => (
          <Card key={p.name} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[13px] font-semibold text-slate-900">{p.name}</p>
                <p className="text-[11px] text-farumasi-600 font-semibold mt-0.5">{p.price}</p>
              </div>
              <Badge variant="success">{p.status}</Badge>
            </div>
            <div className="text-[12px] text-slate-500">
              {"hospitals" in p ? <span>{p.hospitals} hospitals subscribed</span>
              : "pharmacies" in p ? <span>{p.pharmacies} pharmacies subscribed</span>
              : <span>{p.suppliers} suppliers subscribed</span>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
