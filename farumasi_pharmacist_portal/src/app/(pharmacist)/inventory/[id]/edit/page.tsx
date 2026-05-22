"use client";

import { useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import {
  ArrowLeft, Camera, Link2, Trash2, Plus, X, ChevronRight, FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RichEditor } from "@/components/ui/rich-editor";
import { mockInventory } from "@/data/mock";
import type { AgeRange, AgeDosage } from "@/types";

/* ─── Constants ──────────────────────────────────────── */
const CATEGORY_HIERARCHY: Record<string, string[]> = {
  "Pain Relief":       ["Headache & Fever", "Anti-inflammatory", "Muscle Pain"],
  "Antibiotics":       ["Bacterial Infections", "Skin Infections", "UTI"],
  "Allergy & Asthma":  ["Antihistamine", "Asthma Inhalers", "Nasal Sprays"],
  "Cold & Flu":        ["Cough Relief", "Decongestants", "Flu Treatment"],
  "Digestive Health":  ["Rehydration", "Antacids", "Probiotics", "Laxatives"],
  "Chronic Care":      ["Diabetes", "Hypertension", "Heart Health", "Thyroid"],
  "Supplements":       ["Vitamins", "Minerals", "Herbal", "Omega Acids", "Protein"],
  "Personal Care":     ["Skin Care", "Hair Care", "Oral Care", "Feminine Hygiene"],
  "Antimalarial":      ["Malaria Treatment", "Malaria Prevention"],
  "First Aid":         ["Wound Care", "Bandages", "Antiseptics"],
  "Wellness":          ["Stress Relief", "Weight Management", "Sleep Support"],
  "Mother & Baby":     ["Diapers", "Baby Food", "Pregnancy Care", "Feeding"],
  "Medical Devices":   ["Monitors", "Thermometers", "Mobility Aids"],
};

const AGE_RANGES: { value: AgeRange; label: string }[] = [
  { value: "infant_toddler", label: "Infant to Toddler (0–2 yrs)" },
  { value: "toddler",        label: "Toddler (2–5 yrs)" },
  { value: "child",          label: "Child (6–12 yrs)" },
  { value: "adolescent",     label: "Adolescent (13–17 yrs)" },
  { value: "adult",          label: "Adult (18+ yrs)" },
];

const DETAIL_TABS = ["Overview", "Dosage", "Safety"] as const;
type DetailTab = (typeof DETAIL_TABS)[number];

/* ─── Reusable input styles ──────────────────────────── */
const inp =
  "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-farumasi-200 transition-all placeholder:text-slate-400";

function Field({
  label, required, hint, children,
}: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
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
  title, children, className,
}: {
  title: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("bg-white rounded-2xl border border-slate-100 shadow-sm p-5", className)}>
      {title && <h2 className="text-sm font-extrabold text-slate-700 mb-4">{title}</h2>}
      {children}
    </div>
  );
}

function Toggle({
  value, onChange, label,
}: {
  value: boolean; onChange: (v: boolean) => void; label: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        onClick={() => onChange(!value)}
        className={cn(
          "w-11 h-6 rounded-full flex items-center px-0.5 transition-colors",
          value ? "bg-farumasi-600" : "bg-slate-200",
        )}
      >
        <div
          className={cn(
            "w-5 h-5 rounded-full bg-white shadow transition-transform",
            value ? "translate-x-5" : "translate-x-0",
          )}
        />
      </div>
      <span className="text-sm font-medium text-slate-800">{label}</span>
    </label>
  );
}

/* ─── Build initial taxonomy from item data ──────────── */
function buildTaxonomy(
  category: string,
  subCategory: string | undefined,
  additionalCategories: string[],
): Record<string, Set<string>> {
  const tax: Record<string, Set<string>> = {};
  tax[category] = new Set(subCategory ? [subCategory] : []);
  for (const cat of additionalCategories) {
    if (!tax[cat]) tax[cat] = new Set();
  }
  return tax;
}

