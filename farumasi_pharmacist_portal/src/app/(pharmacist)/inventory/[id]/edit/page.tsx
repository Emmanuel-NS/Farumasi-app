"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { RichEditor } from "@/components/ui/rich-editor";
import {
  ArrowLeft, Loader2, Upload, Link2, ImageOff,
  X, Check, ChevronDown, Save,
} from "lucide-react";
import { toast } from "sonner";
import { getApiError } from "@/lib/api";
import {
  productsService,
  type BackendProduct,
  type CreateProductInput,
  type UpdateProductInput,
} from "@/lib/services/products.service";

/* ─── Constants ─────────────────────────────────────────── */
const ALL_CATEGORIES = [
  "Analgesics",
  "Antibiotics",
  "Antidiabetics",
  "Antihypertensives",
  "Antimalarials",
  "Antihistamines",
  "Gastrointestinal",
  "Respiratory",
  "Vitamins & Supplements",
  "Pain Relief",
  "Cold & Flu",
  "Allergy & Asthma",
  "Digestive Health",
  "Chronic Care",
  "Supplements",
  "Personal Care",
  "First Aid",
  "Wellness",
  "General",
];

const DOSAGE_FORMS = [
  "Tablet", "Capsule", "Syrup", "Injection", "Inhaler",
  "Cream", "Ointment", "Drops", "Sachet", "Patch", "Suppository", "Other",
];

const PACKAGING_CLASSES = [
  { value: "tablets_capsules",   label: "Tablets / Capsules",       partial: true,  defaultUnit: "tablet" },
  { value: "sachets",            label: "Sachets",                  partial: true,  defaultUnit: "sachet" },
  { value: "ampoules_vials",     label: "Ampoules / Vials",         partial: true,  defaultUnit: "ampoule" },
  { value: "liquid_bottle",      label: "Liquid / Bottle",          partial: false, defaultUnit: "" },
  { value: "ointment_gel_cream", label: "Ointment / Gel / Cream",   partial: false, defaultUnit: "" },
  { value: "eye_ear_nose_drops", label: "Eye / Ear / Nose Drops",   partial: false, defaultUnit: "" },
  { value: "inhaler_spray",      label: "Inhaler / Spray",          partial: false, defaultUnit: "" },
  { value: "other",              label: "Other",                    partial: false, defaultUnit: "" },
];

const PRODUCT_TYPES = [
  { value: "medicine",         label: "Medicine"         },
  { value: "medical_device",   label: "Medical Device"   },
  { value: "food_supplements", label: "Food Supplements" },
  { value: "cosmetics",        label: "Cosmetics"        },
];

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
  } catch { /* plain-text fallback */ }
  return { ...empty, short: raw };
}
function serializeDesc(d: ParsedDesc): string { return JSON.stringify(d); }

/* ─── Category helpers ───────────────────────────────────── */
function parseCats(raw?: string | null): string[] {
  if (!raw) return [];
  return raw.split(",").map((c) => c.trim()).filter(Boolean);
}
function serializeCats(cats: string[]): string {
  return cats.join(",");
}

