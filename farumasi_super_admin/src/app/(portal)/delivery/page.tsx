"use client";

import { mockDeliveries } from "@/data/mock";
import { formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, StatCard, ProgressBar } from "@/components/ui";
import { Truck, Navigation, Clock, CheckCircle2 } from "lucide-react";

export default function DeliveryPage() {
  const active = mockDeliveries.filter(d => d.status === "In Transit").length;
  const delivered = mockDeliveries.filter(d => d.status === "Delivered").length;

  return (
    <div className="space-y-5">
      <PageHeader title="Delivery Operations" subtitle="Rider tracking and delivery performance" breadcrumb="Operations" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Deliveries" value={active} icon={Truck} color="text-blue-700" />
        <StatCard label="Completed Today" value={delivered} icon={CheckCircle2} color="text-emerald-700" />
        <StatCard label="Total Deliveries" value={mockDeliveries.length} icon={Navigation} color="text-slate-700" />
        <StatCard label="Districts Covered" value={new Set(mockDeliveries.map(d => d.district)).size} icon={Clock} color="text-farumasi-700" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-farumasi-600" />
            <CardTitle>Delivery Records</CardTitle>
          </div>
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Order ID</Th>
              <Th>Rider</Th>
              <Th>Patient</Th>
              <Th>District</Th>
              <Th>Status</Th>
              <Th>Delivered At</Th>
            </tr>
          </Thead>
          <tbody>
            {mockDeliveries.map((d) => (
              <Tr key={d.id}>
                <Td className="text-[11px] font-mono text-slate-600">{d.orderId}</Td>
                <Td className="text-[12px] font-semibold text-slate-900">{d.riderName ?? "—"}</Td>
                <Td className="text-[12px] text-slate-600">{d.patientName}</Td>
                <Td className="text-[12px] text-slate-600">{d.district}</Td>
                <Td>
                  <Badge variant={d.status === "Delivered" ? "success" : d.status === "In Transit" ? "info" : d.status === "Failed" ? "error" : "neutral"}>{d.status}</Badge>
                </Td>
                <Td className="text-[12px] text-slate-400">{d.deliveredAt ? formatDate(d.deliveredAt) : "—"}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
