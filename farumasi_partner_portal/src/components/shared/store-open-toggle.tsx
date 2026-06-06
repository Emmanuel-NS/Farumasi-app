"use client";

import { useEffect, useState } from "react";
import { Loader2, Power, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { getApiError } from "@/lib/api";
import { sellerService, type SellerOpenStatus } from "@/lib/services/seller.service";
import { Card, CardContent } from "@/components/ui/card";

export function StoreOpenToggle({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<SellerOpenStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    sellerService
      .getOpenStatus()
      .then(setStatus)
      .catch((err) => toast.error(getApiError(err, "Could not load store status")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async () => {
    if (!status) return;
    const next = !status.is_open;
    setSaving(true);
    try {
      const updated = await sellerService.setOpen(next);
      setStatus(updated);
      toast.success(
        next
          ? "Store open — all your pharmacies & companies are visible to patients"
          : "Store closed — hidden from patients (products & prices excluded)",
      );
    } catch (err) {
      toast.error(getApiError(err, "Failed to update store status"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", compact ? "py-1" : "py-3")}>
        <Loader2 className="w-4 h-4 animate-spin" /> Loading store status…
      </div>
    );
  }

  if (!status) return null;

  const isOpen = status.is_open;
  const label = status.entities.map((e) => e.name).join(" · ") || "Your store";

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors border",
          isOpen
            ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
            : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200",
        )}
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
        {isOpen ? "Open" : "Closed"}
      </button>
    );
  }

  return (
    <Card className={cn("border-2", isOpen ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-slate-50")}>
      <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
              isOpen ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500",
            )}
          >
            <Store className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-lg">
              {isOpen
                ? "Patients see your listings, prices, and can select you at checkout."
                : "Hidden from patients — as if your store does not exist until you reopen."}
            </p>
            {status.entities.length > 1 && (
              <p className="text-[11px] text-slate-400 mt-1">
                Updates {status.entities.length} seller profiles (pharmacy & company records)
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isOpen}
          disabled={saving}
          onClick={toggle}
          className={cn(
            "relative inline-flex h-9 w-[4.5rem] shrink-0 cursor-pointer rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            isOpen ? "bg-emerald-500 border-emerald-500" : "bg-slate-300 border-slate-300",
            saving && "opacity-60 cursor-wait",
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow transition translate-y-0.5",
              isOpen ? "translate-x-9" : "translate-x-0.5",
            )}
          />
        </button>
      </CardContent>
    </Card>
  );
}
