"use client";

import { useEffect, useState } from "react";
import { FileSearch, Plus, Loader2, X, Send } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { timeAgo } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { getApiError } from "@/lib/api";
import {
  productRequestsService,
  type BackendProductRequest,
  type ProductRequestCreatePayload,
} from "@/lib/services/product-requests.service";

const PRODUCT_TYPES = [
  { value: "medicine",         label: "Medicine" },
  { value: "medical_device",   label: "Medical Device" },
  { value: "food_supplements", label: "Food Supplements" },
  { value: "cosmetics",        label: "Cosmetics" },
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

export default function RequestsPage() {
  const [requests, setRequests] = useState<BackendProductRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProductRequestCreatePayload>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await productRequestsService.list({ offset: 0, limit: 100 });
      setRequests(res.items);
    } catch (err: unknown) {
      toast.error(getApiError(err, "Failed to load requests"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
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
        // submit may not be required; ignore
      }
      toast.success("Request submitted");
      setShowForm(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err: unknown) {
      toast.error(getApiError(err, "Failed to submit request"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Product Requests"
        description="Submit and track requests to add new products to the FARUMASI catalogue"
        icon={FileSearch}
        actions={
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> New Request
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No product requests yet. Click <span className="font-medium">New Request</span> to submit one.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
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
                  <div><p className="text-muted-foreground">Type</p><p className="font-medium capitalize">{req.product_type}</p></div>
                  {req.category && <div><p className="text-muted-foreground">Category</p><p className="font-medium capitalize">{req.category.replace(/_/g, " ")}</p></div>}
                  {typeof req.proposed_price === "number" && (
                    <div><p className="text-muted-foreground">Proposed Price</p><p className="font-medium">RWF {req.proposed_price.toLocaleString()}</p></div>
                  )}
                  {req.manufacturer && <div><p className="text-muted-foreground">Manufacturer</p><p className="font-medium">{req.manufacturer}</p></div>}
                </div>

                {req.description && <p className="text-xs text-muted-foreground">{req.description}</p>}
                {req.intended_use && (
                  <p className="text-xs"><span className="text-muted-foreground">Intended use: </span>{req.intended_use}</p>
                )}

                {req.review_notes && (
                  <div className={`rounded-lg px-3 py-2 text-xs ${
                    req.status === "approved"
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                  }`}>
                    <span className="font-semibold">Review Note: </span>{req.review_notes}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-muted-foreground">Submitted {timeAgo(req.created_at)}</span>
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
              <h3 className="font-bold text-base">New Product Request</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="space-y-1.5">
                <Label>Product Name *</Label>
                <Input value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type *</Label>
                  <select
                    value={form.product_type}
                    onChange={e => setForm({ ...form, product_type: e.target.value })}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {PRODUCT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Input value={form.category || ""} onChange={e => setForm({ ...form, category: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Manufacturer</Label>
                  <Input value={form.manufacturer || ""} onChange={e => setForm({ ...form, manufacturer: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Brand</Label>
                  <Input value={form.brand || ""} onChange={e => setForm({ ...form, brand: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Proposed Price (RWF)</Label>
                <Input
                  type="number"
                  value={form.proposed_price ?? ""}
                  onChange={e => setForm({ ...form, proposed_price: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={form.description || ""}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Intended Use</Label>
                <Textarea
                  rows={2}
                  value={form.intended_use || ""}
                  onChange={e => setForm({ ...form, intended_use: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t bg-slate-50">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)} disabled={submitting}>Cancel</Button>
              <Button className="flex-1 gap-1.5" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
