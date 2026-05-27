"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { ArrowLeft, Camera, FlaskConical, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { productsService } from "@/lib/services/products.service";
import { pharmaciesService } from "@/lib/services/pharmacies.service";

const CATEGORIES = [
  "Pain Relief", "Antibiotics", "Allergy & Asthma", "Cold & Flu",
  "Digestive Health", "Chronic Care", "Supplements", "Personal Care",
  "Antimalarial", "First Aid", "Wellness", "Mother & Baby", "Medical Devices",
];

const DOSAGE_FORMS = [
  "Tablet", "Capsule", "Syrup", "Suspension", "Injection",
  "Cream", "Ointment", "Drops", "Inhaler", "Suppository", "Powder", "Other",
];

const PRODUCT_TYPES = [
  { value: "medicine", label: "Medicine" },
  { value: "device", label: "Medical Device" },
  { value: "supplement", label: "Supplement" },
  { value: "personal_care", label: "Personal Care" },
] as const;

const inp =
  "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-farumasi-200 transition-all placeholder:text-slate-400";

function Field({
  label, required, hint, children,
}: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function SectionCard({
  title, subtitle, children,
}: { title?: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      {title && (
        <div className="mb-4">
          <h2 className="text-sm font-extrabold text-slate-700">{title}</h2>
          {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        onClick={() => onChange(!value)}
        className={cn("w-11 h-6 rounded-full flex items-center px-0.5 transition-colors", value ? "bg-farumasi-600" : "bg-slate-200")}
      >
        <div className={cn("w-5 h-5 rounded-full bg-white shadow transition-transform", value ? "translate-x-5" : "translate-x-0")} />
      </div>
      <span className="text-sm font-medium text-slate-800">{label}</span>
    </label>
  );
}

export default function NewProductPage() {
  const router = useRouter();

  /* Product */
  const [name, setName] = useState("");
  const [genericName, setGenericName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [productType, setProductType] = useState<"medicine" | "device" | "supplement" | "personal_care">("medicine");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [dosageForm, setDosageForm] = useState<string>("");
  const [strength, setStrength] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [requiresRx, setRequiresRx] = useState(false);

  /* Listing */
  const [price, setPrice] = useState<string>("");
  const [stock, setStock] = useState<string>("");
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [batchNumber, setBatchNumber] = useState("");

  const [submitting, setSubmitting] = useState(false);

  /* Image preview from URL */
  const displayImage = imageUrl.trim() || null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Product name is required"); return; }
    const priceNum = Number(price);
    const stockNum = Number(stock);
    if (!Number.isFinite(priceNum) || priceNum < 0) { toast.error("Enter a valid price"); return; }
    if (!Number.isInteger(stockNum) || stockNum < 0) { toast.error("Enter a valid stock quantity"); return; }

    setSubmitting(true);
    try {
      const product = await productsService.createProduct({
        name: name.trim(),
        generic_name: genericName.trim() || null,
        manufacturer: manufacturer.trim() || null,
        category,
        product_type: productType,
        dosage_form: dosageForm || null,
        strength: strength.trim() || null,
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        prescription_required: requiresRx,
      });

      await pharmaciesService.createMyListing({
        product_id: product.id,
        price: priceNum,
        stock_quantity: stockNum,
        availability_status: stockNum > 0 ? "available" : "out_of_stock",
        expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null,
        batch_number: batchNumber.trim() || null,
      });

      toast.success(`${product.name} added to your stock`);
      router.push("/inventory");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      const detail = e?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Could not save product");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky header */}
      <div className="sticky top-0 bg-white border-b border-slate-200 z-20 px-5 py-3.5 flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-base font-extrabold text-slate-900">Add New Product</h1>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="px-4 py-2 bg-farumasi-600 hover:bg-farumasi-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-1.5"
        >
          {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {submitting ? "Saving…" : "Save"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-5 py-6 space-y-5 pb-20">
        {/* Basic Info */}
        <SectionCard>
          <div className="flex gap-4 items-start">
            <div className="shrink-0">
              <div className="relative w-[90px] h-[90px] rounded-2xl overflow-hidden bg-slate-100 border-2 border-dashed border-slate-300">
                {displayImage ? (
                  <Image src={displayImage} alt="Product" fill className="object-cover" sizes="90px" unoptimized />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                    <Camera className="w-6 h-6 text-slate-400" />
                    <span className="text-[10px] text-slate-400 text-center leading-tight">No image</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <Field label="Product Name" required>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Amoxicillin 250mg" className={inp} required />
              </Field>
              <Field label="Generic Name" hint="Active ingredient (optional)">
                <input value={genericName} onChange={(e) => setGenericName(e.target.value)} placeholder="e.g. Amoxicillin" className={inp} />
              </Field>
              <Field label="Manufacturer">
                <input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="e.g. Global Antibiotics Ltd." className={inp} />
              </Field>
              <Field label="Image URL" hint="Public link to a product photo">
                <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className={inp} />
              </Field>
            </div>
          </div>
        </SectionCard>

        {/* Classification */}
        <SectionCard title="Classification" subtitle="How patients discover this product in the catalogue.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Type">
              <select value={productType} onChange={(e) => setProductType(e.target.value as typeof productType)} className={inp}>
                {PRODUCT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Category">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inp}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Dosage Form">
              <select value={dosageForm} onChange={(e) => setDosageForm(e.target.value)} className={inp}>
                <option value="">— None —</option>
                {DOSAGE_FORMS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Strength" hint="e.g. 500mg, 50mg/ml">
              <input value={strength} onChange={(e) => setStrength(e.target.value)} placeholder="e.g. 500mg" className={inp} />
            </Field>
          </div>
        </SectionCard>

        {/* Description */}
        <SectionCard title="Description" subtitle="Short patient-facing summary shown in the catalogue.">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="What it treats, how it works, who it's for."
            className={cn(inp, "resize-none")}
          />
        </SectionCard>

        {/* Prescription */}
        <SectionCard title="Prescription">
          <div className="flex items-start gap-4 bg-farumasi-50 border border-farumasi-100 rounded-xl p-4">
            <div className="w-9 h-9 rounded-xl bg-farumasi-100 flex items-center justify-center shrink-0 mt-0.5">
              <FlaskConical className="w-4 h-4 text-farumasi-600" />
            </div>
            <div className="flex-1">
              <Toggle value={requiresRx} onChange={setRequiresRx} label="Requires Prescription (Rx)" />
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                When enabled, patients cannot purchase this product without uploading a valid prescription for pharmacist review.
              </p>
            </div>
          </div>
        </SectionCard>

        {/* Pricing & Stock */}
        <SectionCard title="Pricing & Stock" subtitle="Your selling price and stock — applies only to your pharmacy.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Price (RWF)" required>
              <input
                type="number"
                min={0}
                step={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 2500"
                className={inp}
                required
              />
            </Field>
            <Field label="Stock quantity" required>
              <input
                type="number"
                min={0}
                step={1}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="Units in stock"
                className={inp}
                required
              />
            </Field>
            <Field label="Expiry date">
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className={inp}
              />
            </Field>
            <Field label="Batch number">
              <input
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="e.g. AMX-24A-0312"
                className={inp}
              />
            </Field>
          </div>
        </SectionCard>
      </form>
    </div>
  );
}
