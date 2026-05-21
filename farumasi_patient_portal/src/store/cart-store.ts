import { create } from "zustand";
import type { Medicine } from "@/types";

export interface CartEntry {
  medicine: Medicine;
  qty: number;
}

interface CartStore {
  items: Record<string, CartEntry>;
  add: (medicine: Medicine, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartStore>()((set) => ({
  items: {},

  add: (medicine, qty = 1) =>
    set((s) => ({
      items: {
        ...s.items,
        [medicine.id]: {
          medicine,
          qty: (s.items[medicine.id]?.qty ?? 0) + qty,
        },
      },
    })),

  remove: (id) =>
    set((s) => {
      const n = { ...s.items };
      delete n[id];
      return { items: n };
    }),

  setQty: (id, qty) =>
    set((s) => {
      if (qty <= 0) {
        const n = { ...s.items };
        delete n[id];
        return { items: n };
      }
      return { items: { ...s.items, [id]: { ...s.items[id]!, qty } } };
    }),

  clear: () => set({ items: {} }),
}));
