"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileSearch, Plus, Loader2, X, Send, Inbox, Wallet,
  CheckCircle2, XCircle, ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatRWF, timeAgo } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { getApiError } from "@/lib/api";
import {
  productRequestsService,
  type BackendProductRequest,
  type ProductRequestCreatePayload,
} from "@/lib/services/product-requests.service";
import {
  sellerChangeRequestsService,
  type SellerChangeRequest,
} from "@/lib/services/seller-change-requests.service";
import {
  revenueService,
  type BackendWithdrawal,
} from "@/lib/services/revenue.service";

const PRODUCT_TYPES = [
  { value: "medicine", label: "Medicine" },
  { value: "medical_device", label: "Medical Device" },
  { value: "food_supplements", label: "Food Supplements" },
  { value: "cosmetics", label: "Cosmetics" },
];

const EMPTY_FORM: ProductRequestCreatePayload = {
  product_name: "",
  category: "",
  product_type: "medicine",
  manufacturer: "",
  brand: "",
  description: "",
  intended_use: "",
  proposed_price: null,
};

type TabId = "submitted" | "inbox" | "withdrawals";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "submitted", label: "Submitted", icon: Send },
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "withdrawals", label: "Withdrawals", icon: Wallet },
];

const changeStatusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

function payoutSummary(w: BackendWithdrawal): string {
  const d = w.payout_details;
  if (!d || typeof d !== "object") return w.payout_method.replace(/_/g, " ");
  const parts: string[] = [];
  if (typeof d.account_name === "string" && d.account_name) parts.push(d.account_name);
  if (typeof d.account_number === "string" && d.account_number) parts.push(d.account_number);
  if (typeof d.phone === "string" && d.phone) parts.push(d.phone);
  if (typeof d.momo_code === "string" && d.momo_code) parts.push(`Code: ${d.momo_code}`);
  return parts.length ? parts.join(" · ") : w.payout_method.replace(/_/g, " ");
}

