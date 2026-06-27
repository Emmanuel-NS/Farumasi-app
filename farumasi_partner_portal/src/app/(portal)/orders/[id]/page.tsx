"use client";

import { use, useEffect, useState } from "react";
import { ArrowLeft, MapPin, Phone, Package, Pill, CheckCircle2, XCircle, Truck, Loader2, FileText, User2, Key, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRWF, formatDateTime, mediaUrl, orderDisplayCode } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { getApiError } from "@/lib/api";
import { ordersService, type BackendOrder, type OrderActivityEntry, type OrderPartnerAssignment } from "@/lib/services/orders.service";
import { deliveriesService, type BackendDelivery } from "@/lib/services/deliveries.service";
import { prescriptionsService, type BackendPrescription } from "@/lib/services/prescriptions.service";
import { PartnerResponseSlaBanner } from "@/components/orders/partner-response-sla-banner";
import { PharmacySwitchHistory } from "@/components/orders/pharmacy-switch-history";
import { OrderActivityTimeline } from "@/components/orders/order-activity-timeline";
import { downloadCsv } from "@/lib/export-csv";
import type { OrderStatus } from "@/types";
import type { BackendOrderItem } from "@/lib/services/orders.service";

function suggestedDispatchFromPrescription(
  item: BackendOrderItem,
  prescription: BackendPrescription | null,
): { dosage: string; notes: string } {
  if (!prescription?.items?.length) return { dosage: "", notes: "" };
  const name = (item.product_name ?? item.product?.name ?? "").trim().toLowerCase();
  const match = prescription.items.find((rx) =>
    (item.product_id && rx.product_id === item.product_id)
    || (rx.medicine_name?.trim().toLowerCase() === name && name.length > 0),
  );
  if (!match) return { dosage: "", notes: "" };
  const dosage = [match.dosage, match.frequency, match.duration].filter(Boolean).join(" · ");
  return { dosage, notes: match.instructions ?? "" };
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
  const [physicalRxPresent, setPhysicalRxPresent] = useState(false);
  const [riderCodeInput, setRiderCodeInput] = useState("");
  const [patientCodeInput, setPatientCodeInput] = useState("");
  const [handoverSubmitting, setHandoverSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [dispatchRows, setDispatchRows] = useState<
    Record<string, { batch_number: string; expiry_date: string; manufacturer: string; dosage: string; notes: string }>
  >({});
  const [activity, setActivity] = useState<OrderActivityEntry[]>([]);
  const [assignments, setAssignments] = useState<OrderPartnerAssignment[]>([]);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

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

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([
      ordersService.getOrderActivity(id),
      ordersService.getPartnerAssignments(id),
    ]).then(([logs, ledger]) => {
      if (cancelled) return;
      setActivity(logs);
      setAssignments(ledger);
    });
    return () => { cancelled = true; };
  }, [id, order?.updated_at]);

  const exportTraceability = () => {
    if (!order) return;
    downloadCsv(
      `dispatch-${orderDisplayCode(order.id, order.order_code)}`,
      ["Product", "Qty", "Batch", "Expiry", "Manufacturer", "Dosage", "Notes", "Dispatch confirmed"],
      order.items.map((item) => [
        item.product_name ?? item.product?.name ?? "Item",
        item.quantity,
        item.dispatch_batch_number ?? "",
        item.dispatch_expiry_date ?? "",
        item.dispatch_manufacturer ?? "",
        item.dispatch_dosage ?? "",
        item.dispatch_notes ?? "",
        item.dispatch_confirmed_at ?? order.dispatch_confirmed_at ?? "",
      ]),
    );
    toast.success("Dispatch traceability exported");
  };

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
      const updated = await ordersService.verifyAccessCode(
        order.id,
        verifyCodeInput.trim(),
        physicalRxPresent,
      );
      setOrder(updated);
      toast.success("Pickup verified — your earnings are in your wallet");
      setVerifyCodeInput("");
    } catch (err: unknown) {
      toast.error(getApiError(err, "Could not verify pickup"));
    } finally {
      setVerifying(false);
    }
  };

  const handleRiderHandover = async () => {
    if (!order || !riderCodeInput.trim() || !patientCodeInput.trim()) return;
    setHandoverSubmitting(true);
    try {
      const updated = await ordersService.confirmRiderHandover(order.id, {
        rider_access_code: riderCodeInput.trim(),
        patient_access_code: patientCodeInput.trim(),
      });
      setOrder(updated);
      toast.success("Handover confirmed — earnings credited to your wallet");
      setRiderCodeInput("");
      setPatientCodeInput("");
    } catch (err: unknown) {
      toast.error(getApiError(err, "Rider handover failed"));
    } finally {
      setHandoverSubmitting(false);
    }
  };

  const openDispatchDialog = () => {
    if (!order) return;
    const rows: Record<string, { batch_number: string; expiry_date: string; manufacturer: string; dosage: string; notes: string }> = {};
    for (const item of order.items) {
      const suggested = suggestedDispatchFromPrescription(item, prescription);
      rows[item.id] = {
        batch_number: item.dispatch_batch_number ?? "",
        expiry_date: item.dispatch_expiry_date
          ? item.dispatch_expiry_date.slice(0, 10)
          : "",
        manufacturer: item.dispatch_manufacturer ?? "",
        dosage: item.dispatch_dosage ?? suggested.dosage,
        notes: item.dispatch_notes ?? suggested.notes,
      };
    }
    setDispatchRows(rows);
    setDispatchOpen(true);
  };

  const submitDispatch = async () => {
    if (!order) return;
    const items = order.items.map((item) => {
      const row = dispatchRows[item.id];
      return {
        order_item_id: item.id,
        batch_number: row?.batch_number?.trim() ?? "",
        expiry_date: row?.expiry_date ? `${row.expiry_date}T12:00:00Z` : "",
        manufacturer: row?.manufacturer?.trim() ?? "",
        dosage: row?.dosage?.trim() || undefined,
        notes: row?.notes?.trim() || undefined,
      };
    });
    if (items.some((it) => !it.batch_number || !it.expiry_date || !it.manufacturer)) {
      toast.error("Batch number, expiry date, and manufacturer are required for every item");
      return;
    }
    setActing(true);
    try {
      const updated = await ordersService.confirmDispatch(order.id, { items });
      setOrder(updated);
      setDispatchOpen(false);
      toast.success(order.is_delivery
        ? "Medicines prepared — ready for FARUMASI rider pickup"
        : "Ready for patient pickup");
    } catch (err: unknown) {
      toast.error(getApiError(err, "Failed to confirm dispatch"));
    } finally {
      setActing(false);
    }
  };

  const handleForward = () => {
    if (!order || !forward) return;
    if (forward.next === "ready_for_pickup") {
      openDispatchDialog();
      return;
    }
    updateStatus(forward.next, `Order ${forward.label.toLowerCase()}`);
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
  const forward = order.partner_fulfilment_complete ? undefined : PROGRESS_FORWARD[order.status];
  const canCancel = !order.partner_fulfilment_complete && !["cancelled", "rejected", "failed"].includes(order.status);
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
          <h1 className="text-lg font-bold">{orderDisplayCode(order.id, order.order_code)}</h1>
          <p className="text-xs text-muted-foreground">
            Placed {formatDateTime(order.created_at)}
            {order.payment_status && (
              <> · Payment{" "}
                <span className={order.payment_status === "paid" ? "text-green-700 font-semibold" : "text-amber-700 font-semibold"}>
                  {order.payment_status}
                </span>
              </>
            )}
          </p>
          {order.partner_fulfilment_complete && (
            <p className="text-xs text-emerald-700 font-medium mt-0.5">
              Your part is complete — earnings should appear in Revenue & Wallet
            </p>
          )}
        </div>
        <StatusBadge status={order.status as OrderStatus} type="order" className="ml-auto" />
      </div>

      <PartnerResponseSlaBanner order={order} nowTick={nowTick} />

      {(order.reassignment_count ?? 0) > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          This order was reassigned {order.reassignment_count} time{order.reassignment_count === 1 ? "" : "s"} before
          reaching your pharmacy. See assignment history below.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Package className="w-4 h-4" /> Order Items</CardTitle></CardHeader>
            <CardContent className="divide-y">
              {order.items.map(item => {
                const name = item.product_name ?? item.product?.name ?? "Item";
                const img = mediaUrl(item.product_image_url ?? item.product?.image_url);
                const productId = item.product_id ?? item.product?.id;
                return (
                  <div key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="w-14 h-14 rounded-xl bg-slate-100 border overflow-hidden shrink-0 flex items-center justify-center">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <Pill className="w-6 h-6 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{name}</p>
                      <p className="text-xs text-muted-foreground">
                        Qty {item.quantity}
                        {item.sell_mode && item.sell_mode !== "pack" ? ` (${item.sell_mode})` : ""}
                        {" · "}{formatRWF(item.unit_price)} each
                      </p>
                      {item.product?.prescription_required && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full mt-1 inline-block">
                          Prescription Required
                        </span>
                      )}
                      {productId && (
                        <Link
                          href={`/products/catalogue?highlight=${productId}`}
                          className="text-[11px] text-farumasi-600 font-semibold hover:underline mt-0.5 inline-block"
                        >
                          View in catalogue →
                        </Link>
                      )}
                      {(item.dispatch_batch_number || item.dispatch_dosage || item.dispatch_notes) && (
                        <div className="mt-2 text-[10px] text-muted-foreground bg-slate-50 border rounded-lg px-2 py-1.5 space-y-0.5">
                          {item.dispatch_batch_number && (
                            <p><span className="font-semibold">Batch:</span> {item.dispatch_batch_number}</p>
                          )}
                          {item.dispatch_expiry_date && (
                            <p><span className="font-semibold">Expires:</span> {formatDateTime(item.dispatch_expiry_date)}</p>
                          )}
                          {item.dispatch_manufacturer && (
                            <p><span className="font-semibold">Manufacturer:</span> {item.dispatch_manufacturer}</p>
                          )}
                          {item.dispatch_dosage && (
                            <p><span className="font-semibold">Dosage:</span> {item.dispatch_dosage}</p>
                          )}
                          {item.dispatch_notes && (
                            <p><span className="font-semibold">Notes:</span> {item.dispatch_notes}</p>
                          )}
                        </div>
                      )}
                      {!item.dispatch_batch_number && !item.dispatch_dosage && !item.dispatch_notes && order.prescription_id && (() => {
                        const suggested = suggestedDispatchFromPrescription(item, prescription);
                        if (!suggested.dosage && !suggested.notes) return null;
                        return (
                          <div className="mt-2 text-[10px] text-violet-700 bg-violet-50 border border-violet-100 rounded-lg px-2 py-1.5 space-y-0.5">
                            <p className="font-semibold text-violet-800">Suggested by FARUMASI pharmacist</p>
                            {suggested.dosage && <p><span className="font-semibold">Dosage:</span> {suggested.dosage}</p>}
                            {suggested.notes && <p><span className="font-semibold">Notes:</span> {suggested.notes}</p>}
                          </div>
                        );
                      })()}
                    </div>
                    <p className="font-semibold shrink-0">{formatRWF(item.total_price)}</p>
                  </div>
                );
              })}
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
              <div className="flex justify-between font-bold"><span>Your net earnings</span><span className="text-farumasi-700">{formatRWF(net)}</span></div>
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
                  onClick={handleForward}
                >
                  {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {forward.next === "ready_for_pickup" ? "Confirm Dispatch & Mark Ready" : forward.label}
                </Button>
              )}

              {dispatchOpen && (
                <div className="rounded-xl border bg-slate-50 p-3 space-y-3">
                  <p className="text-xs font-semibold text-slate-700">
                    Step 1 — Record medicine details before handover
                  </p>
                  {order.items.map((item) => {
                    const name = item.product_name ?? item.product?.name ?? "Item";
                    const suggested = suggestedDispatchFromPrescription(item, prescription);
                    const row = dispatchRows[item.id] ?? {
                      batch_number: "",
                      expiry_date: "",
                      manufacturer: "",
                      dosage: "",
                      notes: "",
                    };
                    const fromPharmacist = Boolean(
                      (suggested.dosage || suggested.notes)
                      && !item.dispatch_dosage
                      && !item.dispatch_notes,
                    );
                    return (
                      <div key={item.id} className="bg-white border rounded-lg p-2.5 space-y-2">
                        <p className="text-xs font-bold truncate">{name} ×{item.quantity}</p>
                        {fromPharmacist && (
                          <p className="text-[10px] text-violet-700 bg-violet-50 border border-violet-100 rounded px-2 py-1">
                            Dosage/notes pre-filled from FARUMASI pharmacist — edit or keep as-is.
                          </p>
                        )}
                        <Input placeholder="Batch number *" value={row.batch_number} onChange={(e) => setDispatchRows((prev) => ({ ...prev, [item.id]: { ...row, batch_number: e.target.value } }))} className="h-8 text-xs" />
                        <Input type="date" value={row.expiry_date} onChange={(e) => setDispatchRows((prev) => ({ ...prev, [item.id]: { ...row, expiry_date: e.target.value } }))} className="h-8 text-xs" />
                        <Input placeholder="Manufacturer *" value={row.manufacturer} onChange={(e) => setDispatchRows((prev) => ({ ...prev, [item.id]: { ...row, manufacturer: e.target.value } }))} className="h-8 text-xs" />
                        <Input placeholder="Dosage (optional)" value={row.dosage} onChange={(e) => setDispatchRows((prev) => ({ ...prev, [item.id]: { ...row, dosage: e.target.value } }))} className="h-8 text-xs" />
                        <Input placeholder="Notes (optional)" value={row.notes} onChange={(e) => setDispatchRows((prev) => ({ ...prev, [item.id]: { ...row, notes: e.target.value } }))} className="h-8 text-xs" />
                      </div>
                    );
                  })}
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" disabled={acting} onClick={submitDispatch}>
                      {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Mark ready for handover"}
                    </Button>
                    <Button size="sm" variant="outline" disabled={acting} onClick={() => setDispatchOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {!order.is_delivery && order.status === "ready_for_pickup" && !order.partner_fulfilment_complete && (
                <div className="border border-amber-200 rounded-xl p-3 space-y-2 bg-amber-50">
                  <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Step 2 — Patient pickup
                  </p>
                  <p className="text-xs text-amber-600">
                    Verify the patient&apos;s access code
                    {order.requires_physical_prescription ? " and physical prescription" : ""}.
                  </p>
                  {order.requires_physical_prescription && (
                    <label className="flex items-center gap-2 text-xs text-amber-800">
                      <input type="checkbox" checked={physicalRxPresent} onChange={(e) => setPhysicalRxPresent(e.target.checked)} />
                      Physical prescription verified
                    </label>
                  )}
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
                    Confirm pickup & credit wallet
                  </Button>
                </div>
              )}

              {order.is_delivery && order.status === "ready_for_pickup" && !order.partner_fulfilment_complete && (
                <div className="border border-blue-200 rounded-xl p-3 space-y-3 bg-blue-50">
                  <p className="text-xs font-semibold text-blue-800">
                    Step 2 — Release to FARUMASI rider
                  </p>
                  {!order.rider_access_code ? (
                    <p className="text-xs text-blue-700">
                      Waiting for FARUMASI to assign a rider and set the rider access code.
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-blue-700">
                        When the rider arrives, enter the rider code (from FARUMASI) and the patient code
                        (the rider should have received it from the patient).
                      </p>
                      <Input
                        placeholder="Rider access code"
                        value={riderCodeInput}
                        onChange={(e) => setRiderCodeInput(e.target.value.toUpperCase())}
                        className="h-9 text-sm font-mono"
                      />
                      <Input
                        placeholder="Patient access code"
                        value={patientCodeInput}
                        onChange={(e) => setPatientCodeInput(e.target.value.toUpperCase())}
                        className="h-9 text-sm font-mono"
                      />
                      <Button
                        className="w-full gap-1.5 text-sm"
                        disabled={handoverSubmitting || !riderCodeInput.trim() || !patientCodeInput.trim()}
                        onClick={() => void handleRiderHandover()}
                      >
                        {handoverSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                        Confirm rider handover
                      </Button>
                    </>
                  )}
                </div>
              )}
              {order.is_delivery && order.partner_fulfilment_complete && (
                <div className="border border-emerald-200 rounded-xl p-3 bg-emerald-50 text-xs text-emerald-800">
                  Medicines handed to FARUMASI rider. Delivery continues on the FARUMASI side — your earnings are in your wallet.
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

      <PharmacySwitchHistory
        assignments={assignments}
        activity={activity}
        reassignmentCount={order.reassignment_count}
        amountPaidSnapshot={order.amount_paid_snapshot}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Order activity & audit trail</CardTitle>
          {order.items.some((i) => i.dispatch_batch_number) && (
            <Button variant="outline" size="sm" className="text-xs shrink-0" onClick={exportTraceability}>
              Export dispatch CSV
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <OrderActivityTimeline entries={activity} />
        </CardContent>
      </Card>
    </div>
  );
}
