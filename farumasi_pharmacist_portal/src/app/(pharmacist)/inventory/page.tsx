"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TipTapUnderline from "@tiptap/extension-underline";
import {
  Search, X, ChevronLeft, ChevronRight,
  Loader2, Building2, Plus, Package,
  ChevronDown, Pencil, Eye,
  Calendar, TrendingUp,
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Undo2, Redo2,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import {
  productsService,
  type BackendProduct,
  type CreateProductInput,
  type UpdateProductInput,
} from "@/lib/services/products.service";
import { listingsService, type BackendListing } from "@/lib/services/listings.service";
import { pharmaciesService, type BackendPharmacy } from "@/lib/services/pharmacies.service";
import { ordersService } from "@/lib/services/orders.service";

/* ─── Constants ─────────────────────────────────────────── */
const CATEGORY_LIST = [
  "All", "Pain Relief", "Antibiotics", "Allergy & Asthma", "Cold & Flu",
  "Digestive Health", "Chronic Care", "Supplements", "Personal Care",
  "Antimalarial", "First Aid", "Wellness",
];

const BACKEND_CATEGORIES = [
  "Analgesics", "Antibiotics", "Antidiabetics", "Antihypertensives",
  "Antimalarials", "Antihistamines", "Gastrointestinal", "Respiratory",
  "Vitamins & Supplements", "Pain Relief", "Cold & Flu", "Allergy & Asthma",
  "Digestive Health", "Chronic Care", "Supplements", "Personal Care",
  "First Aid", "Wellness", "General",
];

const DOSAGE_FORMS = [
  "Tablet", "Capsule", "Syrup", "Injection", "Inhaler",
  "Cream", "Ointment", "Drops", "Sachet", "Patch", "Suppository", "Other",
];
const PRODUCT_TYPES = [
  { value: "medicine",      label: "Medicine"      },
  { value: "supplement",    label: "Supplement"    },
  { value: "device",        label: "Device"        },
  { value: "personal_care", label: "Personal Care" },
];

/* ─── Color helpers ─────────────────────────────────────── */
function categoryBg(cat?: string | null): string {
  const c = (cat ?? "").toLowerCase();
  if (c.includes("antibiotic"))                            return "bg-blue-100 text-blue-700 border-blue-200";
  if (c.includes("analgesic") || c.includes("pain"))      return "bg-orange-100 text-orange-700 border-orange-200";
  if (c.includes("malaria"))                               return "bg-red-100 text-red-700 border-red-200";
  if (c.includes("diabet") || c.includes("chronic"))      return "bg-purple-100 text-purple-700 border-purple-200";
  if (c.includes("vitamin") || c.includes("supplement"))  return "bg-yellow-100 text-yellow-700 border-yellow-200";
  if (c.includes("respiratory") || c.includes("cold") || c.includes("asthma"))
                                                           return "bg-sky-100 text-sky-700 border-sky-200";
  if (c.includes("gastro") || c.includes("digestive"))    return "bg-amber-100 text-amber-700 border-amber-200";
  if (c.includes("hypertension"))                         return "bg-rose-100 text-rose-700 border-rose-200";
  if (c.includes("antihistamine") || c.includes("allergy")) return "bg-teal-100 text-teal-700 border-teal-200";
  return "bg-farumasi-100 text-farumasi-700 border-farumasi-200";
}

function categoryGradient(cat?: string | null): string {
  const c = (cat ?? "").toLowerCase();
  if (c.includes("antibiotic"))                            return "from-blue-500 to-blue-700";
  if (c.includes("analgesic") || c.includes("pain"))      return "from-orange-400 to-orange-600";
  if (c.includes("malaria"))                               return "from-red-500 to-red-700";
  if (c.includes("diabet") || c.includes("chronic"))      return "from-purple-500 to-purple-700";
  if (c.includes("vitamin") || c.includes("supplement"))  return "from-yellow-400 to-amber-600";
  if (c.includes("respiratory") || c.includes("cold") || c.includes("asthma"))
                                                           return "from-sky-400 to-sky-600";
  if (c.includes("gastro") || c.includes("digestive"))    return "from-amber-500 to-amber-700";
  if (c.includes("hypertension"))                         return "from-rose-500 to-rose-700";
  if (c.includes("antihistamine") || c.includes("allergy")) return "from-teal-400 to-teal-600";
  return "from-farumasi-500 to-farumasi-700";
}

/* ─── Description helpers ───────────────────────────────── */
interface ParsedDesc {
  short: string;
  dosage_summary: string;
  overview: string;
  dosage_details: string;
  safety: string;
}
function parseDesc(raw?: string | null): ParsedDesc {
  const empty: ParsedDesc = { short: "", dosage_summary: "", overview: "", dosage_details: "", safety: "" };
  if (!raw) return empty;
  try {
    const p = JSON.parse(raw);
    if (p && typeof p === "object" && !Array.isArray(p)) return { ...empty, ...p };
  } catch {
    /* plain-text fallback */
  }
  return { ...empty, short: raw };
}
function serializeDesc(d: ParsedDesc): string { return JSON.stringify(d); }

/* ─── TipTap rich editor ────────────────────────────────── */
function RichEditor({
  initialContent,
  onChange,
  placeholder,
}: {
  initialContent: string;
  onChange: (html: string) => void;
  placeholder: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TipTapUnderline,
      Placeholder.configure({ placeholder }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: "min-h-[130px] px-3.5 py-3 focus:outline-none" },
    },
  });

  const btn = (active?: boolean) =>
    cn(
      "p-1.5 rounded text-slate-500 hover:bg-white hover:text-slate-800 transition-colors",
      active && "bg-white text-slate-900 shadow-sm",
    );

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center gap-0.5 px-2 py-1 bg-slate-50 border-b border-slate-100 flex-wrap">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBold().run(); }}
          className={btn(editor?.isActive("bold"))}
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleItalic().run(); }}
          className={btn(editor?.isActive("italic"))}
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleUnderline().run(); }}
          className={btn(editor?.isActive("underline"))}
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBulletList().run(); }}
          className={btn(editor?.isActive("bulletList"))}
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleOrderedList().run(); }}
          className={btn(editor?.isActive("orderedList"))}
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().undo().run(); }}
          disabled={!editor?.can().undo()}
          className={btn()}
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().redo().run(); }}
          disabled={!editor?.can().redo()}
          className={btn()}
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

