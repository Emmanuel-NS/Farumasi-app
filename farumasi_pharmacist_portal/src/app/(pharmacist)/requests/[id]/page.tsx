"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatPrice, formatDateTime, cn } from "@/lib/utils";
import {
  ArrowLeft, CheckCircle, XCircle, FileText, Phone, Loader2,
  ExternalLink, Pill, Clock, ZoomIn, X,
  Plus, Trash2, Send, ShoppingCart, Edit2, Check,
  Package, Archive,
} from "lucide-react";
import { toast } from "sonner";
import {
  prescriptionsService,
  type BackendPrescription,
  type PrescriptionItem,
  type PrescriptionReviewStatus,
  type SellMode,
} from "@/lib/services/prescriptions.service";
import { productsService, type BackendProduct } from "@/lib/services/products.service";
import { mediaUrl } from "@/lib/api";

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Encode sell_mode into instructions so it survives round-tripping through the
 * prescription item's `instructions` field.
 * Format:  "[sm:partial] actual instructions"
 */
function encodeInstructions(sellMode: SellMode, raw: string): string {
  const tag = sellMode === "partial" ? "[sm:partial] " : "";
  return tag + raw.trim();
}

function decodeSellMode(instructions: string | undefined): SellMode {
  if (instructions?.startsWith("[sm:partial]")) return "partial";
  return "pack";
}

function decodeInstructions(instructions: string | undefined): string {
  return (instructions ?? "").replace(/^\[sm:(pack|partial)\]\s*/, "");
}

// ── Product search combobox ──────────────────────────────────────────────────