/* ─── Image picker ───────────────────────────────────────── */
function ImagePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [tab, setTab] = useState<"url" | "upload">("url");
  const [urlDraft, setUrlDraft] = useState(value);
  const [imgLoadErr, setImgLoadErr] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setUrlDraft(value); setImgLoadErr(false); }, [value]);

  const applyUrl = () => {
    onChange(urlDraft.trim());
    setImgLoadErr(false);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 4 * 1024 * 1024) { toast.error("Image must be under 4 MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      onChange(dataUrl);
      setUrlDraft(dataUrl);
      setImgLoadErr(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Product Image</p>

      {/* Preview */}
      <div className="flex items-start gap-4 mb-4">
        <div className="shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center relative">
          {value && !imgLoadErr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt="Product"
              className="w-full h-full object-cover"
              onError={() => setImgLoadErr(true)}
            />
          ) : (
            <div className="flex flex-col items-center text-slate-300">
              {imgLoadErr ? (
                <><ImageOff className="w-6 h-6 mb-1" /><span className="text-[9px]">Bad URL</span></>
              ) : (
                <><Upload className="w-6 h-6 mb-1" /><span className="text-[9px]">No image</span></>
              )}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 leading-relaxed">
            {value
              ? value.startsWith("data:")
                ? "Local file preview — save will use the current server URL."
                : "Image URL applied."
              : "No image set."}
          </p>
          {value && (
            <button
              type="button"
              onClick={() => { onChange(""); setUrlDraft(""); setImgLoadErr(false); }}
              className="mt-1.5 flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              <X className="w-3 h-3" /> Remove
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setTab("url")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
            tab === "url" ? "bg-farumasi-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200",
          )}
        >
          <Link2 className="w-3.5 h-3.5" /> URL
        </button>
        <button
          type="button"
          onClick={() => setTab("upload")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
            tab === "upload" ? "bg-farumasi-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200",
          )}
        >
          <Upload className="w-3.5 h-3.5" /> Upload
        </button>
      </div>

      {/* Controls */}
      {tab === "url" ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyUrl())}
              placeholder="https://example.com/image.jpg or data:image/..."
              className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-300 focus:border-transparent"
            />
            <button
              type="button"
              onClick={applyUrl}
              className="shrink-0 px-4 py-2.5 rounded-xl bg-farumasi-600 text-white text-sm font-bold hover:bg-farumasi-700 transition-colors flex items-center"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-slate-400">Paste URL or base64 data URI, then press Enter or ✓</p>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-farumasi-300 text-farumasi-700 text-sm font-bold hover:bg-farumasi-50 transition-colors w-full justify-center"
          >
            <Upload className="w-4 h-4" /> Choose Image File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
          <p className="text-[10px] text-slate-400">Supported: JPEG, PNG, WebP, GIF (max 4 MB)</p>
        </div>
      )}
    </div>
  );
}