/* ─── Availability badge ─────────────────────────────────── */
function AvailBadge({ status }: { status: string }) {
  if (status === "available")
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-farumasi-50 text-farumasi-700 border border-farumasi-200 whitespace-nowrap">
        Available
      </span>
    );
  if (status === "low_stock")
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 whitespace-nowrap">
        Low Stock
      </span>
    );
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 whitespace-nowrap">
      Out of Stock
    </span>
  );
}

/* ─── Product card (vertical, image top) ────────────────── */
function ProductCard({
  product,
  onView,
  onEdit,
}: {
  product: BackendProduct;
  onView: () => void;
  onEdit: () => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const grad    = categoryGradient(product.category);
  const catBg   = categoryBg(product.category);
  const initials = product.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "Rx";
  const desc    = parseDesc(product.description);

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-farumasi-200 transition-all duration-300 overflow-hidden flex flex-col">
      {/* Image / gradient area */}
      <div className={cn("relative h-44 overflow-hidden bg-gradient-to-br", grad)}>
        {product.image_url && !imgErr ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover"
            sizes="320px"
            onError={() => setImgErr(true)}
            unoptimized={product.image_url.startsWith("data:")}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-xl font-black text-white">{initials}</span>
            </div>
            {product.dosage_form && (
              <span className="text-[9px] font-bold text-white/70 uppercase tracking-widest">
                {product.dosage_form}
              </span>
            )}
          </div>
        )}
        {/* Rx badge */}
        {product.prescription_required && (
          <div className="absolute top-2.5 left-2.5 bg-violet-600/90 backdrop-blur-sm text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md">
            Rx
          </div>
        )}
        {/* Category badge */}
        {product.category && (
          <div className="absolute bottom-2.5 left-2.5">
            <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-lg border bg-white/95 backdrop-blur-sm", catBg)}>
              {product.category.replace(/_/g, " ")}
            </span>
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <button
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="flex items-center gap-1.5 bg-white text-slate-800 text-xs font-bold px-3.5 py-2 rounded-xl shadow-lg hover:bg-farumasi-50 hover:text-farumasi-700 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" /> View
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="flex items-center gap-1.5 bg-farumasi-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-lg hover:bg-farumasi-700 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        </div>
      </div>

      {/* Card body */}
      <div className="px-4 pt-3.5 pb-4 flex-1 flex flex-col">
        <p className="text-[14px] font-bold text-slate-900 leading-snug line-clamp-1">{product.name}</p>
        {product.generic_name && (
          <p className="text-[11px] text-slate-400 italic mt-0.5 truncate">{product.generic_name}</p>
        )}
        {desc.short && (
          <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{desc.short}</p>
        )}
        {product.strength && (
          <span className="mt-2 self-start text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {product.strength}
          </span>
        )}
        <div className="mt-auto pt-3 flex items-end justify-between gap-2">
          {product.price_from != null && product.price_from > 0 ? (
            <p className="text-[12px] font-extrabold text-farumasi-700">
              RWF {formatPrice(product.price_from)}{product.price_to != null && product.price_to > product.price_from ? `–${formatPrice(product.price_to)}` : ""}
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 italic">No price listed</p>
          )}
          {product.listing_count != null && product.listing_count > 0 && (
            <span className="shrink-0 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap">
              {product.listing_count} {product.listing_count === 1 ? "pharmacy" : "pharmacies"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Pharmacy list modal ────────────────────────────────── */
type PharmacyModalMode = "price" | "expiry";

function PharmacyListModal({
  listings,
  pharmacyMap,
  mode,
  productName,
  onClose,
}: {
  listings: BackendListing[];
  pharmacyMap: Map<string, string>;
  mode: PharmacyModalMode;
  productName: string;
  onClose: () => void;
}) {
  const sorted =
    mode === "price"
      ? [...listings].sort((a, b) => a.price - b.price)
      : [...listings]
          .filter((l) => l.expiry_date)
          .sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime());

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900">
              {mode === "price" ? "Pharmacy Prices" : "Expiry Dates by Pharmacy"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 max-w-[280px] truncate">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {sorted.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No data available</p>
          ) : (
            sorted.map((l, i) => {
              const name = l.pharmacy_id
                ? (pharmacyMap.get(l.pharmacy_id) ?? "Unknown Pharmacy")
                : "Partner Wholesale";
              if (mode === "price") {
                return (
                  <div key={l.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                    <span className="text-xs font-bold text-slate-300 w-4 shrink-0">{i + 1}</span>
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <p className="flex-1 text-sm font-medium text-slate-700 truncate">{name}</p>
                    <AvailBadge status={l.availability_status} />
                    <p className="text-sm font-extrabold text-farumasi-700 whitespace-nowrap ml-1">
                      RWF {l.price.toLocaleString()}
                    </p>
                  </div>
                );
              } else {
                const expDate   = l.expiry_date ? new Date(l.expiry_date) : null;
                const isExpired = expDate ? expDate.getTime() < Date.now() : false;
                const daysUntil = expDate ? Math.floor((expDate.getTime() - Date.now()) / 86400000) : null;
                const isNear    = daysUntil !== null && daysUntil < 90 && !isExpired;
                return (
                  <div key={l.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <p className="flex-1 text-sm font-medium text-slate-700 truncate">{name}</p>
                    <span className="text-xs text-slate-400 shrink-0">{l.stock_quantity} units</span>
                    {expDate ? (
                      <span
                        className={cn(
                          "text-xs font-bold px-2.5 py-1 rounded-lg shrink-0",
                          isExpired
                            ? "bg-red-50 text-red-700 border border-red-100"
                            : isNear
                            ? "bg-amber-50 text-amber-700 border border-amber-100"
                            : "bg-farumasi-50 text-farumasi-700 border border-farumasi-100",
                        )}
                      >
                        {isExpired ? "Expired" : formatDate(expDate.toISOString())}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic shrink-0">No expiry set</span>
                    )}
                  </div>
                );
              }
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Sales chart modal ──────────────────────────────────── */
function SalesChartModal({
  productId,
  productName,
  onClose,
}: {
  productId: string;
  productName: string;
  onClose: () => void;
}) {
  const [chartData, setChartData] = useState<{ month: string; units: number; revenue: number }[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await ordersService.getPharmacyOrders({ limit: 100 });
        if (cancelled) return;

        const now = new Date();
        const months: Record<string, { units: number; revenue: number }> = {};
        for (let i = 11; i >= 0; i--) {
          const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = d.toLocaleString("en", { month: "short", year: "2-digit" });
          months[key] = { units: 0, revenue: 0 };
        }
        for (const order of result.items) {
          for (const item of order.items) {
            if (item.product?.id === productId) {
              const key = new Date(order.created_at).toLocaleString("en", { month: "short", year: "2-digit" });
              if (key in months) {
                months[key].units   += item.quantity;
                months[key].revenue += item.total_price;
              }
            }
          }
        }
        if (!cancelled)
          setChartData(Object.entries(months).map(([month, v]) => ({ month, ...v })));
      } catch {
        if (!cancelled) toast.error("Could not load sales data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [productId]);

  const totalUnits   = chartData.reduce((s, d) => s + d.units, 0);
  const totalRevenue = chartData.reduce((s, d) => s + d.revenue, 0);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900">Sales Performance</h3>
            <p className="text-xs text-slate-400 mt-0.5 max-w-[320px] truncate">
              {productName} · Last 12 months
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-farumasi-400 animate-spin mb-3" />
            <p className="text-sm text-slate-400">Loading sales data…</p>
          </div>
        ) : (
          <div className="px-6 py-5">
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-farumasi-50 rounded-2xl px-4 py-3.5">
                <p className="text-2xl font-extrabold text-farumasi-700">{totalUnits.toLocaleString()}</p>
                <p className="text-xs font-medium text-farumasi-600 mt-0.5">Total Units Sold</p>
              </div>
              <div className="bg-slate-50 rounded-2xl px-4 py-3.5">
                <p className="text-xl font-extrabold text-slate-800">
                  RWF {Math.round(totalRevenue).toLocaleString()}
                </p>
                <p className="text-xs font-medium text-slate-500 mt-0.5">Total Revenue</p>
              </div>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#1e9e68" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1e9e68" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      fontSize: 12,
                      padding: "8px 12px",
                    }}
                    formatter={(val: number) => [val, "Units"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="units"
                    name="Units sold"
                    stroke="#1e9e68"
                    strokeWidth={2.5}
                    fill="url(#salesGrad)"
                    dot={{ fill: "#1e9e68", strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5, fill: "#1e9e68" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Product detail panel ───────────────────────────────── */
interface DetailPanelProps {
  product: BackendProduct;
  pharmacyMap: Map<string, string>;
  onClose: () => void;
  onEdit: () => void;
}

function ProductDetailPanel({ product, pharmacyMap, onClose, onEdit }: DetailPanelProps) {
  const [listings,        setListings]        = useState<BackendListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [activeModal,     setActiveModal]     = useState<null | "price" | "expiry" | "sales">(null);
  const [activeTab,       setActiveTab]       = useState<"overview" | "dosage" | "safety">("overview");

  useEffect(() => {
    let cancelled = false;
    listingsService
      .getListingsForProduct(product.id)
      .then((l) => { if (!cancelled) setListings(l); })
      .catch(() => toast.error("Could not load pharmacy data"))
      .finally(() => { if (!cancelled) setListingsLoading(false); });
    return () => { cancelled = true; };
  }, [product.id]);

  const prices    = listings.filter((l) => l.price > 0).map((l) => l.price);
  const minPrice  = prices.length ? Math.min(...prices) : null;
  const maxPrice  = prices.length ? Math.max(...prices) : null;
  const expiryTs  = listings.filter((l) => l.expiry_date).map((l) => new Date(l.expiry_date!).getTime());
  const nearestExp = expiryTs.length ? new Date(Math.min(...expiryTs)) : null;
  const latestExp  = expiryTs.length ? new Date(Math.max(...expiryTs)) : null;

  const grad    = categoryGradient(product.category);
  const catBg   = categoryBg(product.category);
  const initials = product.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "Rx";
  const desc    = parseDesc(product.description);

  return (
    <>
      <div className="fixed inset-0 z-50 flex" onClick={onClose}>
        <div className="flex-1 bg-black/40 backdrop-blur-[2px]" />
        <div
          className="bg-white w-full sm:w-[580px] h-full flex flex-col shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Gradient header */}
          <div className={cn("shrink-0 bg-gradient-to-br px-6 pt-5 pb-16 relative", grad)}>
            <div className="flex items-center justify-between mb-5">
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 text-white/75 hover:text-white text-xs font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit Product
              </button>
            </div>
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <span className="text-xl font-black text-white">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[18px] font-extrabold text-white leading-snug">{product.name}</h2>
                  {product.prescription_required && (
                    <span className="text-[9px] font-extrabold text-white bg-violet-600/80 px-2 py-0.5 rounded-md">
                      Rx
                    </span>
                  )}
                </div>
                {product.generic_name && (
                  <p className="text-sm text-white/70 italic mt-0.5">{product.generic_name}</p>
                )}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {product.strength && (
                    <span className="text-[10px] font-bold bg-white/20 text-white px-2.5 py-0.5 rounded-full">
                      {product.strength}
                    </span>
                  )}
                  {product.dosage_form && (
                    <span className="text-[10px] bg-white/15 text-white/80 px-2.5 py-0.5 rounded-full capitalize">
                      {product.dosage_form}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Insight cards (overlap header) */}
          <div className="px-5 -mt-8 shrink-0 z-10 relative">
            <div className="grid grid-cols-3 gap-2.5">

              {/* Pharmacies & price */}
              <button
                onClick={() => !listingsLoading && listings.length > 0 && setActiveModal("price")}
                className="bg-white rounded-2xl border border-slate-200 shadow-md p-3.5 text-left hover:shadow-lg hover:border-farumasi-200 transition-all"
              >
                <Building2 className="w-4 h-4 text-farumasi-600 mb-1.5" />
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Pharmacies</p>
                {listingsLoading ? (
                  <Loader2 className="w-3.5 h-3.5 text-slate-300 animate-spin mt-1" />
                ) : minPrice !== null ? (
                  <>
                    <p className="text-[11px] font-extrabold text-slate-900 leading-tight mt-0.5">
                      RWF {minPrice.toLocaleString()}–{maxPrice?.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-farumasi-600 font-semibold mt-0.5">
                      {listings.length} {listings.length === 1 ? "pharmacy" : "pharmacies"} →
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-0.5 italic">No listings</p>
                )}
              </button>

              {/* Sales */}
              <button
                onClick={() => setActiveModal("sales")}
                className="bg-white rounded-2xl border border-slate-200 shadow-md p-3.5 text-left hover:shadow-lg hover:border-farumasi-200 transition-all"
              >
                <TrendingUp className="w-4 h-4 text-farumasi-600 mb-1.5" />
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Sales</p>
                <p className="text-[11px] font-extrabold text-slate-900 mt-0.5">View trend</p>
                <p className="text-[10px] text-farumasi-600 font-semibold mt-0.5">Last 12 months →</p>
              </button>

              {/* Expiry range */}
              <button
                onClick={() => !listingsLoading && nearestExp && setActiveModal("expiry")}
                className="bg-white rounded-2xl border border-slate-200 shadow-md p-3.5 text-left hover:shadow-lg hover:border-farumasi-200 transition-all"
              >
                <Calendar className="w-4 h-4 text-farumasi-600 mb-1.5" />
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Expiry Range</p>
                {listingsLoading ? (
                  <Loader2 className="w-3.5 h-3.5 text-slate-300 animate-spin mt-1" />
                ) : nearestExp ? (
                  <>
                    <p className="text-[11px] font-extrabold text-slate-900 leading-tight mt-0.5">
                      {formatDate(nearestExp.toISOString())}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                      → {latestExp ? formatDate(latestExp.toISOString()) : "—"}
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-0.5 italic">No expiry data</p>
                )}
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto">

            {/* Patient-facing preview */}
            {(desc.short || desc.dosage_summary) && (
              <div className="px-5 pt-5 pb-4 border-b border-slate-100">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">
                  Patient Overview
                </p>
                {desc.short && (
                  <p className="text-sm text-slate-700 leading-relaxed">{desc.short}</p>
                )}
                {desc.dosage_summary && (
                  <div className="mt-2.5 bg-farumasi-50 rounded-xl px-3.5 py-2.5 border border-farumasi-100">
                    <p className="text-[10px] font-bold text-farumasi-700 mb-0.5 uppercase tracking-wide">
                      Dosage Guide
                    </p>
                    <p className="text-sm text-farumasi-800">{desc.dosage_summary}</p>
                  </div>
                )}
              </div>
            )}

            {/* Detailed article tabs */}
            {(desc.overview || desc.dosage_details || desc.safety) && (
              <div className="px-5 pt-5 pb-4 border-b border-slate-100">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">
                  Detailed Information
                </p>
                <div className="flex gap-1.5 mb-4">
                  {(["overview", "dosage", "safety"] as const).map((tab) => {
                    const has =
                      tab === "overview" ? !!desc.overview
                      : tab === "dosage"  ? !!desc.dosage_details
                      : !!desc.safety;
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                          "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all capitalize",
                          activeTab === tab
                            ? "bg-farumasi-600 text-white shadow-sm"
                            : has
                            ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            : "bg-slate-50 text-slate-300 cursor-default",
                        )}
                      >
                        {tab === "dosage" ? "Dosage" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    );
                  })}
                </div>
                <div
                  className="rich-content"
                  dangerouslySetInnerHTML={{
                    __html:
                      activeTab === "overview"
                        ? desc.overview ||
                          "<p style='color:#94a3b8;font-style:italic;font-size:0.875rem'>No overview content yet — edit this product to add it.</p>"
                        : activeTab === "dosage"
                        ? desc.dosage_details ||
                          "<p style='color:#94a3b8;font-style:italic;font-size:0.875rem'>No dosage details yet.</p>"
                        : desc.safety ||
                          "<p style='color:#94a3b8;font-style:italic;font-size:0.875rem'>No safety information yet.</p>",
                  }}
                />
              </div>
            )}

            {/* Product metadata */}
            <div className="px-5 pt-5 pb-6">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">
                Product Details
              </p>
              <div className="space-y-2">
                {product.manufacturer && (
                  <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                    <span className="text-[11px] font-bold text-slate-400 w-24 shrink-0">Manufacturer</span>
                    <span className="text-[13px] font-semibold text-slate-800">{product.manufacturer}</span>
                  </div>
                )}
                {product.category && (
                  <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                    <span className="text-[11px] font-bold text-slate-400 w-24 shrink-0">Category</span>
                    <span className={cn("text-[11px] font-bold px-2.5 py-0.5 rounded-full border", catBg)}>
                      {product.category.replace(/_/g, " ")}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                  <span className="text-[11px] font-bold text-slate-400 w-24 shrink-0">Type</span>
                  <span className="text-[13px] font-semibold text-slate-700 capitalize">
                    {product.product_type.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                  <span className="text-[11px] font-bold text-slate-400 w-24 shrink-0">Prescription</span>
                  <span
                    className={cn(
                      "text-[11px] font-bold px-2.5 py-0.5 rounded-full border",
                      product.prescription_required
                        ? "bg-violet-50 text-violet-700 border-violet-200"
                        : "bg-farumasi-50 text-farumasi-700 border-farumasi-200",
                    )}
                  >
                    {product.prescription_required ? "Required (Rx)" : "Not Required (OTC)"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      {activeModal === "price" && (
        <PharmacyListModal
          listings={listings}
          pharmacyMap={pharmacyMap}
          mode="price"
          productName={product.name}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === "expiry" && (
        <PharmacyListModal
          listings={listings}
          pharmacyMap={pharmacyMap}
          mode="expiry"
          productName={product.name}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === "sales" && (
        <SalesChartModal
          productId={product.id}
          productName={product.name}
          onClose={() => setActiveModal(null)}
        />
      )}
    </>
  );
}

/* ─── Edit product drawer ────────────────────────────────── */
interface EditDrawerProps {
  product: BackendProduct;
  onClose: () => void;
  onSaved: (updated: BackendProduct) => void;
}

function EditProductDrawer({ product, onClose, onSaved }: EditDrawerProps) {
  const parsed = parseDesc(product.description);

  const [form, setForm] = useState<UpdateProductInput & { prescription_required: boolean }>({
    name:                  product.name,
    generic_name:          product.generic_name ?? "",
    strength:              product.strength ?? "",
    dosage_form:           product.dosage_form ?? "",
    manufacturer:          product.manufacturer ?? "",
    category:              product.category ?? "",
    product_type:          product.product_type as CreateProductInput["product_type"],
    prescription_required: product.prescription_required,
  });
  const [desc,    setDesc]    = useState<ParsedDesc>(parsed);
  const [saving,  setSaving]  = useState(false);
  const [section, setSection] = useState<"identity" | "description">("identity");

  const setF = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [key]: val }));
  const setD = <K extends keyof ParsedDesc>(key: K, val: string) =>
    setDesc((p) => ({ ...p, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) { toast.error("Product name is required"); return; }
    setSaving(true);
    try {
      const updated = await productsService.updateProduct(product.id, {
        ...form,
        name:         form.name?.trim(),
        generic_name: form.generic_name?.trim() || null,
        strength:     form.strength?.trim() || null,
        dosage_form:  form.dosage_form?.trim() || null,
        manufacturer: form.manufacturer?.trim() || null,
        category:     form.category?.trim() || null,
        description:  serializeDesc(desc),
      });
      onSaved(updated);
      toast.success("Product updated successfully");
    } catch {
      toast.error("Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-300 focus:border-transparent transition-all bg-white";
  const labelCls = "block text-xs font-bold text-slate-600 mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="bg-slate-50 w-full sm:w-[580px] h-full flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Edit Product</h3>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[340px]">{product.name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-2">
            {(
              [
                { key: "identity",    label: "Product Identity" },
                { key: "description", label: "Description"      },
              ] as const
            ).map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSection(s.key)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all",
                  section === s.key
                    ? "bg-farumasi-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1 px-6 py-5 space-y-4">
            {section === "identity" ? (
              <>
                {/* Basic info */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Basic Information
                  </p>
                  <div>
                    <label className={labelCls}>
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      value={form.name ?? ""}
                      onChange={(e) => setF("name", e.target.value)}
                      placeholder="e.g. Paracetamol 500mg"
                      className={inputCls}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Generic Name</label>
                      <input
                        value={form.generic_name ?? ""}
                        onChange={(e) => setF("generic_name", e.target.value)}
                        placeholder="e.g. Acetaminophen"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Strength</label>
                      <input
                        value={form.strength ?? ""}
                        onChange={(e) => setF("strength", e.target.value)}
                        placeholder="e.g. 500mg"
                        className={inputCls}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Dosage Form</label>
                      <div className="relative">
                        <select
                          value={form.dosage_form ?? ""}
                          onChange={(e) => setF("dosage_form", e.target.value)}
                          className={cn(inputCls, "pr-10 appearance-none cursor-pointer")}
                        >
                          <option value="">— Select —</option>
                          {DOSAGE_FORMS.map((f) => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Manufacturer</label>
                      <input
                        value={form.manufacturer ?? ""}
                        onChange={(e) => setF("manufacturer", e.target.value)}
                        placeholder="e.g. Cipla Ltd"
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>

                {/* Classification */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Classification
                  </p>
                  <div>
                    <label className={labelCls}>Category</label>
                    <div className="relative">
                      <select
                        value={form.category ?? ""}
                        onChange={(e) => setF("category", e.target.value)}
                        className={cn(inputCls, "pr-10 appearance-none cursor-pointer")}
                      >
                        <option value="">— Select category —</option>
                        {BACKEND_CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Product Type</label>
                    <div className="grid grid-cols-4 gap-2">
                      {PRODUCT_TYPES.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setF("product_type", t.value as CreateProductInput["product_type"])}
                          className={cn(
                            "py-2 rounded-xl text-xs font-semibold border transition-all",
                            form.product_type === t.value
                              ? "bg-farumasi-600 text-white border-farumasi-600 shadow-sm"
                              : "bg-white text-slate-600 border-slate-200 hover:border-farumasi-300",
                          )}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Prescription toggle */}
                  <button
                    type="button"
                    onClick={() => setF("prescription_required", !form.prescription_required)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-xl px-4 py-3.5 border cursor-pointer transition-all text-left",
                      form.prescription_required
                        ? "bg-violet-50 border-violet-200"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <div
                      className={cn(
                        "relative shrink-0 rounded-full transition-colors",
                        form.prescription_required ? "bg-violet-600" : "bg-slate-300",
                      )}
                      style={{ height: 22, width: 40 }}
                    >
                      <div
                        className={cn(
                          "absolute top-0.5 rounded-full bg-white shadow transition-transform",
                          form.prescription_required ? "translate-x-5" : "translate-x-0.5",
                        )}
                        style={{ height: 18, width: 18 }}
                      />
                    </div>
                    <div>
                      <p className={cn("text-sm font-bold", form.prescription_required ? "text-violet-800" : "text-slate-700")}>
                        Requires Prescription (Rx)
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {form.prescription_required
                          ? "Patients need a valid prescription"
                          : "Available over the counter"}
                      </p>
                    </div>
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Patient-facing content */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                      Patient Card Content
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Shown on the product card patients see in the app.
                    </p>
                  </div>
                  <div>
                    <label className={labelCls}>Short Description</label>
                    <textarea
                      value={desc.short}
                      onChange={(e) => setD("short", e.target.value)}
                      rows={3}
                      placeholder="Brief description of what this medicine treats or is used for…"
                      className={cn(inputCls, "resize-none leading-relaxed")}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Dosage Summary</label>
                    <textarea
                      value={desc.dosage_summary}
                      onChange={(e) => setD("dosage_summary", e.target.value)}
                      rows={2}
                      placeholder="e.g. Take 1–2 tablets every 4–6 hours as needed, max 8 per day."
                      className={cn(inputCls, "resize-none leading-relaxed")}
                    />
                  </div>
                </div>

                {/* Rich article sections */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                      Detailed Article
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Comprehensive information shown in the product detail view.
                    </p>
                  </div>
                  <div>
                    <label className={cn(labelCls, "flex items-center gap-2")}>
                      <span className="w-2 h-2 rounded-full bg-farumasi-500 shrink-0" /> Overview
                    </label>
                    <RichEditor
                      initialContent={desc.overview}
                      onChange={(html) => setD("overview", html)}
                      placeholder="Write an overview — what this medicine is, what it treats, how it works…"
                    />
                  </div>
                  <div>
                    <label className={cn(labelCls, "flex items-center gap-2")}>
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" /> Dosage &amp; Administration
                    </label>
                    <RichEditor
                      initialContent={desc.dosage_details}
                      onChange={(html) => setD("dosage_details", html)}
                      placeholder="Recommended dosage, administration route, timing, and missed-dose guidance…"
                    />
                  </div>
                  <div>
                    <label className={cn(labelCls, "flex items-center gap-2")}>
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" /> Safety &amp; Warnings
                    </label>
                    <RichEditor
                      initialContent={desc.safety}
                      onChange={(html) => setD("safety", html)}
                      placeholder="Contraindications, side effects, drug interactions, and special warnings…"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="bg-white px-6 pb-6 pt-3 border-t border-slate-100 shrink-0 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-farumasi-600 text-white text-sm font-bold hover:bg-farumasi-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Add product drawer ─────────────────────────────────── */
interface AddDrawerProps {
  onClose: () => void;
  onCreated: (product: BackendProduct) => void;
}

function AddProductDrawer({ onClose, onCreated }: AddDrawerProps) {
  const [form, setForm] = useState<CreateProductInput>({
    name: "", generic_name: "", category: "",
    product_type: "medicine", dosage_form: "", strength: "",
    manufacturer: "", prescription_required: false,
  });
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof CreateProductInput>(key: K, val: CreateProductInput[K]) =>
    setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Product name is required"); return; }
    setSaving(true);
    try {
      const created = await productsService.createProduct({
        ...form,
        name:         form.name.trim(),
        generic_name: form.generic_name?.trim() || null,
        category:     form.category?.trim() || null,
        dosage_form:  form.dosage_form?.trim() || null,
        strength:     form.strength?.trim() || null,
        manufacturer: form.manufacturer?.trim() || null,
      });
      onCreated(created);
    } catch {
      toast.error("Failed to add product to catalogue");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-300 focus:border-transparent transition-all bg-white";
  const labelCls = "block text-xs font-bold text-slate-600 mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="bg-slate-50 w-full sm:w-[500px] h-full flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white px-6 pt-5 pb-4 border-b border-slate-100 shrink-0 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Add New Product</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Submit to the catalogue for partner pharmacies to stock.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="px-6 py-5 space-y-4 flex-1">
            {/* Product Identity */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                Product Identity
              </p>
              <div>
                <label className={labelCls}>
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Paracetamol 500mg"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Generic Name</label>
                  <input
                    value={form.generic_name ?? ""}
                    onChange={(e) => set("generic_name", e.target.value)}
                    placeholder="e.g. Acetaminophen"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Strength</label>
                  <input
                    value={form.strength ?? ""}
                    onChange={(e) => set("strength", e.target.value)}
                    placeholder="e.g. 500mg"
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Dosage Form</label>
                  <div className="relative">
                    <select
                      value={form.dosage_form ?? ""}
                      onChange={(e) => set("dosage_form", e.target.value)}
                      className={cn(inputCls, "pr-10 appearance-none cursor-pointer")}
                    >
                      <option value="">— Select —</option>
                      {DOSAGE_FORMS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Manufacturer</label>
                  <input
                    value={form.manufacturer ?? ""}
                    onChange={(e) => set("manufacturer", e.target.value)}
                    placeholder="e.g. Cipla Ltd"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* Classification */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                Classification
              </p>
              <div>
                <label className={labelCls}>Category</label>
                <div className="relative">
                  <select
                    value={form.category ?? ""}
                    onChange={(e) => set("category", e.target.value)}
                    className={cn(inputCls, "pr-10 appearance-none cursor-pointer")}
                  >
                    <option value="">— Select category —</option>
                    {BACKEND_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Product Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {PRODUCT_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => set("product_type", t.value as CreateProductInput["product_type"])}
                      className={cn(
                        "py-2 rounded-xl text-xs font-semibold border transition-all",
                        form.product_type === t.value
                          ? "bg-farumasi-600 text-white border-farumasi-600 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:border-farumasi-300",
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => set("prescription_required", !form.prescription_required)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl px-4 py-3.5 border cursor-pointer transition-all text-left",
                  form.prescription_required
                    ? "bg-violet-50 border-violet-200"
                    : "bg-slate-50 border-slate-200",
                )}
              >
                <div
                  className={cn(
                    "relative shrink-0 rounded-full transition-colors",
                    form.prescription_required ? "bg-violet-600" : "bg-slate-300",
                  )}
                  style={{ height: 22, width: 40 }}
                >
                  <div
                    className={cn(
                      "absolute top-0.5 rounded-full bg-white shadow transition-transform",
                      form.prescription_required ? "translate-x-5" : "translate-x-0.5",
                    )}
                    style={{ height: 18, width: 18 }}
                  />
                </div>
                <div>
                  <p className={cn("text-sm font-bold", form.prescription_required ? "text-violet-800" : "text-slate-700")}>
                    Requires Prescription (Rx)
                  </p>
                  <p className="text-xs text-slate-400">
                    {form.prescription_required
                      ? "Patients need a valid prescription"
                      : "Available over the counter"}
                  </p>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-white px-6 pb-6 pt-3 border-t border-slate-100 shrink-0 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-farumasi-600 text-white text-sm font-bold hover:bg-farumasi-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {saving ? "Adding…" : "Add to Catalogue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function InventoryPage() {
  const [products,      setProducts]      = useState<BackendProduct[]>([]);
  const [pharmacyMap,   setPharmacyMap]   = useState<Map<string, string>>(new Map());
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [category,      setCategory]      = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const router = useRouter();

  const chipRef = useRef<HTMLDivElement>(null);
  const scrollChips = (dir: "l" | "r") =>
    chipRef.current?.scrollBy({ left: dir === "l" ? -160 : 160, behavior: "smooth" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [prodResult, pharmResult] = await Promise.all([
          productsService.searchProducts({ limit: 100 }),
          pharmaciesService.listAll(),
        ]);
        if (cancelled) return;
        setProducts(prodResult.items);
        setPharmacyMap(new Map(pharmResult.items.map((p: BackendPharmacy) => [p.id, p.name])));
      } catch {
        if (!cancelled) toast.error("Could not load products");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let list = [...products];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category ?? "").toLowerCase().includes(q) ||
          (p.generic_name ?? "").toLowerCase().includes(q) ||
          (p.manufacturer ?? "").toLowerCase().includes(q),
      );
    }
    if (category !== "All")
      list = list.filter((p) =>
        (p.category ?? "").toLowerCase().includes(category.toLowerCase()),
      );
    return list;
  }, [products, search, category]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex flex-col gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search medicines, generics, manufacturers…"
              className="w-full h-10 pl-10 pr-9 rounded-xl bg-slate-100 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-200 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-farumasi-600 hover:bg-farumasi-700 text-white text-sm font-bold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>

        {/* Category chips */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => scrollChips("l")}
            className="shrink-0 p-1 text-farumasi-600 hover:bg-farumasi-50 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div ref={chipRef} className="flex gap-2 overflow-x-auto scrollbar-hide flex-1">
            {CATEGORY_LIST.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all",
                  category === c
                    ? "bg-farumasi-600 text-white border-farumasi-600 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-farumasi-300 hover:text-farumasi-700",
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <button
            onClick={() => scrollChips("r")}
            className="shrink-0 p-1 text-farumasi-600 hover:bg-farumasi-50 rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Count bar */}
      {!loading && (
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-2 shrink-0">
          <p className="text-xs text-slate-500">
            Showing{" "}
            <span className="font-bold text-slate-700">{filtered.length}</span> of{" "}
            <span className="font-bold text-slate-700">{products.length}</span> products
            {category !== "All" && (
              <span className="text-farumasi-600 font-semibold"> · {category}</span>
            )}
          </p>
        </div>
      )}

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="py-24 flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-farumasi-400 animate-spin mb-3" />
            <p className="text-slate-500 text-sm">Loading catalogue…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 flex flex-col items-center text-center">
            <Package className="w-14 h-14 text-slate-200 mb-3" />
            <p className="text-slate-700 font-bold text-base">
              {products.length === 0
                ? "No products in catalogue yet"
                : "No products match your search"}
            </p>
            {products.length === 0 && (
              <button
                onClick={() => setShowAdd(true)}
                className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-farumasi-600 text-white text-sm font-bold hover:bg-farumasi-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add First Product
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onView={() => router.push(`/inventory/${product.id}`)}
                onEdit={() => router.push(`/inventory/${product.id}?edit=1`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Overlays */}
      {showAdd && (
        <AddProductDrawer
          onClose={() => setShowAdd(false)}
          onCreated={(p) => {
            setProducts((prev) => [p, ...prev]);
            setShowAdd(false);
            toast.success(`"${p.name}" added to catalogue`);
          }}
        />
      )}
    </div>
  );
}