function ProductSearch({ onSelect }: { onSelect: (p: BackendProduct) => void }) {
  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState<BackendProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await productsService.searchProducts({ search: q, limit: 8 });
      setResults(res.items);
    } catch { /* ignore */ }
    finally { setSearching(false); }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(v), 350);
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search medicine by name…"
          className="w-full border border-slate-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-farumasi-300 pr-8"
        />
        {searching && (
          <Loader2 className="w-4 h-4 text-farumasi-500 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
        )}
      </div>
      {results.length > 0 && (
        <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
          {results.map((p) => (
            <button key={p.id} type="button" onClick={() => { onSelect(p); setQuery(""); setResults([]); }}
              className="w-full text-left px-4 py-2.5 hover:bg-farumasi-50 transition-colors flex items-center gap-2 border-b border-slate-50 last:border-0">
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(p.image_url)} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-farumasi-100 flex items-center justify-center shrink-0">
                  <Pill className="w-4 h-4 text-farumasi-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                {p.strength && <p className="text-xs text-slate-400">{p.strength}</p>}
              </div>
              <div className="shrink-0 text-right">
                {p.allows_partial_selling && (
                  <span className="text-[9px] font-bold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded-full block mb-0.5">
                    Supports partial
                  </span>
                )}
                {p.price_from != null && (
                  <span className="text-xs text-farumasi-600 font-semibold">{formatPrice(p.price_from)} RWF</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Draft item type ───────────────────────────────────────────────────────────

interface DraftItem {
  id?: string;
  product_id?: string | null;
  product?: BackendProduct | null;
  medicine_name: string;
  dosage: string;
  frequency: string;
  quantity: number;
  instructions: string;
  sell_mode: SellMode;
  allows_partial: boolean;
}

// ── Cart item row (editable) ─────────────────────────────────────────────────

function CartItemRow({
  item, index, onUpdate, onRemove,
}: {
  item: DraftItem; index: number;
  onUpdate: (i: number, u: Partial<DraftItem>) => void;
  onRemove: (i: number) => void;
}) {
  const isPartial = item.sell_mode === "partial";
  const unitLabel = item.product?.partial_unit_name ?? "unit";

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
      {/* Top row: image / name / remove */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {item.product?.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(item.product.image_url)} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-farumasi-100 flex items-center justify-center shrink-0">
              <Pill className="w-4 h-4 text-farumasi-500" />
            </div>
          )}
          <div className="min-w-0">
            <input
              value={item.medicine_name}
              onChange={(e) => onUpdate(index, { medicine_name: e.target.value })}
              className="text-sm font-bold text-slate-900 truncate w-full bg-transparent border-0 outline-none focus:underline"
            />
            {item.product?.strength && <p className="text-xs text-slate-400">{item.product.strength}</p>}
          </div>
        </div>
        <button onClick={() => onRemove(index)}
          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Sell mode selector (only for products that allow partial selling) */}
      {item.allows_partial && (
        <div className="flex gap-2">
          {(["pack", "partial"] as const).map((mode) => (
            <button key={mode} type="button"
              onClick={() => onUpdate(index, { sell_mode: mode })}
              className={cn(
                "flex-1 text-xs font-bold py-1.5 rounded-xl border transition-all",
                item.sell_mode === mode
                  ? mode === "partial"
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-farumasi-600 text-white border-farumasi-600"
                  : "border-slate-200 text-slate-500 hover:border-farumasi-200"
              )}>
              {mode === "pack"
                ? <><Package className="w-3 h-3 inline mr-1" />Whole Pack</>
                : <><Archive className="w-3 h-3 inline mr-1" />Partial ({unitLabel}s)</>
              }
            </button>
          ))}
        </div>
      )}

      {/* Dosage + Frequency */}
      <div className="grid grid-cols-2 gap-2">
        <input value={item.dosage}
          onChange={(e) => onUpdate(index, { dosage: e.target.value })}
          placeholder="Dosage (e.g. 500mg)"
          className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-farumasi-300" />
        <input value={item.frequency}
          onChange={(e) => onUpdate(index, { frequency: e.target.value })}
          placeholder="Frequency (e.g. 3x/day)"
          className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-farumasi-300" />
      </div>

      {/* Quantity + instructions */}
      <div className="flex items-center gap-2">
        <div className="flex items-center border border-slate-200 rounded-xl px-2 py-1.5 gap-2 shrink-0">
          <button onClick={() => onUpdate(index, { quantity: Math.max(1, item.quantity - 1) })}
            className="w-5 h-5 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 font-bold text-sm">−</button>
          <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
          <button onClick={() => onUpdate(index, { quantity: item.quantity + 1 })}
            className="w-5 h-5 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 font-bold text-sm">+</button>
        </div>
        <span className="text-xs text-slate-400 shrink-0">
          {isPartial ? `${unitLabel}(s)` : "pack(s)"}
        </span>
        <input value={item.instructions}
          onChange={(e) => onUpdate(index, { instructions: e.target.value })}
          placeholder="Patient instructions (optional)…"
          className="flex-1 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-farumasi-300" />
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [rx, setRx]               = useState<BackendPrescription | null>(null);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);
  const [acting, setActing]       = useState(false);
  const [lightbox, setLightbox]   = useState(false);

  // Cart builder state
  const [cartItems, setCartItems] = useState<DraftItem[]>([]);
  const [cartNotes, setCartNotes] = useState("");
  const [sending, setSending]     = useState(false);
  const [cartMode, setCartMode]   = useState<"view" | "build">("view");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await prescriptionsService.getOne(id);
      setRx(data);
      if (data.status === "reviewed" && data.items.length > 0) {
        // Restore the pharmacist-built cart for view/edit.
        // Only do this for "reviewed" prescriptions — pre-existing doctor/patient
        // items from other statuses must NOT be auto-loaded into the build cart,
        // as that causes them to be duplicated when the pharmacist sends the cart.
        setCartItems(data.items.map((it) => ({
          id: it.id,
          product_id: it.product_id,
          medicine_name: it.medicine_name,
          dosage: it.dosage ?? "",
          frequency: it.frequency ?? "",
          quantity: it.quantity ?? 1,
          instructions: decodeInstructions(it.instructions),
          sell_mode: decodeSellMode(it.instructions),
          allows_partial: false,
        })));
        setCartNotes(data.notes ?? "");
        setCartMode("view");
      } else {
        // Non-reviewed prescription: pharmacist starts with a blank cart.
        // rx.items (doctor/patient prescription items) are shown as reference
        // in the prescription details panel but never pre-added to the build cart.
        setCartItems([]);
        setCartNotes("");
        setCartMode("build");
      }
    } catch { setNotFound(true); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const submitReview = async (reviewStatus: PrescriptionReviewStatus, label: string) => {
    if (!rx) return;
    setActing(true);
    try {
      await prescriptionsService.submitReview({
        prescription_id: rx.id,
        review_status: reviewStatus,
        review_notes: `Marked as ${label} by pharmacist.`,
      });
      setRx(await prescriptionsService.getOne(rx.id));
      toast.success(`Prescription ${label}`);
    } catch { toast.error("Could not update status"); }
    finally { setActing(false); }
  };

  const addProductToCart = (product: BackendProduct) => {
    setCartItems((prev) => [
      ...prev,
      {
        product_id: product.id,
        product,
        medicine_name: product.name,
        dosage: product.strength ?? "",
        frequency: "",
        quantity: 1,
        instructions: "",
        sell_mode: "pack",
        allows_partial: product.allows_partial_selling ?? false,
      },
    ]);
  };

  const addManualItem = () => {
    setCartItems((prev) => [
      ...prev,
      { medicine_name: "", dosage: "", frequency: "", quantity: 1, instructions: "", sell_mode: "pack", allows_partial: false },
    ]);
  };

  const updateItem = (idx: number, updates: Partial<DraftItem>) =>
    setCartItems((prev) => prev.map((it, i) => i === idx ? { ...it, ...updates } : it));

  const removeItem = (idx: number) =>
    setCartItems((prev) => prev.filter((_, i) => i !== idx));

  const sendCartToPatient = async () => {
    if (!rx) return;
    if (cartItems.length === 0) {
      toast.error("Add at least one medicine to the cart before sending");
      return;
    }
    const emptyNames = cartItems.some((it) => !it.medicine_name.trim());
    if (emptyNames) {
      toast.error("All items must have a medicine name");
      return;
    }
    setSending(true);
    try {
      // 1. Fetch the LATEST prescription so we have current item IDs (not stale state).
      //    This prevents duplicates when re-sending after a previous attempt.
      const latestRx = await prescriptionsService.getOne(rx.id);
      for (const existing of latestRx.items) {
        try { await prescriptionsService.deleteItem(rx.id, existing.id); }
        catch { /* already gone — keep going */ }
      }

      // 2. Add each draft item (encode sell_mode into instructions)
      for (const draft of cartItems) {
        await prescriptionsService.addItem(rx.id, {
          medicine_name: draft.medicine_name.trim(),
          product_id: draft.product_id ?? undefined,
          dosage: draft.dosage.trim() || undefined,
          frequency: draft.frequency.trim() || undefined,
          quantity: draft.quantity,
          // Encode sell_mode as a prefix so the patient portal can read it
          instructions: encodeInstructions(draft.sell_mode, draft.instructions),
        });
      }

      // 3. Save cart-level notes and mark as "reviewed" (cart ready for patient)
      await prescriptionsService.updatePrescription(rx.id, {
        notes: cartNotes.trim() || undefined,
        status: "reviewed",
      });

      const updated = await prescriptionsService.getOne(rx.id);
      setRx(updated);
      setCartMode("view");
      toast.success("Cart sent to patient successfully!");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg ?? "Could not send cart. Please try again.");
      console.error(err);
    } finally { setSending(false); }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-farumasi-600" />
      </div>
    );
  }
  if (notFound || !rx) {
    return (
      <div className="p-6 text-center py-24">
        <p className="text-slate-500">Request not found.</p>
        <button onClick={() => router.back()} className="text-farumasi-600 font-medium hover:underline mt-2 inline-block">
          Go Back
        </button>
      </div>
    );
  }

  const isNew         = rx.status === "draft" || rx.status === "active";
  const isUnderReview = rx.status === "under_review";
  const isReviewed    = rx.status === "reviewed";
  const isFinal       = ["fulfilled", "cancelled", "expired"].includes(rx.status);
  const isUploaded    = rx.prescription_type === "uploaded" || !!rx.uploaded_file_url;
  const isPdf         = rx.uploaded_file_url?.toLowerCase().includes(".pdf");
  const canBuildCart  = isNew || isUnderReview || isReviewed;

  return (
    <div className="p-6 max-w-2xl mx-auto pb-24">
      <button onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-farumasi-700 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Requests
      </button>

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-5 gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
            #{rx.id.slice(-8).toUpperCase()}
            {isUploaded && (
              <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                {isPdf ? "PDF" : "Image"}
              </span>
            )}
          </p>
          <h1 className="text-xl font-extrabold text-slate-900">
            {rx.patient?.user?.full_name ?? "Unknown Patient"}
          </h1>
          <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
            <Phone className="w-3.5 h-3.5" />
            {rx.patient?.user?.phone ?? "—"}
          </p>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Submitted {formatDateTime(rx.created_at)}
          </p>
        </div>
        <StatusBadge status={rx.status} type="request" />
      </div>

      {/* ── Prescription image / PDF ── */}
      {isUploaded && rx.uploaded_file_url && (
        <div className="mb-5">
          {!isPdf ? (
            <div className="relative rounded-3xl overflow-hidden border border-slate-200 bg-slate-50 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(rx.uploaded_file_url)} alt="Prescription" className="w-full max-h-72 object-contain cursor-zoom-in" onClick={() => setLightbox(true)} />
              <div className="absolute top-3 right-3 flex gap-2">
                <button onClick={() => setLightbox(true)}
                  className="w-8 h-8 rounded-xl bg-white/95 border border-slate-200 flex items-center justify-center shadow hover:bg-white">
                  <ZoomIn className="w-3.5 h-3.5 text-slate-600" />
                </button>
                <a href={mediaUrl(rx.uploaded_file_url)} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-xl bg-white/95 border border-slate-200 flex items-center justify-center shadow hover:bg-white">
                  <ExternalLink className="w-3.5 h-3.5 text-farumasi-600" />
                </a>
              </div>
            </div>
          ) : (
            <a href={mediaUrl(rx.uploaded_file_url)} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-3xl px-5 py-4 hover:bg-red-100 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-red-700">PDF Prescription</p>
                <p className="text-xs text-red-400 truncate mt-0.5">
                  {rx.uploaded_file_url.split("/").pop() ?? "prescription.pdf"}
                </p>
              </div>
              <ExternalLink className="w-5 h-5 text-red-400 shrink-0" />
            </a>
          )}
          <p className="text-[11px] text-slate-400 text-center mt-2">
            Review the uploaded prescription above before building the cart
          </p>
        </div>
      )}

      {/* ── Patient notes ── */}
      {rx.notes && !isReviewed && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-5">
          <p className="text-xs font-semibold text-amber-700 mb-1">Patient Notes</p>
          <p className="text-sm text-slate-900">{rx.notes}</p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          CART BUILDER
      ══════════════════════════════════════════════════════════════════ */}
      <div className={cn(
        "rounded-3xl border mb-5 overflow-hidden",
        isReviewed && cartMode === "view"
          ? "border-green-200 bg-green-50/30"
          : "border-farumasi-200 bg-farumasi-50/10"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-inherit">
          <div className="flex items-center gap-2.5">
            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center",
              isReviewed && cartMode === "view" ? "bg-green-100" : "bg-farumasi-100")}>
              <ShoppingCart className={cn("w-4 h-4", isReviewed && cartMode === "view" ? "text-green-600" : "text-farumasi-600")} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Patient Order Cart</p>
              <p className="text-xs text-slate-500">
                {isReviewed && cartMode === "view"
                  ? "Cart sent — patient is confirming"
                  : "Build the medicine list and send to patient"}
              </p>
            </div>
          </div>
          {isReviewed && cartMode === "view" && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
              <Check className="w-3 h-3" /> Sent
            </span>
          )}
          {canBuildCart && cartMode === "view" && (
            <button onClick={() => setCartMode("build")}
              className="flex items-center gap-1.5 text-xs font-semibold text-farumasi-600 hover:text-farumasi-700 transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
              {isReviewed ? "Edit & Resend" : "Build Cart"}
            </button>
          )}
        </div>

        {/* Sent cart read-only view */}
        {isReviewed && cartMode === "view" && rx.items.length > 0 && (
          <div className="p-5 space-y-2">
            {rx.items.map((item) => {
              const sm = decodeSellMode(item.instructions);
              const notes = decodeInstructions(item.instructions);
              return (
                <div key={item.id} className="flex items-start gap-3 bg-white rounded-2xl p-3 border border-green-100">
                  <div className="w-8 h-8 rounded-xl bg-farumasi-100 flex items-center justify-center shrink-0">
                    <Pill className="w-4 h-4 text-farumasi-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900">{item.medicine_name}</p>
                    <p className="text-xs text-slate-500">
                      {item.dosage ? `${item.dosage} · ` : ""}
                      {item.frequency ? `${item.frequency} · ` : ""}
                      Qty {item.quantity ?? 1}
                      {sm === "partial" && " units (partial)"}
                    </p>
                    {notes && <p className="text-[11px] text-farumasi-600 italic mt-0.5">{notes}</p>}
                  </div>
                  {sm === "partial" && (
                    <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full shrink-0">
                      Partial
                    </span>
                  )}
                </div>
              );
            })}
            {rx.notes && (
              <div className="mt-2 px-1">
                <p className="text-[11px] text-slate-500 font-semibold">Cart Notes:</p>
                <p className="text-xs text-slate-700 italic">{rx.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Build mode */}
        {cartMode === "build" && (
          <div className="p-5 space-y-4">
            {/* Partial-selling info */}
            <div className="text-xs text-slate-500 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2 flex items-start gap-2">
              <Archive className="w-3.5 h-3.5 text-purple-500 mt-0.5 shrink-0" />
              Products that support partial selling will show a <strong>Whole Pack / Partial</strong> toggle.
              Partial means you&apos;re prescribing individual {" "}
              <em>units</em> (tablets, capsules, sachets) instead of full packs.
            </div>

            {/* Product search */}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Add from Catalogue</p>
              <ProductSearch onSelect={addProductToCart} />
              <button onClick={addManualItem}
                className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-farumasi-700 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add manually
              </button>
            </div>

            {/* Item rows */}
            {cartItems.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Cart ({cartItems.length} item{cartItems.length !== 1 ? "s" : ""})
                </p>
                {cartItems.map((item, i) => (
                  <CartItemRow key={i} item={item} index={i} onUpdate={updateItem} onRemove={removeItem} />
                ))}
              </div>
            )}

            {cartItems.length === 0 && (
              <div className="text-center py-6 text-sm text-slate-400">
                <Pill className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                Search medicines above and add them to the cart
              </div>
            )}

            {/* Cart-level notes */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                Overall Cart Notes <span className="font-normal text-slate-400">(patient will see this)</span>
              </label>
              <textarea value={cartNotes} onChange={(e) => setCartNotes(e.target.value)}
                placeholder="E.g. Take with food. Complete the full course. Follow up in 1 week…"
                rows={2}
                className="w-full border border-slate-200 rounded-2xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-farumasi-300" />
            </div>

            {/* Send button */}
            <button onClick={sendCartToPatient} disabled={sending || cartItems.length === 0}
              className="w-full h-12 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors">
              {sending
                ? <><Loader2 className="w-5 h-5 animate-spin" />Sending…</>
                : <><Send className="w-5 h-5" />Send Cart to Patient</>}
            </button>
          </div>
        )}
      </div>

      {/* ── Quick actions (new prescriptions) ── */}
      {isNew && (
        <div className="flex gap-3 mb-5">
          <button onClick={() => submitReview("rejected", "rejected")} disabled={acting}
            className="flex-1 h-11 rounded-2xl border-2 border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 disabled:opacity-60 flex items-center justify-center gap-2">
            {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Reject
          </button>
          <button onClick={() => submitReview("clarification_needed", "under review")} disabled={acting}
            className="flex-1 h-11 rounded-2xl border-2 border-farumasi-200 text-farumasi-700 font-bold text-sm hover:bg-farumasi-50 disabled:opacity-60 flex items-center justify-center gap-2">
            {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Accept for Review
          </button>
        </div>
      )}

      {isUnderReview && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 text-sm text-blue-700 text-center mb-5">
          Build the cart above and send it to the patient when ready.
        </div>
      )}

      {isFinal && (
        <div className="text-center py-3 text-sm text-slate-400 font-medium mb-5">
          Prescription is {rx.status}.
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightbox && rx.uploaded_file_url && !isPdf && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}>
          <button onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30">
            <X className="w-5 h-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl(rx.uploaded_file_url)} alt="Prescription" className="max-w-full max-h-full object-contain rounded-2xl"
            onClick={(e) => e.stopPropagation()} />
          <a href={mediaUrl(rx.uploaded_file_url)} target="_blank" rel="noopener noreferrer"
            className="absolute bottom-4 right-4 flex items-center gap-1.5 text-sm font-semibold bg-white/20 text-white px-4 py-2 rounded-xl hover:bg-white/30"
            onClick={(e) => e.stopPropagation()}>
            <ExternalLink className="w-4 h-4" />
            Open Original
          </a>
        </div>
      )}
    </div>
  );
}
