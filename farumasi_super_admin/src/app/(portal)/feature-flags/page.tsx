"use client";

import { mockFeatureFlags } from "@/data/mock";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, StatCard } from "@/components/ui";
import { Flag, ToggleLeft, ToggleRight } from "lucide-react";

export default function FeatureFlagsPage() {
  const enabled = mockFeatureFlags.filter(f => f.enabled).length;

  return (
    <div className="space-y-5">
      <PageHeader title="Feature Flags" subtitle="Platform feature toggle management and rollout control" breadcrumb="System" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Flags" value={mockFeatureFlags.length} icon={Flag} color="text-farumasi-700" />
        <StatCard label="Enabled" value={enabled} icon={ToggleRight} color="text-emerald-700" />
        <StatCard label="Disabled" value={mockFeatureFlags.length - enabled} icon={ToggleLeft} color="text-slate-700" />
        <StatCard label="Avg. Rollout" value={`${Math.round(mockFeatureFlags.filter(f => f.enabled).reduce((a, f) => a + f.rolloutPercentage, 0) / (enabled || 1))}%`} icon={Flag} color="text-blue-700" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Flag className="w-4 h-4 text-farumasi-600" /><CardTitle>Feature Flags</CardTitle></div>
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Flag</Th>
              <Th>Description</Th>
              <Th>Status</Th>
              <Th>Rollout</Th>
              <Th>Environment</Th>
              <Th>Target</Th>
            </tr>
          </Thead>
          <tbody>
            {mockFeatureFlags.map((f) => (
              <Tr key={f.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    {f.enabled
                      ? <ToggleRight className="w-5 h-5 text-farumasi-600" />
                      : <ToggleLeft className="w-5 h-5 text-slate-400" />
                    }
                    <div>
                      <p className="text-[12px] font-semibold text-slate-900">{f.name}</p>
                      <p className="text-[10px] font-mono text-slate-400">{f.key}</p>
                    </div>
                  </div>
                </Td>
                <Td className="text-[12px] text-slate-500 max-w-48 truncate">{f.description}</Td>
                <Td><Badge variant={f.enabled ? "success" : "neutral"}>{f.enabled ? "Enabled" : "Disabled"}</Badge></Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    <div className="w-14 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-farumasi-500 rounded-full" style={{ width: `${f.rolloutPercentage}%` }} />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600">{f.rolloutPercentage}%</span>
                  </div>
                </Td>
                <Td><Badge variant={f.environments.includes("production") ? "error" : f.environments.includes("staging") ? "warning" : "neutral"}>{f.environments.join(", ")}</Badge></Td>
                <Td className="text-[12px] text-slate-500">{f.description}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