/* ─── Multi-category selector ───────────────────────────── */
function CategorySelector({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (cats: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const toggle = (cat: string) => {
    if (selected.includes(cat)) {
      onChange(selected.filter((c) => c !== cat));
    } else {
      onChange([...selected, cat]);
    }
  };

  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1.5">
        Categories{" "}
        <span className="text-slate-400 font-normal">(select all that apply)</span>
      </label>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between border rounded-xl px-3.5 py-2.5 text-sm text-left transition-all bg-white",
          open
            ? "border-farumasi-400 ring-2 ring-farumasi-200"
            : "border-slate-200 hover:border-slate-300",
        )}
      >
        <span
          className={
            selected.length === 0 ? "text-slate-400" : "text-slate-900 font-medium"
          }
        >
          {selected.length === 0
            ? "— Select categories —"
            : selected.join(", ")}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="mt-1.5 border border-slate-200 rounded-xl bg-white shadow-lg overflow-hidden relative z-10">
          <div className="max-h-52 overflow-y-auto">
            {ALL_CATEGORIES.map((cat) => {
              const checked = selected.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggle(cat)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors",
                    checked
                      ? "bg-farumasi-50 text-farumasi-800"
                      : "text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                      checked
                        ? "bg-farumasi-600 border-farumasi-600"
                        : "border-slate-300",
                    )}
                  >
                    {checked && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  {cat}
                </button>
              );
            })}
          </div>
          {selected.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-2 flex items-center justify-between">
              <span className="text-xs text-slate-500">{selected.length} selected</span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-red-500 hover:text-red-600 font-semibold"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}

      {selected.length > 0 && !open && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map((cat) => (
            <span
              key={cat}
              className="flex items-center gap-1 bg-farumasi-50 text-farumasi-700 border border-farumasi-200 text-xs font-semibold px-2.5 py-0.5 rounded-full"
            >
              {cat}
              <button
                type="button"
                onClick={() => toggle(cat)}
                className="hover:text-red-500 transition-colors ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [product, setProduct] = useState<BackendProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* form state */
  const [imageUrl,    setImageUrl]    = useState("");
  const [name,        setName]        = useState("");
  const [genericName, setGenericName] = useState("");
  const [strength,    setStrength]    = useState("");
  const [dosageForm,  setDosageForm]  = useState("");
  const [manufacturer,setManufacturer]= useState("");
  const [brand,       setBrand]       = useState("");
  const [categories,  setCategories]  = useState<string[]>([]);
  const [productType, setProductType] = useState<CreateProductInput["product_type"]>("medicine");
  const [rxRequired,  setRxRequired]  = useState(false);

  /* Packaging / partial selling */
  const [packagingClass,  setPackagingClass]  = useState("");
  const [unitsPerPack,    setUnitsPerPack]    = useState("");
  const [minPartialQty,   setMinPartialQty]   = useState("1");
  const [partialUnitName, setPartialUnitName] = useState("");

  const pkgInfo = PACKAGING_CLASSES.find((c) => c.value === packagingClass);
  const allowsPartial = pkgInfo?.partial ?? false;

  const handlePickPackaging = (val: string) => {
    setPackagingClass(val);
    const info = PACKAGING_CLASSES.find((c) => c.value === val);
    // Only auto-fill unit name if the user hasn't typed one yet
    if (info?.defaultUnit && !partialUnitName) setPartialUnitName(info.defaultUnit);
    // Tablets/capsules require min order of at least 2 units
    if (val === "tablets_capsules") {
      const n = Number(minPartialQty);
      if (!Number.isFinite(n) || n < 2) setMinPartialQty("2");
    }
  };

  const [shortDesc,     setShortDesc]     = useState("");
  const [dosageSummary, setDosageSummary] = useState("");
  const [overview,      setOverview]      = useState("");
  const [dosageDetails, setDosageDetails] = useState("");
  const [safety,        setSafety]        = useState("");
  const [informationSourceUrl, setInformationSourceUrl] = useState("");

  /* fetch product */
  useEffect(() => {
    let cancelled = false;
    productsService
      .getProduct(id)
      .then((p) => {
        if (cancelled) return;
        const desc = parseDesc(p.description);
        setProduct(p);
        setImageUrl(p.image_url ?? "");
        setName(p.name);
        setGenericName(p.generic_name ?? "");
        setStrength(p.strength ?? "");
        setDosageForm(p.dosage_form ?? "");
        setManufacturer(p.manufacturer ?? "");
        setBrand(p.brand ?? "");
        setCategories(parseCats(p.category));
        setProductType(p.product_type as CreateProductInput["product_type"]);
        setRxRequired(p.prescription_required);
        setShortDesc(desc.short);
        // Packaging
        setPackagingClass(p.packaging_class ?? "");
        setUnitsPerPack(p.units_per_pack != null ? String(p.units_per_pack) : "");
        const defaultMin =
          p.packaging_class === "tablets_capsules" ? "2" : "1";
        setMinPartialQty(
          p.min_partial_quantity != null ? String(p.min_partial_quantity) : defaultMin
        );
        setPartialUnitName(p.partial_unit_name ?? "");
        setDosageSummary(desc.dosage_summary);
        setOverview(desc.overview);
        setDosageDetails(desc.dosage_details);
        setSafety(desc.safety);
        setInformationSourceUrl(p.information_source_url ?? "");
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Product not found");
          router.push("/inventory");
        }
      });
    return () => { cancelled = true; };
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Product name is required"); return; }
    if (productType === "medicine" && !informationSourceUrl.trim()) {
      toast.error("Information source URL (PIL) is required for medicines");
      return;
    }
    if (allowsPartial && !partialUnitName.trim()) {
      toast.error("Unit name is required for partial-selling packaging (e.g. tablet, sachet)");
      return;
    }
    if (packagingClass === "tablets_capsules") {
      const minQ = Number(minPartialQty);
      if (!Number.isFinite(minQ) || minQ < 2) {
        toast.error("Minimum order for tablets/capsules must be at least 2 units");
        return;
      }
    }
    setSaving(true);
    try {
      const input: UpdateProductInput = {
        name:                  name.trim(),
        generic_name:          genericName.trim() || null,
        strength:              strength.trim() || null,
        dosage_form:           dosageForm.trim() || null,
        manufacturer:          manufacturer.trim() || null,
        brand:                 brand.trim() || null,
        image_url:             imageUrl.trim() || null,
        category:              serializeCats(categories) || null,
        product_type:          productType,
        prescription_required: rxRequired,
        description:           serializeDesc({
          short: shortDesc,
          dosage_summary: dosageSummary,
          overview,
          dosage_details: dosageDetails,
          safety,
        }),
        packaging_class:       packagingClass || null,
        units_per_pack:        allowsPartial && unitsPerPack ? Number(unitsPerPack) : null,
        min_partial_quantity:  allowsPartial && minPartialQty ? Number(minPartialQty) : null,
        partial_unit_name:     allowsPartial ? (partialUnitName.trim() || null) : null,
        information_source_url: informationSourceUrl.trim() || null,
      };
      await productsService.updateProduct(id, input);
      toast.success("Product updated");
      router.push(`/inventory/${id}`);
    } catch (err) {
      toast.error(getApiError(err, "Failed to save changes"));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !product) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-farumasi-400 animate-spin mb-3" />
        <p className="text-sm text-slate-400">Loading product…</p>
      </div>
    );
  }

  const inputCls =
    "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-300 focus:border-transparent transition-all bg-white";
  const labelCls = "block text-xs font-bold text-slate-600 mb-1.5";
  const cardCls  = "bg-white rounded-2xl border border-slate-200 p-5 space-y-4";
  const sectionHeadCls = "text-[10px] font-extrabold text-slate-400 uppercase tracking-widest";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col min-h-full">

      {/* ── Sticky top bar ───────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0 sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => router.push(`/inventory/${id}`)}
            className="shrink-0 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Editing</p>
            <h1 className="text-base font-extrabold text-slate-900 truncate">{product.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => router.push(`/inventory/${id}`)}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-farumasi-600 text-white text-sm font-bold hover:bg-farumasi-700 disabled:opacity-60 transition-colors shadow-sm"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* ── Scrollable body ──────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left column */}
            <div className="lg:col-span-1 space-y-5">

              <ImagePicker value={imageUrl} onChange={setImageUrl} />

              {/* Classification */}
              <div className={cardCls}>
                <p className={sectionHeadCls}>Classification</p>

                <CategorySelector selected={categories} onChange={setCategories} />

                <div>
                  <label className={labelCls}>Product Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PRODUCT_TYPES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() =>
                          setProductType(t.value as CreateProductInput["product_type"])
                        }
                        className={cn(
                          "py-2 rounded-xl text-xs font-semibold border transition-all",
                          productType === t.value
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
                  onClick={() => setRxRequired((v) => !v)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-xl px-4 py-3.5 border cursor-pointer transition-all text-left",
                    rxRequired
                      ? "bg-violet-50 border-violet-200"
                      : "bg-slate-50 border-slate-200 hover:border-slate-300",
                  )}
                >
                  <div
                    className={cn(
                      "relative shrink-0 rounded-full transition-colors",
                      rxRequired ? "bg-violet-600" : "bg-slate-300",
                    )}
                    style={{ height: 22, width: 40 }}
                  >
                    <div
                      className={cn(
                        "absolute top-0.5 rounded-full bg-white shadow transition-transform",
                        rxRequired ? "translate-x-5" : "translate-x-0.5",
                      )}
                      style={{ height: 18, width: 18 }}
                    />
                  </div>
                  <div>
                    <p
                      className={cn(
                        "text-sm font-bold",
                        rxRequired ? "text-violet-800" : "text-slate-700",
                      )}
                    >
                      Requires Prescription (Rx)
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {rxRequired
                        ? "Patients need a valid prescription"
                        : "Available over the counter"}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Right column */}
            <div className="lg:col-span-2 space-y-5">

              {/* Basic Information */}
              <div className={cardCls}>
                <p className={sectionHeadCls}>Basic Information</p>

                <div>
                  <label className={labelCls}>
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Paracetamol 500mg"
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Generic Name</label>
                    <input
                      value={genericName}
                      onChange={(e) => setGenericName(e.target.value)}
                      placeholder="e.g. Acetaminophen"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Brand</label>
                    <input
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="e.g. Panadol"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Strength</label>
                    <input
                      value={strength}
                      onChange={(e) => setStrength(e.target.value)}
                      placeholder="e.g. 500mg"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Dosage Form</label>
                    <div className="relative">
                      <select
                        value={dosageForm}
                        onChange={(e) => setDosageForm(e.target.value)}
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
                </div>

                <div>
                  <label className={labelCls}>Manufacturer</label>
                  <input
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    placeholder="e.g. Cipla Ltd"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Packaging & Partial Selling */}
              <div className={cardCls}>
                <div>
                  <p className={sectionHeadCls}>Packaging &amp; Partial Selling</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Controls whether patients can buy individual units (tablets, sachets, ampoules) from a pack.
                  </p>
                </div>
                <div>
                  <label className={labelCls}>Packaging Class</label>
                  <div className="relative">
                    <select
                      value={packagingClass}
                      onChange={(e) => handlePickPackaging(e.target.value)}
                      className={cn(inputCls, "pr-10 appearance-none cursor-pointer")}
                    >
                      <option value="">— Not set —</option>
                      {PACKAGING_CLASSES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}{c.partial ? " — partial allowed" : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>
                {allowsPartial && (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={labelCls}>Units per pack</label>
                      <input
                        type="number" min={1} step={1}
                        value={unitsPerPack}
                        onChange={(e) => setUnitsPerPack(e.target.value)}
                        placeholder="e.g. 10"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Min order qty</label>
                      <input
                        type="number"
                        min={packagingClass === "tablets_capsules" ? 2 : 1}
                        step={1}
                        value={minPartialQty}
                        onChange={(e) => setMinPartialQty(e.target.value)}
                        placeholder={packagingClass === "tablets_capsules" ? "min 2" : "e.g. 5"}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Unit name</label>
                      <input
                        value={partialUnitName}
                        onChange={(e) => setPartialUnitName(e.target.value)}
                        placeholder="e.g. tablet"
                        className={inputCls}
                      />
                    </div>
                  </div>
                )}
                {packagingClass && !allowsPartial && (
                  <p className="text-[11px] text-slate-400">
                    This packaging class does not support partial unit selling.
                  </p>
                )}
              </div>

              {/* Patient Card Content */}
              <div className={cardCls}>
                <div>
                  <p className={sectionHeadCls}>Patient Card Content</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Shown on the product card patients see in the app.
                  </p>
                </div>
                <div>
                  <label className={labelCls}>Short Description</label>
                  <textarea
                    value={shortDesc}
                    onChange={(e) => setShortDesc(e.target.value)}
                    rows={3}
                    placeholder="Brief description of what this medicine treats or is used for…"
                    className={cn(inputCls, "resize-none leading-relaxed")}
                  />
                </div>
                <div>
                  <label className={labelCls}>Dosage Summary</label>
                  <textarea
                    value={dosageSummary}
                    onChange={(e) => setDosageSummary(e.target.value)}
                    rows={2}
                    placeholder="e.g. Take 1–2 tablets every 4–6 hours as needed, max 8 per day."
                    className={cn(inputCls, "resize-none leading-relaxed")}
                  />
                </div>
              </div>

              {/* Detailed Article */}
              <div className={cardCls}>
                <div>
                  <p className={sectionHeadCls}>Detailed Article</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Comprehensive information shown in the product detail view.
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-farumasi-500 shrink-0" />
                    Overview
                  </label>
                  <RichEditor
                    key={`overview-${id}`}
                    initialContent={overview}
                    onChange={setOverview}
                    placeholder="What this medicine is, what it treats, how it works…"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    Dosage &amp; Administration
                  </label>
                  <RichEditor
                    key={`dosage-${id}`}
                    initialContent={dosageDetails}
                    onChange={setDosageDetails}
                    placeholder="Recommended dosage, administration route, timing, and missed-dose guidance…"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    Safety &amp; Warnings
                  </label>
                  <RichEditor
                    key={`safety-${id}`}
                    initialContent={safety}
                    onChange={setSafety}
                    placeholder="Contraindications, side effects, drug interactions, and special warnings…"
                  />
                </div>
              </div>

              {productType === "medicine" && (
                <div className={cardCls}>
                  <p className={sectionHeadCls}>Regulatory information source</p>
                  <p className="text-xs text-slate-500">
                    Link to Rwanda FDA patient information leaflet (PIL) or other official source used for this product page.
                  </p>
                  <div>
                    <label className={labelCls}>Information source URL (PIL) *</label>
                    <input
                      type="url"
                      value={informationSourceUrl}
                      onChange={(e) => setInformationSourceUrl(e.target.value)}
                      placeholder="https://…/patient-information-leaflet-pil-2"
                      className={inputCls}
                    />
                  </div>
                </div>
              )}

              {/* Bottom CTA row */}
              <div className="flex gap-3 pb-6">
                <button
                  type="button"
                  onClick={() => router.push(`/inventory/${id}`)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-farumasi-600 text-white text-sm font-bold hover:bg-farumasi-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
