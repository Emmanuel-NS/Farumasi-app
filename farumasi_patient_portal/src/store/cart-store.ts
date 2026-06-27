import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Medicine } from "@/types";
import { cartLineKey, oppositeSellMode, type SellMode } from "@/lib/packaging-classes";

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

/** Distinct cart lines (unique products / sell-mode rows), not unit quantity. */
export function cartLineCount(items: Record<string, CartEntry>): number {
  return Object.keys(items).length;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: {},

      add: (medicine, qty = 1, sellMode = "pack") =>
        set((s) => {
          const key = cartLineKey(medicine.id, sellMode);
          const otherKey = cartLineKey(medicine.id, oppositeSellMode(sellMode));
          const next = { ...s.items };
          delete next[otherKey];
          return {
            items: {
              ...next,
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
      version: 3,
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
        for (const productId of new Set(
          Object.values(next).map((e) => e.medicine?.id).filter(Boolean) as string[],
        )) {
          const packKey = cartLineKey(productId, "pack");
          const partialKey = cartLineKey(productId, "partial");
          if (next[packKey] && next[partialKey]) {
            if ((next[partialKey]?.qty ?? 0) > (next[packKey]?.qty ?? 0)) {
              delete next[packKey];
            } else {
              delete next[partialKey];
            }
          }
        }
        return { ...state, items: next };
      },
    },
  ),
);

export function useCartLineCount(): number {
  return useCartStore((s) => cartLineCount(s.items));
}
