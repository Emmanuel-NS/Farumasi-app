"use client";

import { use, useEffect, useState } from "react";
import { ArrowLeft, MapPin, Phone, Package, CheckCircle2, XCircle, Truck, Loader2, FileText, User2, Key, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatRWF, formatDateTime } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { getApiError } from "@/lib/api";
import { ordersService, type BackendOrder } from "@/lib/services/orders.service";
import { deliveriesService, type BackendDelivery } from "@/lib/services/deliveries.service";
import { prescriptionsService, type BackendPrescription } from "@/lib/services/prescriptions.service";
import type { OrderStatus } from "@/types";

function shortId(id: string): string {
  return `FRM-${id.slice(0, 8).toUpperCase()}`;
}

const PROGRESS_FORWARD: Record<string, { next: OrderStatus; label: string }> = {
  pending:           { next: "accepted",         label: "Accept Order" },
  accepted:          { next: "preparing",         label: "Start Preparing" },
  preparing:         { next: "ready_for_pickup",  label: "Mark Ready for Pickup" },
  processing:        { next: "ready_for_pickup",  label: "Mark Ready for Pickup" },
  // Pickup orders stop at ready_for_pickup — partner pharmacy has no delivery role.
  // Delivery orders also stop here; Farumasi pharmacist handles the delivery leg.
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<BackendOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<BackendDelivery | null>(null);
  const [prescription, setPrescription] = useState<BackendPrescription | null>(null);
  const [verifyCodeInput, setVerifyCodeInput] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    ordersService
      .getOrder(id)
      .then(o => { if (!cancelled) { setOrder(o); setError(null); } })
      .catch(err => {
        if (cancelled) return;
        const msg = getApiError(err, "Failed to load order");
        setError(msg);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!order) return;
    let cancelled = false;
    if (order.is_delivery) {
      deliveriesService.getForOrder(order.id)
        .then(d => { if (!cancelled) setDelivery(d); })
        .catch(() => { if (!cancelled) setDelivery(null); });
    } else {
      setDelivery(null);
    }
    if (order.prescription_id) {
      prescriptionsService.get(order.prescription_id)
        .then(p => { if (!cancelled) setPrescription(p); })
        .catch(() => { if (!cancelled) setPrescription(null); });
    } else {
      setPrescription(null);
    }
    return () => { cancelled = true; };
  }, [order]);

  const updateStatus = async (status: OrderStatus, successMsg: string) => {
    if (!order) return;
    setActing(true);
    try {
      const updated = await ordersService.updateOrderStatus(order.id, status);
      setOrder(updated);
      toast.success(successMsg);
    } catch (err: unknown) {
      toast.error(getApiError(err, "Failed to update order"));
    } finally {
      setActing(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!order || !verifyCodeInput.trim()) return;
    setVerifying(true);
    try {
      const updated = await ordersService.verifyAccessCode(order.id, verifyCodeInput.trim());
      setOrder(updated);
      toast.success("Access code verified — order completed!");
      setVerifyCodeInput("");
    } catch (err: unknown) {
      toast.error(getApiError(err, "Incorrect access code"));
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading order…
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Button variant="outline" size="sm" asChild>
          <Link href="/orders"><ArrowLeft className="w-4 h-4 mr-1" /> Back to orders</Link>
        </Button>
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">{error || "Order not found."}</CardContent></Card>
      </div>
    );
  }

  const subtotal = order.subtotal ?? order.total_amount;
  const deliveryFee = order.delivery_fee ?? 0;
  const commission = order.commission ?? 0;
  const net = order.net_amount ?? order.total_amount;
  const forward = PROGRESS_FORWARD[order.status];
  const canCancel = !["completed", "delivered", "cancelled", "rejected", "failed"].includes(order.status);
  const canReject = order.status === "pending";
  const customerName = order.patient?.user?.full_name || "—";
  const customerPhone = order.patient?.user?.phone || "";

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon-sm" asChild>
          <Link href="/orders"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-lg font-bold">{shortId(order.id)}</h1>
          <p className="text-xs text-muted-foreground">Placed {formatDateTime(order.created_at)}</p>
        </div>
        <StatusBadge status={order.status as OrderStatus} type="order" className="ml-auto" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Package className="w-4 h-4" /> Order Items</CardTitle></CardHeader>
            <CardContent className="divide-y">
              {order.items.map(item => (
                <div key={item.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium text-sm">{item.product?.name || "Item"}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity} × {formatRWF(item.unit_price)}</p>
                    {item.product?.prescription_required && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Prescription Required</span>
                    )}
                  </div>
                  <p className="font-semibold">{formatRWF(item.total_price)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Payment Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatRWF(subtotal)}</span></div>
              {deliveryFee > 0 && (
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Delivery Fee</span><span>{formatRWF(deliveryFee)}</span></div>
              )}
              {commission > 0 && (
                <div className="flex justify-between text-sm text-amber-600"><span>Platform Commission</span><span>−{formatRWF(commission)}</span></div>
              )}
              <Separator />
              <div className="flex justify-between font-bold"><span>Net to Pharmacy</span><span className="text-farumasi-700">{formatRWF(net)}</span></div>
            </CardContent>
          </Card>

          {order.is_delivery && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="w-4 h-4" /> Delivery</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {!delivery ? (
                  <p className="text-xs text-muted-foreground">No delivery assigned yet.</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">Status</span>
                      <span className="font-medium capitalize">{delivery.status?.replace(/_/g, " ")}</span>
                    </div>
                    {delivery.pickup_address && (
                      <div className="flex items-start gap-2 text-xs">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" />
                        <div><span className="text-muted-foreground">Pickup:</span> {delivery.pickup_address}</div>
                      </div>
                    )}
                    {delivery.destination_address && (
                      <div className="flex items-start gap-2 text-xs">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-600" />
                        <div><span className="text-muted-foreground">Destination:</span> {delivery.destination_address}</div>
                      </div>
                    )}
                    {typeof delivery.delivery_fee === "number" && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Delivery Fee</span>
                        <span>{formatRWF(delivery.delivery_fee)}</span>
                      </div>
                    )}
                    {delivery.accepted_at && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Accepted</span>
                        <span>{formatDateTime(delivery.accepted_at)}</span>
                      </div>
                    )}
                    {delivery.picked_up_at && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Picked Up</span>
                        <span>{formatDateTime(delivery.picked_up_at)}</span>
                      </div>
                    )}
                    {delivery.delivery_started_at && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Started</span>
                        <span>{formatDateTime(delivery.delivery_started_at)}</span>
                      </div>
                    )}
                    {delivery.delivered_at && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Delivered</span>
                        <span>{formatDateTime(delivery.delivered_at)}</span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {order.prescription_id && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-4 h-4" /> Prescription</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {!prescription ? (
                  <p className="text-xs text-muted-foreground">Loading prescription…</p>
                ) : (
                  <>
                    {prescription.status && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Status</span>
                        <span className="font-medium capitalize">{prescription.status.replace(/_/g, " ")}</span>
                      </div>
                    )}
                    {prescription.diagnosis_notes && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Diagnosis: </span>
                        {prescription.diagnosis_notes}
                      </div>
                    )}
                    {prescription.notes && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Notes: </span>
                        {prescription.notes}
                      </div>
                    )}
                    {prescription.items && prescription.items.length > 0 && (
                      <div className="divide-y border rounded-lg">
                        {prescription.items.map((it, idx) => (
                          <div key={idx} className="p-2 space-y-0.5">
                            <p className="font-medium text-sm">{it.medicine_name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {[it.dosage, it.frequency, it.duration].filter(Boolean).join(" • ")}
                            </p>
                            {typeof it.quantity === "number" && (
                              <p className="text-[11px] text-muted-foreground">Qty: {it.quantity}</p>
                            )}
                            {it.instructions && (
                              <p className="text-[11px] text-muted-foreground italic">{it.instructions}</p>
                            )}
                            {it.substitution_allowed && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Substitution allowed</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {prescription.uploaded_file_url && (
                      <a
                        href={prescription.uploaded_file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-farumasi-700 underline"
                      >
                        View uploaded prescription
                      </a>
                    )}
                    {prescription.patient?.full_name && (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <User2 className="w-3 h-3" /> {prescription.patient.full_name}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="font-semibold">{customerName}</p>
              {customerPhone && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" />
                  {customerPhone}
                </div>
              )}
              {order.delivery_address && (
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {order.delivery_address}
                </div>
              )}
              <div className="flex items-center gap-2 text-xs">
                <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                <span className={order.is_delivery ? "text-blue-600 font-medium" : "text-slate-600"}>
                  {order.is_delivery ? "Delivery" : "Pickup"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {forward && (
                <Button
                  className="w-full gap-1.5 text-sm"
                  disabled={acting}
                  onClick={() => updateStatus(forward.next, `Order ${forward.label.toLowerCase()}`)}
                >
                  {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {forward.label}
                </Button>
              )}

              {/* Pickup access code verification: pharmacy confirms patient's code */}
              {!order.is_delivery && order.status === "ready_for_pickup" && (
                <div className="border border-amber-200 rounded-xl p-3 space-y-2 bg-amber-50">
                  <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verify Patient Code
                  </p>
                  <p className="text-xs text-amber-600">
                    Ask the patient for their access code. Correct code completes the order.
                  </p>
                  <input
                    value={verifyCodeInput}
                    onChange={(e) => setVerifyCodeInput(e.target.value.toUpperCase())}
                    placeholder="Enter patient code…"
                    className="w-full h-9 rounded-lg border border-amber-200 bg-white px-3 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                  <Button
                    className="w-full gap-1.5 text-sm bg-amber-500 hover:bg-amber-600 text-white"
                    disabled={verifying || !verifyCodeInput.trim()}
                    onClick={handleVerifyCode}
                  >
                    {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                    Confirm Pickup
                  </Button>
                </div>
              )}

              {/* Delivery: show rider access code so pharmacy knows which rider to release to */}
              {order.is_delivery && order.rider_access_code && order.status === "ready_for_pickup" && (
                <div className="border border-blue-100 rounded-xl p-3 space-y-1 bg-blue-50">
                  <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />
                    Rider Access Code
                  </p>
                  <p className="text-lg font-extrabold text-blue-900 font-mono tracking-widest">
                    {order.rider_access_code}
                  </p>
                  <p className="text-xs text-blue-600">Rider must show this code to collect the medicines.</p>
                </div>
              )}
              {canReject && (
                <Button
                  variant="outline"
                  className="w-full gap-1.5 text-sm text-red-600 border-red-200 hover:bg-red-50"
                  disabled={acting}
                  onClick={() => updateStatus("rejected", "Order rejected")}
                >
                  <XCircle className="w-4 h-4" /> Reject Order
                </Button>
              )}
              {canCancel && !canReject && (
                <Button
                  variant="outline"
                  className="w-full gap-1.5 text-sm text-red-600 border-red-200 hover:bg-red-50"
                  disabled={acting}
                  onClick={() => { if (confirm("Cancel this order?")) updateStatus("cancelled", "Order cancelled"); }}
                >
                  <XCircle className="w-4 h-4" /> Cancel Order
                </Button>
              )}
              {!forward && !canCancel && !canReject && (
                <p className="text-xs text-muted-foreground text-center py-2">No actions available</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
