import { create } from "zustand";
import { useSearchStore } from "@/store/search-store";

export type StoreSort = "default" | "price_asc" | "price_desc";

interface StoreFilterStore {
  sort: StoreSort;
  selectedProductType: string;
  selectedCategories: string[];
  showFilters: boolean;
  setSort: (sort: StoreSort) => void;
  setSelectedProductType: (type: string) => void;
  setSelectedCategories: (cats: Iterable<string>) => void;
  toggleCategory: (cat: string) => void;
  setShowFilters: (open: boolean) => void;
  toggleShowFilters: () => void;
  clearAll: () => void;
}

export const useStoreFilterStore = create<StoreFilterStore>((set, get) => ({
  sort: "default",
  selectedProductType: "All",
  selectedCategories: [],
  showFilters: false,
  setSort: (sort) => set({ sort }),
  setSelectedProductType: (selectedProductType) => set({ selectedProductType }),
  setSelectedCategories: (cats) =>
    set({ selectedCategories: [...new Set([...cats].map((c) => c.toLowerCase()))] }),
  toggleCategory: (cat) => {
    if (cat === "All") {
      set({ selectedCategories: [] });
      return;
    }
    const norm = cat.toLowerCase();
    const prev = get().selectedCategories;
    const next = prev.includes(norm) ? prev.filter((c) => c !== norm) : [...prev, norm];
    set({ selectedCategories: next });
  },
  setShowFilters: (showFilters) => set({ showFilters }),
  toggleShowFilters: () => set((s) => ({ showFilters: !s.showFilters })),
  clearAll: () => {
    useSearchStore.getState().clear();
    set({
      sort: "default",
      selectedProductType: "All",
      selectedCategories: [],
    });
  },
}));

export function storeActiveFilterCount(query: string): number {
  const { sort, selectedProductType, selectedCategories } = useStoreFilterStore.getState();
  return (
    (sort !== "default" ? 1 : 0) +
    (selectedProductType !== "All" ? 1 : 0) +
    (selectedCategories.length > 0 ? 1 : 0) +
    (query.trim() ? 1 : 0)
  );
}
