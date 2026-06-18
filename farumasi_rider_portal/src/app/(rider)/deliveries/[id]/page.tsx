"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  CheckCircle,
  MapPin,
  Package,
  Phone,
  QrCode,
  Store,
  Timer,
} from "lucide-react";
import { riderService, type RiderDelivery } from "@/lib/services/rider.service";
import { RiderBottomNav } from "@/components/rider-bottom-nav";

const STEPS = [
  { key: "pickup", label: "Go to\nPharmacy", statuses: ["assigned", "accepted", "going_to_pickup"] },
  { key: "collect", label: "Pick Up\nOrder", statuses: ["arrived_at_pickup", "picked_up"] },
  { key: "deliver", label: "Deliver to\nPatient", statuses: ["out_for_delivery", "arrived_at_destination"] },
  { key: "qr", label: "Scan QR\nCode", statuses: ["qr_pending"] },
];

const NEXT: Record<string, { action: "accept" | "status"; status?: string; label: string }> = {
  assigned: { action: "accept", label: "Accept delivery" },
  accepted: { action: "status", status: "going_to_pickup", label: "Start going to pharmacy" },
  going_to_pickup: { action: "status", status: "arrived_at_pickup", label: "Arrived at pharmacy" },
  arrived_at_pickup: { action: "status", status: "picked_up", label: "Order picked up" },
  picked_up: { action: "status", status: "out_for_delivery", label: "Out for delivery" },
  out_for_delivery: { action: "status", status: "arrived_at_destination", label: "Arrived at patient" },
  arrived_at_destination: { action: "status", status: "qr_pending", label: "Ready for QR scan" },
};

function stepIndex(status: string): number {
  for (let i = 0; i < STEPS.length; i++) {
    if (STEPS[i].statuses.includes(status)) return i;
  }
  if (status === "delivered") return STEPS.length;
  return 0;
}

