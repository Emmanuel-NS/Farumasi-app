"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatPrice, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Loader2,
  Package,
  Building2,
  FileText,
  Eye,
  UserCheck,
} from "lucide-react";
import type { BackendOrder } from "@/lib/services/orders.service";
import {
  ordersService,
  isPrescriptionOrder,
  type OrderActivityEntry,
} from "@/lib/services/orders.service";
import { prescriptionsService, type PrescriptionReview } from "@/lib/services/prescriptions.service";
import { OrderActivityTimeline } from "@/components/orders/order-activity-timeline";
import type { OrderStatus } from "@/types";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<BackendOrder | null>(null);
  const [activity, setActivity] = useState<OrderActivityEntry[]>([]);
  const [reviews, setReviews] = useState<PrescriptionReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    try {
      const data = await ordersService.getOrderById(id);
      setOrder(data);

      try {
        const logs = await ordersService.getOrderActivity(id);
        setActivity(logs);
      } catch {
        setActivity([]);
      }

      if (data.prescription_id) {
        try {
          const rxReviews = await prescriptionsService.listReviewsForPrescription(
            data.prescription_id,
          );
          setReviews(rxReviews);
        } catch {
          setReviews([]);
        }
      } else {
        setReviews([]);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="p-6 flex justify-center py-24">
        <Loader2 className="w-8 h-8 text-farumasi-600 animate-spin" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="p-6 text-center py-24">
        <p className="text-slate-600 font-semibold">Order not found</p>
        <button onClick={() => router.push("/orders")} className="text-farumasi-600 text-sm mt-2">
          Back to orders
        </button>
      </div>
    );
  }

  const isRx = isPrescriptionOrder(order);
  const fulfiller = order.partner_company?.name ?? order.pharmacy?.name ?? "—";
  const latestReview = reviews.length
    ? [...reviews].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
    : null;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-farumasi-600"
      >
        <ArrowLeft className="w-4 h-4" /> Back to orders
      </button>

      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900 flex gap-2">
        <Eye className="w-5 h-5 shrink-0" />
        <span>
          This view is <strong>read-only</strong>. Partner pharmacies manage accept/decline and fulfilment.
          Prescription review and cart building happen under <Link href="/requests" className="underline font-semibold">Requests</Link>.
        </span>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  isRx ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"
                }`}
              >
                {isRx ? "Prescription order" : "Partner order"}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {order.order_code ?? order.id.slice(0, 8)}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              {order.patient?.user?.full_name ?? "Patient"}
            </h1>
            {order.patient?.user?.phone && (
              <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                <Phone className="w-4 h-4" /> {order.patient.user.phone}
              </p>
            )}
          </div>
          <StatusBadge status={order.order_status as OrderStatus} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mb-4 text-sm">
          <div className="rounded-xl bg-slate-50 p-3 flex gap-2">
            <Building2 className="w-5 h-5 text-farumasi-600 shrink-0" />
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">Fulfilling partner</p>
              <p className="font-semibold text-slate-800">{fulfiller}</p>
            </div>
          </div>
          {isRx && order.prescription_id && (
            <div className="rounded-xl bg-violet-50 p-3 flex gap-2">
              <FileText className="w-5 h-5 text-violet-600 shrink-0" />
              <div>
                <p className="text-xs text-violet-600 uppercase font-bold">Prescription</p>
                <Link
                  href={`/requests/${order.prescription_id}`}
                  className="font-semibold text-violet-800 hover:underline text-sm"
                >
                  Open prescription review
                </Link>
              </div>
            </div>
          )}
        </div>

        {isRx && latestReview && (
          <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4 mb-4">
            <p className="text-xs font-bold text-violet-700 uppercase flex items-center gap-1 mb-1">
              <UserCheck className="w-4 h-4" /> Pharmacist review
            </p>
            <p className="text-sm text-slate-800 capitalize">
              Status: <span className="font-semibold">{latestReview.review_status.replace(/_/g, " ")}</span>
              {" · "}
              {formatDateTime(latestReview.created_at)}
            </p>
            {latestReview.review_notes && (
              <p className="text-xs text-slate-600 mt-1">{latestReview.review_notes}</p>
            )}
          </div>
        )}

        {order.delivery_address && (
          <p className="text-sm text-slate-600 flex items-start gap-2 mb-4">
            <MapPin className="w-4 h-4 shrink-0 text-farumasi-600" />
            {order.delivery_address}
          </p>
        )}

        <div className="border-t border-slate-100 pt-4">
          <h2 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
            <Package className="w-4 h-4" /> Items
          </h2>
          <ul className="space-y-2">
            {order.items.map((item) => (
              <li key={item.id} className="text-sm border-b border-slate-50 pb-2 last:border-0">
                <div className="flex justify-between">
                  <span className="text-slate-700">
                    {item.product_name} ×{item.quantity}
                  </span>
                  <span className="font-medium">{formatPrice(item.total_price)} RWF</span>
                </div>
                {item.dispatch_batch_number && (
                  <div className="mt-1.5 text-[11px] text-slate-500 bg-slate-50 rounded-lg px-2 py-1.5">
                    <p>Batch: {item.dispatch_batch_number}</p>
                    {item.dispatch_expiry_date && (
                      <p>Expires: {formatDateTime(item.dispatch_expiry_date)}</p>
                    )}
                    {item.dispatch_manufacturer && (
                      <p>Manufacturer: {item.dispatch_manufacturer}</p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p className="text-right text-base font-extrabold text-farumasi-700 mt-3">
            Total {formatPrice(order.total_amount)} RWF
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4">
          Order activity log
        </h2>
        <OrderActivityTimeline entries={activity} />
      </div>
    </div>
  );
}