export default function RequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: TabId =
    tabParam === "inbox" || tabParam === "withdrawals" ? tabParam : "submitted";

  const [productRequests, setProductRequests] = useState<BackendProductRequest[]>([]);
  const [changeRequests, setChangeRequests] = useState<SellerChangeRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<BackendWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProductRequestCreatePayload>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const pendingInbox = useMemo(
    () => changeRequests.filter((r) => r.status === "pending"),
    [changeRequests],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [products, changes, wd] = await Promise.all([
        productRequestsService.list({ offset: 0, limit: 100 }),
        sellerChangeRequestsService.listAll(),
        revenueService.listWithdrawals(),
      ]);
      setProductRequests(products.items);
      setChangeRequests(changes);
      setWithdrawals(wd);
    } catch (err: unknown) {
      toast.error(getApiError(err, "Failed to load requests"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setTab = (tab: TabId) => {
    router.replace(tab === "submitted" ? "/requests" : `/requests?tab=${tab}`, { scroll: false });
  };

  const handleProductSubmit = async () => {
    if (!form.product_name.trim()) {
      toast.error("Product name is required");
      return;
    }
    setSubmitting(true);
    try {
      const created = await productRequestsService.create({
        ...form,
        product_name: form.product_name.trim(),
        category: form.category?.trim() || null,
        manufacturer: form.manufacturer?.trim() || null,
        brand: form.brand?.trim() || null,
        description: form.description?.trim() || null,
        intended_use: form.intended_use?.trim() || null,
      });
      try {
        await productRequestsService.submit(created.id);
      } catch {
        /* submit optional */
      }
      toast.success("Product request submitted");
      setShowForm(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err: unknown) {
      toast.error(getApiError(err, "Failed to submit request"));
    } finally {
      setSubmitting(false);
    }
  };

  async function handleApproveChange(id: string) {
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

  async function handleRejectChange(id: string) {
    setActionId(id);
    try {
      await sellerChangeRequestsService.reject(id);
      toast.success("Change declined");
      await load();
    } catch (err: unknown) {
      toast.error(getApiError(err, "Could not decline change"));
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Requests"
        description="Submit catalogue items, review FARUMASI proposals, and track withdrawal copies in one place."
        icon={FileSearch}
        actions={
          activeTab === "submitted" ? (
            <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4" /> New product request
            </Button>
          ) : activeTab === "withdrawals" ? (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" asChild>
              <Link href="/revenue">
                Request payout <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-2 border-b pb-1">
        {TABS.map(({ id, label, icon: Icon }) => {
          const count =
            id === "submitted"
              ? productRequests.length
              : id === "inbox"
                ? pendingInbox.length
                : withdrawals.length;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors",
                activeTab === id
                  ? "border-farumasi-600 text-farumasi-700"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
              {count > 0 && (
                <span
                  className={cn(
                    "text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center",
                    activeTab === id ? "bg-farumasi-100 text-farumasi-700" : "bg-slate-100 text-slate-600",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
        </div>
      ) : activeTab === "submitted" ? (
        productRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No product requests yet. Click{" "}
              <button type="button" className="font-medium text-farumasi-600 hover:underline" onClick={() => setShowForm(true)}>
                New product request
              </button>{" "}
              to submit one for pharmacist review.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {productRequests.map((req) => (
              <Card key={req.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{req.product_name}</CardTitle>
                      {(req.brand || req.manufacturer) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {[req.brand, req.manufacturer].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={req.status} type="request" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p className="font-medium capitalize">{req.product_type}</p>
                    </div>
                    {req.category && (
                      <div>
                        <p className="text-muted-foreground">Category</p>
                        <p className="font-medium capitalize">{req.category.replace(/_/g, " ")}</p>
                      </div>
                    )}
                    {typeof req.proposed_price === "number" && (
                      <div>
                        <p className="text-muted-foreground">Proposed Price</p>
                        <p className="font-medium">{formatRWF(req.proposed_price)}</p>
                      </div>
                    )}
                  </div>
                  {req.description && <p className="text-xs text-muted-foreground">{req.description}</p>}
                  {req.review_notes && (
                    <div
                      className={cn(
                        "rounded-lg px-3 py-2 text-xs border",
                        req.status === "approved"
                          ? "bg-green-50 text-green-900 border-green-200"
                          : req.status === "rejected"
                            ? "bg-red-50 text-red-800 border-red-200"
                            : "bg-amber-50 text-amber-800 border-amber-200",
                      )}
                    >
                      <span className="font-semibold">Pharmacist feedback: </span>
                      {req.review_notes}
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground">Submitted {timeAgo(req.created_at)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : activeTab === "inbox" ? (
        changeRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No incoming requests from FARUMASI. Agreement changes (e.g. commission rate) will appear here for your confirmation.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingInbox.length > 0 && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {pendingInbox.length} request{pendingInbox.length === 1 ? "" : "s"} need your confirmation before they take effect.
              </p>
            )}
            {changeRequests.map((item) => (
              <Card
                key={item.id}
                className={cn(
                  "transition-shadow",
                  item.status === "pending" ? "border-amber-200 bg-amber-50/30" : "",
                )}
              >
                <CardContent className="pt-5 space-y-3">
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
                        <p className="text-[11px] text-slate-600 mt-1">Note from FARUMASI: {item.admin_note}</p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1">
                        Received {timeAgo(item.created_at)}
                        {item.resolved_at ? ` · Resolved ${timeAgo(item.resolved_at)}` : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize",
                        changeStatusColors[item.status] ?? "bg-gray-100 text-gray-600 border-gray-200",
                      )}
                    >
                      {item.status}
                    </span>
                  </div>
                  {item.status === "pending" && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="gap-1 h-8 text-xs"
                        disabled={actionId === item.id}
                        onClick={() => void handleApproveChange(item.id)}
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
                        onClick={() => void handleRejectChange(item.id)}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Decline
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : withdrawals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground space-y-2">
            <p>No withdrawal requests yet.</p>
            <Button size="sm" variant="outline" asChild>
              <Link href="/revenue">Go to Revenue &amp; Wallet</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Copies of payout requests submitted from Revenue. FARUMASI pays manually after review — status updates here when processed.
          </p>
          {withdrawals.map((w) => (
            <Card key={w.id}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold">{formatRWF(w.amount)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                      {w.payout_method.replace(/_/g, " ")} · {payoutSummary(w)}
                    </p>
                    {w.admin_notes && (
                      <p className="text-[11px] text-slate-600 mt-1">Admin note: {w.admin_notes}</p>
                    )}
                    {w.payment_reference && (
                      <p className="text-[11px] text-green-700 mt-1">
                        Payment ref: <span className="font-mono">{w.payment_reference}</span>
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1">Requested {timeAgo(w.created_at)}</p>
                  </div>
                  <StatusBadge status={w.status} type="withdrawal" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-base">New product request</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="space-y-1.5">
                <Label>Product Name *</Label>
                <Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type *</Label>
                  <select
                    value={form.product_type}
                    onChange={(e) => setForm({ ...form, product_type: e.target.value })}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {PRODUCT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Input value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Manufacturer</Label>
                  <Input value={form.manufacturer || ""} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Brand</Label>
                  <Input value={form.brand || ""} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Proposed Price (RWF)</Label>
                <Input
                  type="number"
                  value={form.proposed_price ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, proposed_price: e.target.value ? parseFloat(e.target.value) : null })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea rows={3} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Intended Use</Label>
                <Textarea rows={2} value={form.intended_use || ""} onChange={(e) => setForm({ ...form, intended_use: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t bg-slate-50">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button className="flex-1 gap-1.5" onClick={() => void handleProductSubmit()} disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
