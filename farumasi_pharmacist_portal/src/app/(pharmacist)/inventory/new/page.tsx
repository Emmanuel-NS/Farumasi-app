"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";

export default function NewInventoryPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    category: "",
    sku: "",
    stock: "",
    minStock: "",
    unitPrice: "",
    expiryDate: "",
    supplier: "",
    requiresPrescription: false,
  });

  const update = (k: string, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(`${form.name} added to inventory`);
    router.push("/inventory");
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-500 hover:text-farumasi-700 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Inventory
      </button>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">Add Inventory Item</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-700">Basic Information</h2>

          <Field label="Medicine Name *" required>
            <input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Amoxicillin 500mg" required className={fieldClass} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category *" required>
              <select value={form.category} onChange={(e) => update("category", e.target.value)} required className={fieldClass}>
                <option value="">Select</option>
                {["Antibiotics", "Painkillers", "Antifungals", "Vitamins", "Antiparasitic", "Vaccines", "Other"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="SKU *" required>
              <input value={form.sku} onChange={(e) => update("sku", e.target.value)} placeholder="e.g. AMX-500" required className={fieldClass} />
            </Field>
          </div>
          <Field label="Supplier">
            <input value={form.supplier} onChange={(e) => update("supplier", e.target.value)} placeholder="e.g. MedPlus Ltd" className={fieldClass} />
          </Field>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-700">Stock & Pricing</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Initial Stock *" required>
              <input type="number" min="0" value={form.stock} onChange={(e) => update("stock", e.target.value)} placeholder="0" required className={fieldClass} />
            </Field>
            <Field label="Minimum Stock *" required>
              <input type="number" min="0" value={form.minStock} onChange={(e) => update("minStock", e.target.value)} placeholder="0" required className={fieldClass} />
            </Field>
          </div>
          <Field label="Unit Price (RWF) *" required>
            <input type="number" min="0" value={form.unitPrice} onChange={(e) => update("unitPrice", e.target.value)} placeholder="0" required className={fieldClass} />
          </Field>
          <Field label="Expiry Date *" required>
            <input type="date" value={form.expiryDate} onChange={(e) => update("expiryDate", e.target.value)} required className={fieldClass} />
          </Field>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${form.requiresPrescription ? "bg-farumasi-600" : "bg-slate-200"}`}
              onClick={() => update("requiresPrescription", !form.requiresPrescription)}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${form.requiresPrescription ? "translate-x-5" : "translate-x-0"}`} />
            </div>
            <span className="text-sm font-medium text-slate-800">Requires Prescription (Rx)</span>
          </label>
        </div>

        <button
          type="submit"
          className="w-full h-12 bg-farumasi-600 hover:bg-farumasi-700 text-white rounded-2xl font-bold transition-colors flex items-center justify-center gap-2"
        >
          <Save className="w-5 h-5" />
          Save Item
        </button>
      </form>
    </div>
  );
}

const fieldClass = "w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-farumasi-500/30 focus:border-farumasi-500 transition-all";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
