"use client";

import { useState } from "react";
import Link from "next/link";
import { mockMedicines } from "@/data/mock";
import { cn, formatPrice } from "@/lib/utils";
import { ShoppingCart, Trash2, ArrowLeft, Store } from "lucide-react";

type CartItem = { medicineId: string; qty: number };

export default function CartPage() {
  // Demo: pre-seed cart with first 2 medicines
  const [items, setItems] = useState<CartItem[]>([
    { medicineId: "m1", qty: 2 },
    { medicineId: "m3", qty: 1 },
  ]);

  const change = (id: string, qty: number) => {
    if (qty <= 0) setItems((p) => p.filter((i) => i.medicineId !== id));
    else setItems((p) => p.map((i) => i.medicineId === id ? { ...i, qty } : i));
  };
  const remove = (id: string) => setItems((p) => p.filter((i) => i.medicineId !== id));

  const enriched = items.map((item) => ({
    ...item,
    medicine: mockMedicines.find((m) => m.id === item.medicineId)!,
  })).filter((i) => i.medicine);

  const subtotal = enriched.reduce((sum, i) => sum + i.medicine.price * i.qty, 0);
  const delivery = 1500;
  const total = subtotal + delivery;

  if (enriched.length === 0) {
    return (
      <div className="p-6 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShoppingCart className="w-20 h-20 text-slate-200 mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Your cart is empty</h2>
        <p className="text-slate-500 text-sm mt-1">Add medicines from the store to continue.</p>
        <Link
          href="/store"
          className="mt-6 flex items-center gap-2 bg-farumasi-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-farumasi-700 transition-colors"
        >
          <Store className="w-4 h-4" />
          Browse Medicines
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/store" className="p-2 rounded-xl text-slate-400 hover:text-farumasi-700 hover:bg-farumasi-50 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your Cart</h1>
          <p className="text-slate-500 text-sm">{enriched.length} item{enriched.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-3 mb-6">
        {enriched.map(({ medicine, qty }) => (
          <div key={medicine.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 flex gap-4 items-start">
            {/* Image */}
            <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
              {medicine.imageUrl
                ? <img src={medicine.imageUrl} alt={medicine.name} className="w-full h-full object-cover" />
                : <span className="text-3xl">💊</span>
              }
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{medicine.name}</p>
              <p className="text-xs text-farumasi-600 font-medium mt-0.5">{medicine.category}</p>
              <p className="text-sm font-extrabold text-farumasi-700 mt-1.5">{formatPrice(medicine.price)}</p>
            </div>
            {/* Qty + remove */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              <button onClick={() => remove(medicine.id)} className="p-1.5 text-slate-300 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 bg-slate-100 rounded-2xl px-2 py-1">
                <button onClick={() => change(medicine.id, qty - 1)} className="w-7 h-7 rounded-xl bg-white font-bold text-slate-600 hover:bg-farumasi-50 flex items-center justify-center shadow-sm">
                  −
                </button>
                <span className="text-sm font-bold text-slate-900 w-5 text-center">{qty}</span>
                <button onClick={() => change(medicine.id, qty + 1)} className="w-7 h-7 rounded-xl bg-farumasi-600 text-white font-bold hover:bg-farumasi-700 flex items-center justify-center">
                  +
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Order summary */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-4">Order Summary</h2>
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Delivery</span>
            <span>{formatPrice(delivery)}</span>
          </div>
          <div className="border-t border-slate-100 pt-2.5 flex justify-between">
            <span className="font-bold text-slate-900 text-base">Total</span>
            <span className="font-extrabold text-farumasi-700 text-lg">{formatPrice(total)}</span>
          </div>
        </div>

        <button className="w-full h-13 mt-5 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 text-white font-bold text-base transition-colors py-3.5">
          Proceed to Checkout
        </button>
        <p className="text-xs text-center text-slate-400 mt-3">Free delivery on orders above 10,000 RWF</p>
      </div>
    </div>
  );
}
