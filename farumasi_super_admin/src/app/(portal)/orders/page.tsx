"use client";

import { useState } from "react";
import { mockOrders } from "@/data/mock";
import { formatDate, formatRWF, orderStatusColor } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, SearchInput, FilterTabs } from "@/components/ui";
import { ShoppingCart } from "lucide-react";
import { OrderStatus } from "@/types";

const STATUS_FILTERS: (OrderStatus | "All")[] = ["All", "Pending", "Processing", "Ready", "Out for Delivery", "Delivered", "Cancelled"];

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrderStatus | "All">("All");

  const filtered = mockOrders.filter((o) => {
    const matchSearch = search === "" || o.patientName.toLowerCase().includes(search.toLowerCase()) || o.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = status === "All" || o.status === status;
    return matchSearch && matchStatus;
  });

  const statusCounts = mockOrders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-5">
      <PageHeader title="Orders" subtitle={`${mockOrders.length} total orders`} breadcrumb="Operations">
        <div className="flex items-center gap-2">
          {(["Pending", "Processing", "Out for Delivery"] as OrderStatus[]).map(s => (
            <Badge key={s} variant={s === "Pending" ? "warning" : s === "Processing" ? "info" : "purple"}>
              {s}: {statusCounts[s] || 0}
            </Badge>
          ))}
        </div>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-farumasi-600" />
            <CardTitle>Order Management</CardTitle>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <FilterTabs options={STATUS_FILTERS} value={status} onChange={setStatus} />
            <SearchInput value={search} onChange={setSearch} placeholder="Search orders..." className="w-48" />
          </div>
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Order #</Th>
              <Th>Patient</Th>
              <Th>Pharmacy</Th>
              <Th>Status</Th>
              <Th>Total</Th>
              <Th>Items</Th>
              <Th>Delivery</Th>
              <Th>Placed</Th>
            </tr>
          </Thead>
          <tbody>
            {filtered.map((o) => (
              <Tr key={o.id}>
                <Td className="text-[11px] font-mono text-slate-600">{o.id}</Td>
                <Td>
                  <div>
                    <p className="text-[12px] font-semibold text-slate-900">{o.patientName}</p>
                    <p className="text-[10px] text-slate-400">{o.deliveryType}</p>
                  </div>
                </Td>
                <Td className="text-[12px] text-slate-600">{o.pharmacyName}</Td>
                <Td>
                  <Badge variant={
                    o.status === "Delivered" ? "success" :
                    o.status === "Pending" ? "warning" :
                    o.status === "Processing" ? "info" :
                    o.status === "Out for Delivery" ? "purple" :
                    o.status === "Cancelled" ? "error" : "neutral"
                  }>{o.status}</Badge>
                </Td>
                <Td className="text-[12px] font-semibold text-farumasi-700">{formatRWF(o.total)}</Td>
                <Td className="text-[12px] text-slate-600">{o.items}</Td>
                <Td><Badge variant={o.deliveryType === "Delivery" ? "info" : "default"}>{o.deliveryType}</Badge></Td>
                <Td className="text-[12px] text-slate-400">{formatDate(o.createdAt)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
