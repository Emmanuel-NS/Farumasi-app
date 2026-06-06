"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { getApiError } from "@/lib/api";
import {
  sellerChangeRequestsService,
  type SellerChangeRequest,
} from "@/lib/services/seller-change-requests.service";

export function PendingChangeRequestsCard() {
  const [items, setItems] = useState<SellerChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await sellerChangeRequestsService.listPending();
      setItems(rows);
    } catch (err: unknown) {
      toast.error(getApiError(err, "Failed to load pending approvals"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleApprove(id: string) {
    setActionId(id);
    try {
      await sellerChangeRequestsService.approve(id);
      toast.success("Change approved — your profile is updated");
      await load();
    } catch (err: unknown) {
      toast.error(getApiError(err, "Could not approve change"));
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(id: string) {
    setActionId(id);
    try {
      await sellerChangeRequestsService.reject(id);
      toast.success("Change rejected");
      await load();
    } catch (err: unknown) {
      toast.error(getApiError(err, "Could not reject change"));
    } finally {
      setActionId(null);
    }
  }

  if (loading) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="py-6 flex items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Checking for pending approvals…
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/40">
      <CardHeader>
        <CardTitle className="text-base">Pending FARUMASI approvals</CardTitle>
        <CardDescription>
          Review proposed changes to your seller agreement before they take effect.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-amber-100 bg-white p-4 space-y-2"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {item.field_label}
                  {item.seller_name ? ` · ${item.seller_name}` : ""}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {item.current_value ?? "Not set"} →{" "}
                  <span className="font-semibold text-farumasi-700">{item.proposed_value}</span>
                  {item.field_name === "commission_rate_percent" ? "%" : ""}
                </p>
                {item.admin_note && (
                  <p className="text-[11px] text-slate-600 mt-1">Note: {item.admin_note}</p>
                )}
                <p className="text-[10px] text-slate-400 mt-1">{timeAgo(item.created_at)}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="gap-1 h-8 text-xs"
                  disabled={actionId === item.id}
                  onClick={() => void handleApprove(item.id)}
                >
                  {actionId === item.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 h-8 text-xs"
                  disabled={actionId === item.id}
                  onClick={() => void handleReject(item.id)}
                >
                  <XCircle className="w-3.5 h-3.5" /> Decline
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
