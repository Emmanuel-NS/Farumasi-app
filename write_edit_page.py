"""Write the full-page edit form for /inventory/[id]/edit."""
import os

TARGET = r"c:\Users\PC\Farumasi-app\farumasi_pharmacist_portal\src\app\(pharmacist)\inventory\[id]\edit\page.tsx"

CONTENT = '''\
"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TipTapUnderline from "@tiptap/extension-underline";
import {
  ArrowLeft, Loader2, Bold, Italic, Underline as UnderlineIcon,
  List, ListOrdered, Undo2, Redo2, Upload, Link2, ImageOff,
  X, Check, ChevronDown, Save,
} from "lucide-react";
import { toast } from "sonner";
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

const PRODUCT_TYPES = [
  { value: "medicine",      label: "Medicine"      },
  { value: "supplement",    label: "Supplement"    },
  { value: "device",        label: "Device"        },
  { value: "personal_care", label: "Personal Care" },
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
    extensions: [StarterKit, TipTapUnderline, Placeholder.configure({ placeholder })],
    content: initialContent,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: "min-h-[140px] px-4 py-3 focus:outline-none text-sm leading-relaxed" },
    },
  });

  const btn = (active?: boolean) =>
    cn(
      "p-1.5 rounded text-slate-500 hover:bg-white hover:text-slate-800 transition-colors",
      active && "bg-white text-slate-900 shadow-sm",
    );

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-slate-50 border-b border-slate-100 flex-wrap">
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
      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-4">Product Image</p>
      <div className="flex gap-6 flex-col sm:flex-row">
        {/* Preview */}
        <div className="shrink-0">
          <div className="w-36 h-36 rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center relative">
            {value && !imgLoadErr ? (
              <Image
                src={value}
                alt="Product"
                fill
                className="object-cover"
                sizes="144px"
                onError={() => setImgLoadErr(true)}
                unoptimized={value.startsWith("data:")}
              />
            ) : (
              <div className="flex flex-col items-center text-slate-300">
                {imgLoadErr ? (
                  <><ImageOff className="w-8 h-8 mb-1" /><span className="text-[10px]">Bad URL</span></>
                ) : (
                  <><Upload className="w-8 h-8 mb-1" /><span className="text-[10px]">No image</span></>
                )}
              </div>
            )}
          </div>
          {value && (
            <button
              type="button"
              onClick={() => { onChange(""); setUrlDraft(""); setImgLoadErr(false); }}
              className="mt-2 w-36 flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Remove
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="flex-1 min-w-0">
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

          {tab === "url" ? (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">Paste a direct image URL (HTTPS)</p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlDraft.startsWith("data:") ? "" : urlDraft}
                  onChange={(e) => setUrlDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyUrl())}
                  placeholder="https://example.com/image.jpg"
                  className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-300 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={applyUrl}
                  className="px-4 py-2.5 rounded-xl bg-farumasi-600 text-white text-sm font-bold hover:bg-farumasi-700 transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">Pick an image from your device (max 4 MB)</p>
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
              <p className="text-[10px] text-slate-400">Supported: JPEG, PNG, WebP, GIF</p>
            </div>
          )}
        </div>
      </div>
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

  const [shortDesc,     setShortDesc]     = useState("");
  const [dosageSummary, setDosageSummary] = useState("");
  const [overview,      setOverview]      = useState("");
  const [dosageDetails, setDosageDetails] = useState("");
  const [safety,        setSafety]        = useState("");

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
        setDosageSummary(desc.dosage_summary);
        setOverview(desc.overview);
        setDosageDetails(desc.dosage_details);
        setSafety(desc.safety);
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
      };
      await productsService.updateProduct(id, input);
      toast.success("Product updated");
      router.push(`/inventory/${id}`);
    } catch {
      toast.error("Failed to save changes");
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
'''

with open(TARGET, 'w', encoding='utf-8') as f:
    f.write(CONTENT)

import os
size = os.path.getsize(TARGET)
print(f"Written {size} bytes to {TARGET}")