/* ═══════════════════════════════════════════════════════ */
export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = Number(params.id);

  const item = mockInventory.find((i) => i.id === itemId) ?? null;

  /* ── Basic Info ── */
  const [name, setName]           = useState(item?.name ?? "");
  const [manufacturer, setMfr]    = useState(item?.manufacturer ?? "");
  const [imageUrl, setImageUrl]   = useState(item?.imageUrl ?? "");
  const [imageFile, setImageFile] = useState<string | null>(null);
  const fileRef                    = useRef<HTMLInputElement>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);

  /* ── Category ── */
  const [selectedTaxonomy, setTaxonomy] = useState<Record<string, Set<string>>>(
    () => item
      ? buildTaxonomy(item.category, item.subCategory, item.additionalCategories)
      : {},
  );

  /* ── Summaries ── */
  const [shortDesc, setShortDesc]         = useState(item?.shortDescription ?? "");
  const [dosageSummary, setDosageSumm]   = useState(item?.dosageSummary ?? "");

  /* ── Prescription ── */
  const [requiresRx, setRequiresRx] = useState(item?.requiresPrescription ?? false);

  /* ── Age dosages ── */
  const [ageDosages, setAgeDosages] = useState<AgeDosage[]>(item?.ageDosages ?? []);
  const [tempAge, setTempAge]       = useState<AgeRange | "">("");
  const [tempAgeDose, setTempAgeDose] = useState("");

  /* ── Detail tabs ── */
  const [activeTab, setActiveTab]       = useState<DetailTab>("Overview");
  const [description, setDescription]   = useState(item?.description ?? "");
  const [dosage, setDosage]             = useState(item?.dosage ?? "");
  const [sideEffects, setSideEffects]   = useState(item?.sideEffects ?? "");
  const [doseMorning, setMorning]       = useState(item?.doseMorning ?? "");
  const [doseAfternoon, setAfternoon]   = useState(item?.doseAfternoon ?? "");
  const [doseEvening, setEvening]       = useState(item?.doseEvening ?? "");
  const [doseInterval, setInterval_]    = useState<string>(item?.doseTimeInterval ?? "");

  /* ── Image handling ── */
  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageFile(ev.target?.result as string);
      setImageUrl("");
    };
    reader.readAsDataURL(file);
  };

  /* ── Taxonomy helpers ── */
  const addCategory = (cat: string) => {
    setTaxonomy((p) => ({ ...p, [cat]: new Set() }));
  };
  const removeCategory = (cat: string) => {
    setTaxonomy((p) => {
      const next = { ...p };
      delete next[cat];
      return next;
    });
  };
  const toggleSub = (cat: string, sub: string) => {
    setTaxonomy((p) => {
      const set = new Set(p[cat]);
      set.has(sub) ? set.delete(sub) : set.add(sub);
      return { ...p, [cat]: set };
    });
  };

  /* ── Age dosage helpers ── */
  const addAgeDosage = () => {
    if (!tempAge || !tempAgeDose.trim()) {
      toast.error("Select age range and enter instructions");
      return;
    }
    if (ageDosages.some((d) => d.ageRange === tempAge)) {
      toast.error("Age range already added");
      return;
    }
    setAgeDosages((p) => [...p, { ageRange: tempAge as AgeRange, instructions: tempAgeDose }]);
    setTempAge("");
    setTempAgeDose("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Product name is required"); return; }
    if (Object.keys(selectedTaxonomy).length === 0) {
      toast.error("Select at least one category");
      return;
    }
    toast.success(`${name} updated`);
    router.push("/inventory");
  };

  /* ── Not found ── */
  if (!item) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 font-semibold mb-3">Product not found</p>
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

  const displayImage = imageFile ?? (imageUrl || null);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky header */}
      <div className="sticky top-0 bg-white border-b border-slate-200 z-20 px-5 py-3.5 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-base font-extrabold text-slate-900">Edit Product</h1>
        <button
          type="button"
          onClick={handleSubmit}
          className="px-4 py-2 bg-farumasi-600 hover:bg-farumasi-700 text-white rounded-xl text-sm font-bold transition-colors"
        >
          Save Changes
        </button>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-5 py-6 space-y-5 pb-20">

        {/* ── 1. Basic Info ── */}
        <SectionCard title="">
          <div className="flex gap-4 items-start">
            {/* Image picker */}
            <div className="shrink-0">
              <div
                className="relative w-[90px] h-[90px] rounded-2xl overflow-hidden bg-slate-100 border-2 border-dashed border-slate-300 cursor-pointer"
                onClick={() => fileRef.current?.click()}
              >
                {displayImage ? (
                  <Image src={displayImage} alt="Product" fill className="object-cover" sizes="90px" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                    <Camera className="w-6 h-6 text-slate-400" />
                    <span className="text-[10px] text-slate-400 text-center leading-tight">Change Photo</span>
                  </div>
                )}
                <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-farumasi-600 flex items-center justify-center shadow-sm">
                  <Camera className="w-3 h-3 text-white" />
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />
              <button
                type="button"
                onClick={() => setShowUrlInput((v) => !v)}
                className="mt-1.5 w-[90px] text-center text-[10px] text-farumasi-600 font-semibold flex items-center justify-center gap-0.5"
              >
                <Link2 className="w-3 h-3" /> URL
              </button>
              {showUrlInput && (
                <input
                  value={imageUrl}
                  onChange={(e) => { setImageUrl(e.target.value); setImageFile(null); }}
                  placeholder="https://..."
                  className={cn(inp, "text-[11px] mt-1 w-[90px]")}
                />
              )}
            </div>

            {/* Name + Manufacturer */}
            <div className="flex-1 space-y-3">
              <Field label="Product Name" required>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Amoxicillin 250mg"
                  className={inp}
                  required
                />
              </Field>
              <Field label="Manufacturer">
                <input
                  value={manufacturer}
                  onChange={(e) => setMfr(e.target.value)}
                  placeholder="e.g. Global Antibiotics Ltd."
                  className={inp}
                />
              </Field>
            </div>
          </div>
        </SectionCard>

        {/* ── 2. Categories ── */}
        <SectionCard title="Categories">
          {/* Selected category chips */}
          {Object.keys(selectedTaxonomy).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.keys(selectedTaxonomy).map((cat) => (
                <span
                  key={cat}
                  className="flex items-center gap-1.5 bg-farumasi-600 text-white text-xs font-bold px-3 py-1 rounded-full"
                >
                  {cat}
                  <button type="button" onClick={() => removeCategory(cat)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add category dropdown */}
          <select
            defaultValue=""
            onChange={(e) => { if (e.target.value) addCategory(e.target.value); e.target.value = ""; }}
            className={cn(inp, "text-slate-500")}
          >
            <option value="" disabled>+ Add a category…</option>
            {Object.keys(CATEGORY_HIERARCHY)
              .filter((c) => !selectedTaxonomy[c])
              .map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
          </select>

          {/* Sub-category selectors */}
          {Object.keys(selectedTaxonomy).length > 0 && (
            <div className="mt-4 space-y-3 bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Sub-categories</p>
              {Object.keys(selectedTaxonomy).map((cat) => {
                const subs = CATEGORY_HIERARCHY[cat] ?? [];
                if (!subs.length) return null;
                return (
                  <div key={cat}>
                    <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                      <ChevronRight className="w-3 h-3" />{cat}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {subs.map((sub) => {
                        const sel = selectedTaxonomy[cat]?.has(sub) ?? false;
                        return (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => toggleSub(cat, sub)}
                            className={cn(
                              "px-3 py-1 rounded-lg text-xs font-semibold border transition-all",
                              sel
                                ? "bg-farumasi-600 text-white border-farumasi-600"
                                : "bg-white text-slate-600 border-slate-200 hover:border-farumasi-300",
                            )}
                          >
                            {sub}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* ── 3. Summaries ── */}
        <SectionCard title="Summaries">
          <div className="space-y-4">
            <Field label="Short Description" hint="One-line patient-facing summary">
              <input
                value={shortDesc}
                onChange={(e) => setShortDesc(e.target.value)}
                placeholder="e.g. Effective pain reliever and fever reducer."
                className={inp}
              />
            </Field>
            <Field label="Dosage Summary" hint="Brief patient-facing dosage">
              <input
                value={dosageSummary}
                onChange={(e) => setDosageSumm(e.target.value)}
                placeholder="e.g. 1–2 tablets every 4–6 hours."
                className={inp}
              />
            </Field>
          </div>
        </SectionCard>

        {/* ── 4. Prescription ── */}
        <SectionCard title="Prescription">
          <div className="flex items-start gap-4 bg-farumasi-50 border border-farumasi-100 rounded-xl p-4">
            <div className="w-9 h-9 rounded-xl bg-farumasi-100 flex items-center justify-center shrink-0 mt-0.5">
              <FlaskConical className="w-4 h-4 text-farumasi-600" />
            </div>
            <div className="flex-1">
              <Toggle value={requiresRx} onChange={setRequiresRx} label="Requires Prescription (Rx)" />
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                When enabled, patients cannot purchase this product without presenting a valid prescription.
                Pricing, stock levels and expiry are managed by the pharmacy when adding to stock.
              </p>
            </div>
          </div>
        </SectionCard>

        {/* ── 5. Age Dosages ── */}
        <SectionCard title="Age Dosages">
          <div className="bg-farumasi-50 rounded-xl p-4 border border-farumasi-100 mb-4">
            <p className="text-xs font-bold text-slate-600 mb-3">Add New Age Dosage</p>
            <Field label="Age Range">
              <select
                value={tempAge}
                onChange={(e) => setTempAge(e.target.value as AgeRange)}
                className={cn(inp, "text-slate-600 mb-3")}
              >
                <option value="">Select age range…</option>
                {AGE_RANGES.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Dosage Instructions">
              <textarea
                value={tempAgeDose}
                onChange={(e) => setTempAgeDose(e.target.value)}
                placeholder="e.g. 5–10ml twice daily"
                rows={2}
                className={cn(inp, "resize-none mb-3")}
              />
            </Field>
            <button
              type="button"
              onClick={addAgeDosage}
              className="flex items-center gap-2 px-4 py-2 bg-farumasi-600 text-white rounded-xl text-sm font-bold hover:bg-farumasi-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Age Dosage
            </button>
          </div>

          {ageDosages.length > 0 && (
            <div className="space-y-2">
              {ageDosages.map((d, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between bg-white border border-slate-200 rounded-xl p-3"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-700">
                      {AGE_RANGES.find((a) => a.value === d.ageRange)?.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{d.instructions}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAgeDosages((p) => p.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-600 p-1 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ── 6. Detailed Information ── */}
        <SectionCard title="Detailed Information">
          {/* Tab bar */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5">
            {DETAIL_TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTab(t)}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-semibold transition-all",
                  activeTab === t
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "Overview" && (
            <div>
              <p className="text-xs font-bold text-slate-600 mb-2">Full Description</p>
              <RichEditor
                value={description}
                onChange={setDescription}
                placeholder="Describe this product — what it treats, how it works, who should use it…"
                minHeight={260}
              />
            </div>
          )}

          {activeTab === "Dosage" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 bg-farumasi-50 rounded-xl p-3 border border-farumasi-100">
                {([
                  ["Morning", doseMorning, setMorning],
                  ["Afternoon", doseAfternoon, setAfternoon],
                  ["Evening", doseEvening, setEvening],
                ] as const).map(([label, val, setter]) => (
                  <div key={label}>
                    <p className="text-[10px] font-bold text-farumasi-700 mb-1.5">{label}</p>
                    <input
                      value={val}
                      onChange={(e) => setter(e.target.value)}
                      placeholder="--"
                      className="w-full h-9 bg-white border border-slate-200 rounded-lg text-center text-sm focus:outline-none focus:ring-2 focus:ring-farumasi-200"
                    />
                  </div>
                ))}
              </div>
              <Field label="Time Interval">
                <input
                  value={doseInterval}
                  onChange={(e) => setInterval_(e.target.value)}
                  placeholder="e.g. Every 8 hours"
                  className={inp}
                />
              </Field>
              <div>
                <p className="text-xs font-bold text-slate-600 mb-2">Full Dosage Instructions</p>
                <RichEditor
                  value={dosage}
                  onChange={setDosage}
                  placeholder="Morning / afternoon / evening doses, with-food requirements, maximum daily limits…"
                  minHeight={240}
                />
              </div>
            </div>
          )}

          {activeTab === "Safety" && (
            <div>
              <p className="text-xs font-bold text-slate-600 mb-2">Side Effects &amp; Warnings</p>
              <RichEditor
                value={sideEffects}
                onChange={setSideEffects}
                placeholder="List known side effects, drug interactions, contraindications and warnings…"
                minHeight={260}
              />
            </div>
          )}
        </SectionCard>

      </form>
    </div>
  );
}
