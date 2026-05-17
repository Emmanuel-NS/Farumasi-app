"use client";

import { Card, CardHeader, CardTitle, CardContent, PageHeader, Badge, StatCard, Table, Thead, Th, Td, Tr } from "@/components/ui";
import { Code2, Zap, Activity, AlertTriangle } from "lucide-react";

const endpoints = [
  { method: "GET", path: "/api/v1/orders", calls: 12400, avgMs: 89, errorRate: 0.3 },
  { method: "POST", path: "/api/v1/orders", calls: 3200, avgMs: 142, errorRate: 0.8 },
  { method: "GET", path: "/api/v1/products", calls: 9800, avgMs: 67, errorRate: 0.1 },
  { method: "GET", path: "/api/v1/users", calls: 5600, avgMs: 72, errorRate: 0.2 },
  { method: "POST", path: "/api/v1/fulfillments", calls: 2100, avgMs: 188, errorRate: 1.2 },
  { method: "GET", path: "/api/v1/deliveries", calls: 7400, avgMs: 93, errorRate: 0.4 },
  { method: "POST", path: "/api/v1/payments", calls: 1800, avgMs: 220, errorRate: 0.6 },
  { method: "GET", path: "/api/v1/analytics", calls: 3200, avgMs: 310, errorRate: 0.5 },
];

export default function ApiManagementPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="API Management" subtitle="API endpoint monitoring and performance metrics" breadcrumb="System" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Endpoints" value={endpoints.length} icon={Code2} color="text-farumasi-700" />
        <StatCard label="Requests / 24h" value="45,500" icon={Zap} color="text-blue-700" />
        <StatCard label="Avg Response" value="135ms" icon={Activity} color="text-emerald-700" />
        <StatCard label="Error Rate" value="0.51%" icon={AlertTriangle} color="text-amber-700" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Code2 className="w-4 h-4 text-farumasi-600" /><CardTitle>Endpoint Performance</CardTitle></div>
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Method</Th>
              <Th>Endpoint</Th>
              <Th>Calls (24h)</Th>
              <Th>Avg Response</Th>
              <Th>Error Rate</Th>
              <Th>Status</Th>
            </tr>
          </Thead>
          <tbody>
            {endpoints.map((e) => (
              <Tr key={e.path}>
                <Td>
                  <Badge variant={e.method === "GET" ? "info" : e.method === "POST" ? "success" : e.method === "DELETE" ? "error" : "default"}>{e.method}</Badge>
                </Td>
                <Td className="text-[12px] font-mono text-slate-700">{e.path}</Td>
                <Td className="text-[12px] font-semibold text-slate-900">{e.calls.toLocaleString()}</Td>
                <Td>
                  <span className={`text-[12px] font-semibold ${e.avgMs < 100 ? "text-emerald-600" : e.avgMs < 200 ? "text-amber-600" : "text-red-600"}`}>{e.avgMs}ms</span>
                </Td>
                <Td>
                  <span className={`text-[12px] font-semibold ${e.errorRate < 0.5 ? "text-emerald-600" : e.errorRate < 1 ? "text-amber-600" : "text-red-600"}`}>{e.errorRate}%</span>
                </Td>
                <Td><Badge variant={e.errorRate < 1 ? "success" : "warning"}>Operational</Badge></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
