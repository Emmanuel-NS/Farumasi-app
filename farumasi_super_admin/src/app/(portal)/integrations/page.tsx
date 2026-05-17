"use client";

import { mockIntegrations } from "@/data/mock";
import { formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, PageHeader, Badge, StatCard, Button, StatusDot } from "@/components/ui";
import { Plug, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";

export default function IntegrationsPage() {
  const active = mockIntegrations.filter(i => i.status === "Connected").length;
  const error = mockIntegrations.filter(i => i.status === "Error").length;

  return (
    <div className="space-y-5">
      <PageHeader title="Integrations" subtitle="Third-party service integrations and health status" breadcrumb="System" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Connected" value={active} icon={CheckCircle2} color="text-emerald-700" />
        <StatCard label="Errors" value={error} icon={AlertTriangle} color="text-red-700" />
        <StatCard label="Total" value={mockIntegrations.length} icon={Plug} color="text-slate-700" />
        <StatCard label="Uptime Avg" value="99.2%" icon={CheckCircle2} color="text-farumasi-700" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {mockIntegrations.map((integration) => (
          <Card key={integration.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <Plug className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-slate-900">{integration.name}</p>
                  <p className="text-[10px] text-slate-400">{integration.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusDot status={integration.status} />
                <Badge variant={integration.status === "Connected" ? "success" : integration.status === "Error" ? "error" : "warning"}>{integration.status}</Badge>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">{integration.description}</p>
            <div className="space-y-1 mb-3">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Provider</span>
                <span className="font-semibold text-slate-700">{integration.provider}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Type</span>
                <span className="font-semibold text-slate-700">{integration.type}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Last Synced</span>
                <span className="font-semibold text-slate-600">{integration.lastSync ? formatDate(integration.lastSync) : "Never"}</span>
              </div>
            </div>
            <Button variant="outline" size="xs" className="w-full justify-center">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Status
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
