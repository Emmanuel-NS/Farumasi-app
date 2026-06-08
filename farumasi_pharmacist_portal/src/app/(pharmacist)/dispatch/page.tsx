"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Truck, User, Loader2, RefreshCw, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deliveriesService, type BackendDelivery } from "@/lib/services/deliveries.service";
import { ordersService, type BackendOrder } from "@/lib/services/orders.service";
import { ridersService, type RiderProfile } from "@/lib/services/riders.service";
import { toast } from "sonner";
import { getApiError } from "@/lib/api";

type QueueItem = { delivery: BackendDelivery; order: BackendOrder };

export default function DispatchPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [riders, setRiders] = useState<RiderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [riderCodes, setRiderCodes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersPage, deliveries, r] = await Promise.all([
        ordersService.getPharmacyOrders({ limit: 100 }),
        deliveriesService.list(),
        ridersService.listRiders(true),
      ]);
      const orderById = new Map(ordersPage.items.map((o) => [o.id, o]));
      const items: QueueItem[] = [];
      for (const delivery of deliveries) {
        const order = orderById.get(delivery.order_id);
        if (!order) continue;
        if (
          order.payment_status === "paid" &&
          order.order_status === "ready_for_pickup" &&
          order.delivery_method === "delivery" &&
          ["pending_assignment", "assigned"].includes(delivery.status)
        ) {
          items.push({ delivery, order });
        }
      }
      setQueue(items);
      setRiders(r);
    } catch (err) {
      toast.error(getApiError(err, "Could not load dispatch queue"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedQueue = useMemo(
    () => [...queue].sort((a, b) => a.delivery.id.localeCompare(b.delivery.id)),
    [queue],
  );

  const handleAssign = async (item: QueueItem, riderId: string) => {
    setAssigningId(item.delivery.id);
    try {
      const code = riderCodes[item.order.id]?.trim();
      if (code) {
        await ordersService.setRiderCode(item.order.id, code);
      }
      await deliveriesService.assign(item.delivery.id, riderId);
      toast.success("Rider assigned");
      await load();
    } catch (err) {
      toast.error(getApiError(err, "Assignment failed"));
    } finally {
      setAssigningId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading dispatch queue…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Delivery dispatch</h1>
          <p className="text-sm text-slate-500 mt-1">
            Assign riders to paid orders that partners marked ready for pickup.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} className="gap-1.5">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {sortedQueue.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
          No deliveries waiting for rider assignment.
        </div>
      ) : (
        <div className="space-y-4">
          {sortedQueue.map(({ delivery: d, order }) => {
            const seller =
              order.pharmacy?.name ?? order.partner_company?.name ?? "Seller";
            return (
              <div
                key={d.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-bold text-slate-900">
                      {order.order_code ?? order.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{seller}</p>
                    <p className="text-xs text-slate-600 mt-2 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5" />
                      {d.pickup_address ?? "Pickup TBD"} → {d.destination_address ?? order.delivery_address ?? "Patient"}
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Paid · Ready
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1 mb-1">
                      <KeyRound className="w-3.5 h-3.5" /> Rider access code (optional)
                    </label>
                    <Input
                      placeholder="Code for rider at pickup"
                      value={riderCodes[order.id] ?? ""}
                      onChange={(e) =>
                        setRiderCodes((prev) => ({ ...prev, [order.id]: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1 mb-1">
                      <User className="w-3.5 h-3.5" /> Assign rider
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {riders.length === 0 ? (
                        <p className="text-xs text-amber-700">No online riders</p>
                      ) : (
                        riders.map((r) => (
                          <Button
                            key={r.id}
                            size="sm"
                            variant="outline"
                            disabled={assigningId === d.id}
                            onClick={() => void handleAssign({ delivery: d, order }, r.id)}
                          >
                            {assigningId === d.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              r.user?.full_name ?? `Rider ${r.id.slice(0, 6)}`
                            )}
                          </Button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
