"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { mockMedicines } from "@/data/mock";
import { formatPrice } from "@/lib/utils";
import {
  ArrowLeft, Star, AlertCircle, ShoppingCart, Upload,
  MapPin, CheckCircle, XCircle, Clock, ChevronRight,
} from "lucide-react";

const TABS = ["Description", "Dosage by Age", "Pharmacies"] as const;
type Tab = (typeof TABS)[number];

export default function MedicineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Description");
  const [qty, setQty] = useState(1);

  const med = mockMedicines.find((m) => m.id === id);

  if (!med) {
    return (
      <div className="p-6 text-center py-24">
        <p className="text-slate-500 text-lg">Medicine not found.</p>
        <Link href="/store" className="text-farumasi-600 font-medium hover:underline mt-2 inline-block">
          Back to Store
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-farumasi-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Store
      </button>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: image */}
        <div>
          <div className="rounded-3xl overflow-hidden bg-slate-100 h-72 lg:h-80 flex items-center justify-center">
            {med.imageUrl ? (
              <img src={med.imageUrl} alt={med.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-8xl">💊</span>
            )}
          </div>
          {med.requiresPrescription && (
            <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-2xl p-3.5">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Prescription Required</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  A valid prescription is required. Upload yours to order.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: details */}
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="text-xs font-semibold text-farumasi-700 bg-farumasi-50 px-3 py-1 rounded-full">
              {med.category}
            </span>
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">{med.name}</h1>

          {med.manufacturer && (
            <p className="text-sm text-slate-500 mb-3">By <span className="font-medium text-slate-700">{med.manufacturer}</span></p>
          )}

          {med.rating && (
            <div className="flex items-center gap-1.5 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < Math.round(med.rating!) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
              ))}
              <span className="text-sm font-semibold text-slate-700">{med.rating}</span>
            </div>
          )}

          <p className="text-3xl font-extrabold text-farumasi-700 mb-1">
            {formatPrice(med.price)}{med.maxPrice ? ` – ${formatPrice(med.maxPrice)}` : ""}

          {/* Quantity */}
          <div className="flex items-center gap-4 mb-6">
            <span className="text-sm font-medium text-slate-600">Quantity</span>
            <div className="flex items-center gap-3 bg-slate-100 rounded-2xl px-2 py-1">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-8 h-8 rounded-xl bg-white flex items-center justify-center font-bold text-slate-600 hover:bg-farumasi-50 shadow-sm">−</button>
              <span className="text-sm font-bold w-6 text-center">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="w-8 h-8 rounded-xl bg-farumasi-600 text-white flex items-center justify-center font-bold hover:bg-farumasi-700">+</button>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3">
            <button className="w-full h-12 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 text-white font-bold transition-colors flex items-center justify-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Add to Cart
            </button>
            {med.requiresPrescription && (
              <Link
                href="/prescriptions"
                className="w-full h-12 rounded-2xl border-2 border-farumasi-600 text-farumasi-700 font-bold hover:bg-farumasi-50 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Upload className="w-4 h-4" />
                Upload Prescription
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-10">
        <div className="flex bg-slate-100 rounded-2xl p-1 gap-1 w-fit mb-6">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === t ? "bg-white text-farumasi-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Description" && (
          <div className="bg-white rounded-3xl border border-slate-100 p-6">
            <h3 className="font-bold text-slate-900 mb-3">About {med.name}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{med.description ?? "No description available."}</p>
            {med.sideEffects && (
              <div className="mt-5">
                <p className="text-sm font-semibold text-slate-800 mb-1.5">Possible Side Effects</p>
                <p className="text-sm text-slate-600 leading-relaxed">{med.sideEffects}</p>
              </div>
            )}
          </div>
        )}

        {tab === "Dosage by Age" && (
          <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-3">
            {med.ageDosages && med.ageDosages.length > 0 ? (
              med.ageDosages.map((d, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{d.range}</p>
                  </div>
                  <p className="text-sm font-bold text-farumasi-700">{d.instructions}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Dosage info not available. Consult a pharmacist.</p>
            )}
          </div>
        )}

        {tab === "Pharmacies" && (
          <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-3">
            {med.marketingPharmacies && med.marketingPharmacies.length > 0 ? (
              med.marketingPharmacies.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-farumasi-50 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-farumasi-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{p.pharmacyName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {p.stockStatus === "available" ? (
                      <><CheckCircle className="w-4 h-4 text-farumasi-500" /><span className="text-xs font-medium text-farumasi-700">In Stock</span></>
                    ) : p.stockStatus === "low_stock" ? (
                      <><Clock className="w-4 h-4 text-amber-500" /><span className="text-xs font-medium text-amber-700">Low Stock</span></>
                    ) : (
                      <><XCircle className="w-4 h-4 text-red-400" /><span className="text-xs font-medium text-red-600">Out of Stock</span></>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No pharmacy listings available.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
