import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Medicine } from "@/types";
import { cartLineKey, type SellMode } from "@/lib/packaging-classes";

export interface CartEntry {
  medicine: Medicine;
  qty: number;
  /** pack = whole box/container; partial = individual tablets, sachets, etc. */
  sellMode: SellMode;
}

interface CartStore {
  items: Record<string, CartEntry>;
  add: (medicine: Medicine, qty?: number, sellMode?: SellMode) => void;
  remove: (lineKey: string) => void;
  setQty: (lineKey: string, qty: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: {},

      add: (medicine, qty = 1, sellMode = "pack") =>
        set((s) => {
          const key = cartLineKey(medicine.id, sellMode);
          return {
            items: {
              ...s.items,
              [key]: {
                medicine,
                sellMode,
                qty: (s.items[key]?.qty ?? 0) + qty,
              },
            },
          };
        }),

      remove: (lineKey) =>
        set((s) => {
          const n = { ...s.items };
          delete n[lineKey];
          return { items: n };
        }),

      setQty: (lineKey, qty) =>
        set((s) => {
          if (qty <= 0) {
            const n = { ...s.items };
            delete n[lineKey];
            return { items: n };
          }
          const existing = s.items[lineKey];
          if (!existing) return s;
          return { items: { ...s.items, [lineKey]: { ...existing, qty } } };
        }),

      clear: () => set({ items: {} }),
    }),
    {
      name: "farumasi-cart",
      version: 2,
      migrate: (persisted) => {
        const state = persisted as { items?: Record<string, CartEntry & { sellMode?: SellMode }> };
        if (!state?.items) return persisted as object;
        const next: Record<string, CartEntry> = {};
        for (const [key, entry] of Object.entries(state.items)) {
          const sellMode = entry.sellMode ?? "pack";
          const productId = entry.medicine?.id ?? key.split(":")[0] ?? key;
          const newKey = key.includes(":") ? key : cartLineKey(productId, sellMode);
          next[newKey] = { ...entry, sellMode };
        }
        return { ...state, items: next };
      },
    },
  ),
);