function elapsedLabel(from?: string | null): string {
  if (!from) return "—";
  const ms = Date.now() - new Date(from).getTime();
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [delivery, setDelivery] = useState<RiderDelivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [qrToken, setQrToken] = useState("");
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await riderService.getDelivery(id);
      setDelivery(data);
    } catch {
      toast.error("Failed to load delivery");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const currentStep = useMemo(
    () => (delivery ? stepIndex(delivery.status) : 0),
    [delivery, tick],
  );

  async function advance() {
    if (!delivery) return;
    const next = NEXT[delivery.status];
    if (!next) return;
    setActing(true);
    try {
      if (next.action === "accept") {
        await riderService.acceptDelivery(id);
      } else if (next.status) {
        await riderService.updateStatus(id, next.status);
      }
      toast.success("Updated");
      await load();
    } catch {
      toast.error("Could not update delivery");
    } finally {
      setActing(false);
    }
  }

  async function confirmQr() {
    if (!qrToken.trim()) {
      toast.error("Enter the QR token from the patient");
      return;
    }
    setActing(true);
    try {
      await riderService.confirmQr(id, qrToken.trim());
      toast.success("Delivery completed!");
      setQrToken("");
      await load();
    } catch {
      toast.error("QR confirmation failed");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F8F7]">
        <p className="text-slate-400 text-sm">Loading…</p>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F8F7] p-4">
        <p className="text-slate-500">Delivery not found.</p>
      </div>
    );
  }

  const next = NEXT[delivery.status];
  const isDone = delivery.status === "delivered";
  const isQr = delivery.status === "qr_pending";

  return (
    <div className="min-h-screen bg-[#F6F8F7] pb-32">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button type="button" onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-slate-50">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-slate-900 truncate">
              {delivery.order?.order_code ?? delivery.order_id.slice(0, 8)}
            </h1>
            <p className="text-xs text-farumasi-600 font-medium capitalize">
              {delivery.status.replace(/_/g, " ")}
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-farumasi-50 text-farumasi-700 px-2.5 py-1 rounded-full text-xs font-bold">
            <Timer className="w-3.5 h-3.5" />
            {elapsedLabel(delivery.accepted_at ?? delivery.created_at)}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Step progress — mirrors Flutter rider UI */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-start">
            {STEPS.map((step, i) => {
              const done = i < currentStep;
              const current = i === currentStep && !isDone;
              return (
                <div key={step.key} className="flex flex-1 items-start">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition ${
                        done
                          ? "bg-farumasi-600 border-farumasi-600 text-white"
                          : current
                            ? "bg-farumasi-50 border-farumasi-600 text-farumasi-600"
                            : "bg-slate-50 border-slate-200 text-slate-300"
                      }`}
                    >
                      {done ? <Check className="w-5 h-5" /> : <span className="text-xs font-bold">{i + 1}</span>}
                    </div>
                    <p
                      className={`text-[10px] text-center mt-2 leading-tight whitespace-pre-line ${
                        current || done ? "text-farumasi-700 font-semibold" : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mt-5 mx-1 rounded ${
                        i < currentStep ? "bg-farumasi-600" : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {delivery.order?.pharmacy && (
          <Card title="Pickup from" icon={Store}>
            <p className="font-semibold text-slate-900">{delivery.order.pharmacy.name}</p>
            {delivery.pickup_address && (
              <p className="text-sm text-slate-500 mt-1 flex gap-1">
                <MapPin className="w-4 h-4 shrink-0" />
                {delivery.pickup_address}
              </p>
            )}
          </Card>
        )}

        {delivery.order?.patient && (
          <Card title="Deliver to" icon={Package}>
            <p className="font-semibold text-slate-900">{delivery.order.patient.full_name}</p>
            {delivery.order.patient.phone && (
              <a
                href={`tel:${delivery.order.patient.phone}`}
                className="inline-flex items-center gap-1.5 text-farumasi-600 text-sm font-medium mt-2"
              >
                <Phone className="w-4 h-4" />
                {delivery.order.patient.phone}
              </a>
            )}
            <p className="text-sm text-slate-500 mt-2 flex gap-1">
              <MapPin className="w-4 h-4 shrink-0" />
              {delivery.destination_address ?? delivery.order.delivery_address ?? "—"}
            </p>
          </Card>
        )}

        {delivery.order?.items && delivery.order.items.length > 0 && (
          <Card title="Items" icon={Package}>
            <ul className="space-y-2">
              {delivery.order.items.map((item) => (
                <li key={item.id} className="flex justify-between text-sm">
                  <span>{item.medication_name ?? item.product_name ?? "Item"}</span>
                  <span className="text-slate-400">×{item.quantity}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {isDone && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center text-emerald-800 font-semibold">
            Delivery completed successfully
          </div>
        )}
      </div>

      {!isDone && (
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-gradient-to-t from-[#F6F8F7] via-[#F6F8F7] to-transparent">
          <div className="max-w-lg mx-auto space-y-3">
            {isQr ? (
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-lg space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                  <QrCode className="w-5 h-5 text-farumasi-600" />
                  Confirm with patient QR
                </div>
                <input
                  value={qrToken}
                  onChange={(e) => setQrToken(e.target.value)}
                  placeholder="Paste QR token"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
                />
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => void confirmQr()}
                  className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-xl disabled:opacity-50"
                >
                  {acting ? "Confirming…" : "Complete delivery"}
                </button>
              </div>
            ) : next ? (
              <button
                type="button"
                disabled={acting}
                onClick={() => void advance()}
                className="w-full py-3.5 bg-farumasi-600 hover:bg-farumasi-700 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle className="w-5 h-5" />
                {acting ? "Updating…" : next.label}
              </button>
            ) : null}
          </div>
        </div>
      )}

      <RiderBottomNav />
    </div>
  );
}

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">
        <Icon className="w-4 h-4" />
        {title}
      </div>
      {children}
    </div>
  );
}
