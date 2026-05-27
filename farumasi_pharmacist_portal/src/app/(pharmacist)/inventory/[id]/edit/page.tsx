"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { ArrowLeft, Camera, FlaskConical, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { listingsService } from "@/lib/services/listings.service";
import { productsService } from "@/lib/services/products.service";

const CATEGORIES = [
  "Pain Relief", "Antibiotics", "Allergy & Asthma", "Cold & Flu",
  "Digestive Health", "Chronic Care", "Supplements", "Personal Care",
  "Antimalarial", "First Aid", "Wellness", "Mother & Baby", "Medical Devices",
];

const DOSAGE_FORMS = [
  "Tablet", "Capsule", "Syrup", "Suspension", "Injection",
  "Cream", "Ointment", "Drops", "Inhaler", "Suppository", "Powder", "Other",
];

const inp =
  "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-farumasi-200 transition-all placeholder:text-slate-400";

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
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

function SectionCard({ title, subtitle, children }: { title?: string; subtitle?: string; children: React.ReactNode }) {
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

function toDateInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const listingId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [genericName, setGenericName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [category, setCategory] = useState<string>("");
  const [dosageForm, setDosageForm] = useState<string>("");
  const [strength, setStrength] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [requiresRx, setRequiresRx] = useState(false);

  const [price, setPrice] = useState<string>("");
  const [stock, setStock] = useState<string>("");
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [batchNumber, setBatchNumber] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const listing = await listingsService.getListing(listingId);
        if (cancelled) return;
        setProductId(listing.product_id);
        setPrice(String(listing.price));
        setStock(String(listing.stock_quantity));
        setExpiryDate(toDateInput(listing.expiry_date));
        setBatchNumber(listing.batch_number ?? "");

        const product = await productsService.getProduct(listing.product_id);
        if (cancelled) return;
        setName(product.name);
        setGenericName(product.generic_name ?? "");
        setManufacturer(product.manufacturer ?? product.brand ?? "");
        setCategory(product.category ?? CATEGORIES[0]);
        setDosageForm(product.dosage_form ?? "");
        setStrength(product.strength ?? "");
        setDescription(product.description ?? "");
        setImageUrl(product.image_url ?? "");
        setRequiresRx(product.prescription_required);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [listingId]);

  const displayImage = imageUrl.trim() || null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;
    if (!name.trim()) { toast.error("Product name is required"); return; }
    const priceNum = Number(price);
    const stockNum = Number(stock);
    if (!Number.isFinite(priceNum) || priceNum < 0) { toast.error("Enter a valid price"); return; }
    if (!Number.isInteger(stockNum) || stockNum < 0) { toast.error("Enter a valid stock quantity"); return; }

    setSubmitting(true);
    try {
      await productsService.updateProduct(productId, {
        name: name.trim(),
        generic_name: genericName.trim() || null,
        manufacturer: manufacturer.trim() || null,
        category: category || null,
        dosage_form: dosageForm || null,
        strength: strength.trim() || null,
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        prescription_required: requiresRx,
      });
      await listingsService.updateListing(listingId, {
        price: priceNum,
        stock_quantity: stockNum,
        expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null,
        batch_number: batchNumber.trim() || null,
      });
      toast.success("Product updated");
      router.push("/inventory");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      const detail = e?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Could not save changes");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-farumasi-400 animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 font-semibold mb-3">Listing not found</p>
          <button
            onClick={() => router.push("/inventory")}
            className="px-4 py-2 bg-farumasi-600 text-white rounded-xl text-sm font-bold hover:bg-farumasi-700 transition-colors"
          >
            Back to Stock
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 bg-white border-b border-slate-200 z-20 px-5 py-3.5 flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-base font-extrabold text-slate-900">Edit Product</h1>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="px-4 py-2 bg-farumasi-600 hover:bg-farumasi-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-1.5"
        >
          {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {submitting ? "Saving…" : "Save Changes"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-5 py-6 space-y-5 pb-20">
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
                <input value={name} onChange={(e) => setName(e.target.value)} className={inp} required />
              </Field>
              <Field label="Generic Name">
                <input value={genericName} onChange={(e) => setGenericName(e.target.value)} className={inp} />
              </Field>
              <Field label="Manufacturer">
                <input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} className={inp} />
              </Field>
              <Field label="Image URL">
                <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className={inp} />
              </Field>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Classification" subtitle="How patients discover this product in the catalogue.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Category">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inp}>
                {category && !CATEGORIES.includes(category) && <option value={category}>{category}</option>}
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Dosage Form">
              <select value={dosageForm} onChange={(e) => setDosageForm(e.target.value)} className={inp}>
                <option value="">— None —</option>
                {DOSAGE_FORMS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Strength">
              <input value={strength} onChange={(e) => setStrength(e.target.value)} placeholder="e.g. 500mg" className={inp} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Description" subtitle="Short patient-facing summary shown in the catalogue.">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="What it treats, how it works, who it's for."
            className={cn(inp, "resize-none")}
          />
        </SectionCard>

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

        <SectionCard title="Pricing & Stock" subtitle="Your selling price and stock — applies only to your pharmacy.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Price (RWF)" required>
              <input type="number" min={0} step={1} value={price} onChange={(e) => setPrice(e.target.value)} className={inp} required />
            </Field>
            <Field label="Stock quantity" required>
              <input type="number" min={0} step={1} value={stock} onChange={(e) => setStock(e.target.value)} className={inp} required />
            </Field>
            <Field label="Expiry date">
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={inp} />
            </Field>
            <Field label="Batch number">
              <input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} className={inp} />
            </Field>
          </div>
        </SectionCard>
      </form>
    </div>
  );
}
