"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { ordersService } from "@/lib/services/orders.service";
import { formatPrice, parseApiDateTime } from "@/lib/utils";
import {
  PharmacyReassignmentPanel,
  type ReassignmentOption,
} from "@/components/orders/pharmacy-reassignment-panel";

export default function SwitchPharmacyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [orderPharmacy, setOrderPharmacy] = useState("");
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<Awaited<ReturnType<typeof ordersService.getReassignmentOptions>> | null>(null);
  const [includeBelowPaid, setIncludeBelowPaid] = useState(false);
  const [reassigningId, setReassigningId] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    ordersService
      .getOrderById(id)
      .then((o) => setOrderPharmacy(o.pharmacy))
      .catch(() => setOrderPharmacy("your pharmacy"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    ordersService
      .getReassignmentOptions(id, includeBelowPaid)
      .then(setOptions)
      .catch(() => setOptions(null));
  }, [id, includeBelowPaid, refreshTick]);

  // Poll while the response window may still be resolving (missing or expired deadline).
  useEffect(() => {
    if (!id) return;
    const poll = window.setInterval(() => setRefreshTick((n) => n + 1), 30_000);
    return () => window.clearInterval(poll);
  }, [id]);

  useEffect(() => {
    const t = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const dueAt = options?.partner_response_due_at;
  const dueMs = dueAt ? parseApiDateTime(dueAt)?.getTime() ?? null : null;
  const waitMs = dueMs != null ? Math.max(0, dueMs - nowTick) : null;
  const switchEnabled = options?.switch_enabled ?? options?.can_reassign ?? false;
  const waitLabel = useMemo(() => {
    if (waitMs == null) return null;
    const totalSec = Math.ceil(waitMs / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  }, [waitMs]);

  useEffect(() => {
    if (switchEnabled || !dueMs) return;
    if (dueMs > nowTick) {
      const timer = window.setTimeout(() => setRefreshTick((n) => n + 1), dueMs - nowTick + 500);
      return () => window.clearTimeout(timer);
    }
    // Deadline passed but API still says locked — refresh soon.
    const timer = window.setTimeout(() => setRefreshTick((n) => n + 1), 2_000);
    return () => window.clearTimeout(timer);
  }, [dueMs, nowTick, switchEnabled]);

  const handleReassign = async (opt: ReassignmentOption, acceptNoChange: boolean) => {
    if (!id) return;
    const key = opt.pharmacy_id ?? opt.partner_company_id ?? "";
    setReassigningId(key);
    try {
      await ordersService.reassignPharmacy(id, {
        pharmacy_id: opt.pharmacy_id ?? undefined,
        partner_company_id: opt.partner_company_id ?? undefined,
        accept_no_change: acceptNoChange,
      });
      toast.success(`Order moved to ${opt.provider_name}`);
      router.push(`/orders/${id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not switch pharmacy");
    } finally {
      setReassigningId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center overflow-y-auto w-full p-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-farumasi-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto w-full p-4 pb-10 md:p-6 max-w-2xl mx-auto scrollbar-hide">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link
          href={`/orders/${id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-farumasi-700 dark:text-slate-400 dark:hover:text-farumasi-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to order tracking
        </Link>
      </div>

      <PharmacyReassignmentPanel
        pharmacyName={orderPharmacy}
        data={options}
        waitMs={waitMs}
        waitLabel={waitLabel}
        includeBelowPaid={includeBelowPaid}
        onIncludeBelowPaidChange={setIncludeBelowPaid}
        reassigningId={reassigningId}
        onReassign={handleReassign}
        formatPrice={formatPrice}
      />
    </div>
  );
}
