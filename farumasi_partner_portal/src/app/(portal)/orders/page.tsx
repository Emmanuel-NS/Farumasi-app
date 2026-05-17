"use client";

import { useState } from "react";
import { ShoppingCart, Filter, Download, ChevronRight } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/lib/toast";
import { mockOrders, mockKPIs } from "@/data/mock";
import { formatCompactRWF, formatDateTime, timeAgo } from "@/lib/utils";
import type { OrderStatus } from "@/types";

const ORDER_TABS: { label: string; value: string; statuses?: OrderStatus[] }[] = [
  { label: "All", value: "all" },
  { label: "New", value: "new", statuses: ["new"] },
  { label: "In Progress", value: "progress", statuses: ["accepted", "preparing", "ready", "out_for_delivery"] },
  { label: "Completed", value: "completed", statuses: ["completed"] },
  { label: "Cancelled", value: "cancelled", statuses: ["cancelled", "rejected"] },
];

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Manage incoming and outgoing customer orders"
        icon={ShoppingCart}
        actions={
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => toast.success("Orders exported to CSV")}>
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Pending" value={String(mockKPIs.pendingOrders)} icon={ShoppingCart} iconBg="bg-amber-100" iconColor="text-amber-600" />
        <KpiCard title="Completed" value={String(mockKPIs.completedOrders)} icon={ShoppingCart} iconBg="bg-green-100" iconColor="text-green-600" />
        <KpiCard title="Cancelled" value={String(mockKPIs.cancelledOrders)} icon={ShoppingCart} iconBg="bg-red-100" iconColor="text-red-600" />
        <KpiCard title="Total Orders" value={(mockKPIs.completedOrders + mockKPIs.pendingOrders + mockKPIs.cancelledOrders).toLocaleString()} icon={ShoppingCart} />
      </div>

      {/* Filters + Table */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48 max-w-xs">
              <Input
                placeholder="Search by order # or customer…"
                className="h-8 text-xs pl-3"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Filter
            </Button>
          </div>

          <Tabs defaultValue="all">
            <div className="px-4 pt-3">
              <TabsList className="h-8">
                {ORDER_TABS.map(tab => (
                  <TabsTrigger key={tab.value} value={tab.value} className="text-xs px-3 h-6">
                    {tab.label}
                    {tab.value === "new" && mockKPIs.pendingOrders > 0 && (
                      <span className="ml-1 text-[9px] font-bold bg-farumasi-600 text-white rounded-full px-1">{mockKPIs.pendingOrders}</span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {ORDER_TABS.map(tab => {
              const q = search.toLowerCase();
              const filtered = mockOrders
                .filter(o => tab.statuses ? tab.statuses.includes(o.status) : true)
                .filter(o =>
                  !q ||
                  o.orderNumber.toLowerCase().includes(q) ||
                  o.customerName.toLowerCase().includes(q)
                );
              return (
                <TabsContent key={tab.value} value={tab.value}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Placed</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(order => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs font-semibold">{order.orderNumber}</TableCell>
                          <TableCell>
                            <p className="text-sm font-medium">{order.customerName}</p>
                            <p className="text-[11px] text-muted-foreground">{order.customerPhone}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-xs">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</p>
                            <p className="text-[11px] text-muted-foreground line-clamp-1">{order.items.map(i => i.productName).join(", ")}</p>
                          </TableCell>
                          <TableCell>
                            <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${order.isDelivery ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                              {order.isDelivery ? "Delivery" : "Pickup"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-semibold">{formatCompactRWF(order.netAmount)}</p>
                            <p className="text-[11px] text-muted-foreground">subtotal {formatCompactRWF(order.subtotal)}</p>
                          </TableCell>
                          <TableCell><StatusBadge status={order.status} type="order" /></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{timeAgo(order.placedAt)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" asChild>
                              <Link href={`/orders/${order.id}`}>View <ChevronRight className="w-3 h-3" /></Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filtered.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">
                            No orders in this category.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
