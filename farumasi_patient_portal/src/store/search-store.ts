import { create } from "zustand";

/**
 * Global search state — mirrors Flutter's StateService.searchQuery / setSearchQuery().
 * The topbar search input writes here; the store page reads from here.
 */
interface SearchStore {
  query: string;
  setQuery: (q: string) => void;
  clear: () => void;
}

export const useSearchStore = create<SearchStore>((set) => ({
  query: "",
  setQuery: (q) => set({ query: q }),
  clear: () => set({ query: "" }),
}));
