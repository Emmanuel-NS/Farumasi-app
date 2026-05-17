"use client";

import { mockFulfillments, mockKPIs } from "@/data/mock";
import { formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, StatCard } from "@/components/ui";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { FulfillmentStatus } from "@/types";

export default function FulfillmentPage() {
  const completed = mockFulfillments.filter(f => f.status === "Fulfilled").length;
  const partial = mockFulfillments.filter(f => f.status === "Partially Fulfilled").length;
  const failed = mockFulfillments.filter(f => f.status === "Failed").length;

  return (
    <div className="space-y-5">
      <PageHeader title="Fulfillment Tracking" subtitle="Order fulfillment rates and pipeline management" breadcrumb="Operations" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Fulfillment Rate" value={`${mockKPIs.fulfillmentRate}%`} icon={CheckCircle2} color="text-emerald-700" />
        <StatCard label="Failed Rate" value={`${mockKPIs.failedFulfillment}%`} icon={AlertCircle} color="text-red-700" />
        <StatCard label="Completed" value={completed} icon={CheckCircle2} color="text-emerald-700" />
        <StatCard label="Partial / Failed" value={partial + failed} icon={Clock} color="text-amber-700" />
      </div>

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
              <Th>Items Total</Th>
              <Th>Items Fulfilled</Th>
              <Th>Processing Time</Th>
              <Th>Completed</Th>
            </tr>
          </Thead>
          <tbody>
            {mockFulfillments.map((f) => (
              <Tr key={f.id}>
                <Td className="text-[11px] font-mono text-slate-600">{f.orderId}</Td>
                <Td className="text-[12px] text-slate-600">{f.pharmacyName}</Td>
                <Td>
                  <Badge variant={f.status === "Fulfilled" ? "success" : f.status === "Partially Fulfilled" ? "warning" : "error"}>{f.status}</Badge>
                </Td>
                <Td className="text-[12px] text-slate-600">{f.itemsTotal}</Td>
                <Td className="text-[12px] font-semibold text-slate-700">{f.itemsFulfilled}</Td>
                <Td className="text-[12px] text-slate-400">{f.processingTime}h</Td>
                <Td className="text-[12px] text-slate-400">{f.completedAt ? formatDate(f.completedAt) : "—"}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
