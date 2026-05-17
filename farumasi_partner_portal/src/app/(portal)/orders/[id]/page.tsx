"use client";

import { use } from "react";
import { ArrowLeft, MapPin, Phone, Package, Clock, CheckCircle2, XCircle, Truck } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { mockOrders } from "@/data/mock";
import { formatRWF, formatDateTime } from "@/lib/utils";
import { notFound } from "next/navigation";
import { toast } from "@/lib/toast";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const order = mockOrders.find(o => o.id === id);
  if (!order) return notFound();

  const canAccept = order.status === "new";
  const canComplete = order.status === "preparing" || order.status === "ready";
  const canCancel = !["completed", "cancelled", "rejected"].includes(order.status);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon-sm" asChild>
          <Link href="/orders"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-lg font-bold">{order.orderNumber}</h1>
          <p className="text-xs text-muted-foreground">Placed {formatDateTime(order.placedAt)}</p>
        </div>
        <StatusBadge status={order.status} type="order" className="ml-auto" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Order details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Items */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Package className="w-4 h-4" /> Order Items</CardTitle></CardHeader>
            <CardContent className="divide-y">
              {order.items.map(item => (
                <div key={item.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium text-sm">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity} × {formatRWF(item.unitPrice)}</p>
                    {item.requiresPrescription && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Prescription Required</span>
                    )}
                  </div>
                  <p className="font-semibold">{formatRWF(item.totalPrice)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Financials */}
          <Card>
            <CardHeader><CardTitle>Payment Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatRWF(order.subtotal)}</span></div>
              {order.deliveryFee > 0 && (
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Delivery Fee</span><span>{formatRWF(order.deliveryFee)}</span></div>
              )}
              <div className="flex justify-between text-sm text-amber-600"><span>Platform Commission</span><span>−{formatRWF(order.commission)}</span></div>
              <Separator />
              <div className="flex justify-between font-bold"><span>Net to Pharmacy</span><span className="text-farumasi-700">{formatRWF(order.netAmount)}</span></div>
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Customer */}
          <Card>
            <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="font-semibold">{order.customerName}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="w-3.5 h-3.5" />
                {order.customerPhone}
              </div>
              {order.deliveryAddress && (
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {order.deliveryAddress}
                </div>
              )}
              <div className="flex items-center gap-2 text-xs">
                <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                <span className={order.isDelivery ? "text-blue-600 font-medium" : "text-slate-600"}>
                  {order.isDelivery ? "Delivery" : "Pickup"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {canAccept && (
                <Button className="w-full gap-1.5 text-sm" onClick={() => toast.success(`Order ${order.orderNumber} accepted — start preparing`)}>
                  <CheckCircle2 className="w-4 h-4" /> Accept Order
                </Button>
              )}
              {canComplete && (
                <Button className="w-full gap-1.5 text-sm" onClick={() => toast.success(`Order ${order.orderNumber} marked as complete`)}>
                  <CheckCircle2 className="w-4 h-4" /> Mark Ready / Complete
                </Button>
              )}
              {canCancel && (
                <Button variant="outline" className="w-full gap-1.5 text-sm text-red-600 border-red-200 hover:bg-red-50" onClick={() => { if (confirm("Cancel this order?")) toast.warning(`Order ${order.orderNumber} cancelled`); }}>
                  <XCircle className="w-4 h-4" /> Cancel Order
                </Button>
              )}
              {!canAccept && !canComplete && !canCancel && (
                <p className="text-xs text-muted-foreground text-center py-2">No actions available</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
