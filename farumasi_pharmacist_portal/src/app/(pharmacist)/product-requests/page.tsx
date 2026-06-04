"use client";

import { useCallback, useEffect, useState } from "react";
import { FileSearch, Loader2, CheckCircle2, XCircle, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import {
  productRequestsService,
  type BackendProductRequest,
} from "@/lib/services/product-requests.service";

const REVIEWABLE = new Set(["submitted", "under_review", "more_info_required"]);

function statusLabel(s: string) {
  return s.replace(/_/g, " ");
}

export default function ProductRequestsReviewPage() {
  const [items, setItems] = useState<BackendProductRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productRequestsService.list({ limit: 100 });
      setItems(res.items);
    } catch {
      toast.error("Could not load product requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (
    id: string,
    status: "approved" | "rejected" | "more_info_required",
  ) => {
    setActingId(id);
    try {
      await productRequestsService.review(id, {
        status,
        review_notes: notes[id]?.trim() || null,
      });
      toast.success(
        status === "approved"
          ? "Approved — partner will be notified"
          : status === "rejected"
            ? "Request rejected"
            : "More information requested",
      );
      await load();
    } catch {
      toast.error("Review failed");
    } finally {
      setActingId(null);
    }
  };

  const pending = items.filter((r) => REVIEWABLE.has(r.status));

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <FileSearch className="w-5 h-5 text-farumasi-600" />
          Partner product requests
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review catalogue additions from partner pharmacies. Partners receive a notification with your feedback.
        </p>
        {pending.length > 0 && (
          <p className="text-xs font-semibold text-amber-700 mt-2">{pending.length} awaiting review</p>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-12">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border bg-white p-10 text-center text-sm text-slate-500">
          No product requests in the queue.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((req) => {
            const canReview = REVIEWABLE.has(req.status);
            return (
              <article key={req.id} className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-slate-900">{req.product_name}</h2>
                    <p className="text-xs text-slate-500 capitalize mt-0.5">
                      {req.product_type}
                      {req.category ? ` · ${req.category}` : ""}
                      {req.proposed_price != null ? ` · RWF ${req.proposed_price.toLocaleString()}` : ""}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">
                    {statusLabel(req.status)}
                  </span>
                </div>
                {req.description && (
                  <p className="text-sm text-slate-600">{req.description}</p>
                )}
                {req.intended_use && (
                  <p className="text-xs text-slate-500">
                    <span className="font-medium">Intended use:</span> {req.intended_use}
                  </p>
                )}
                {req.review_notes && !canReview && (
                  <p className="text-xs bg-slate-50 border rounded-lg p-2 text-slate-600">
                    <span className="font-semibold">Your notes:</span> {req.review_notes}
                  </p>
                )}
                {canReview && (
                  <>
                    <textarea
                      className="w-full text-sm border rounded-xl p-3 min-h-[72px] outline-none focus:ring-2 focus:ring-farumasi-300"
                      placeholder="Feedback for the partner (required for reject / more info)…"
                      value={notes[req.id] ?? ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [req.id]: e.target.value }))}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={actingId === req.id}
                        onClick={() => review(req.id, "approved")}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-farumasi-600 text-white text-xs font-semibold hover:bg-farumasi-700 disabled:opacity-60"
                      >
                        {actingId === req.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={actingId === req.id}
                        onClick={() => review(req.id, "more_info_required")}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 text-amber-800 text-xs font-semibold hover:bg-amber-50 disabled:opacity-60"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Request info
                      </button>
                      <button
                        type="button"
                        disabled={actingId === req.id}
                        onClick={() => review(req.id, "rejected")}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50 disabled:opacity-60"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
