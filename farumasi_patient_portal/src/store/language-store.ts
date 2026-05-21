import { create } from "zustand";

export type LangCode = "en" | "rw" | "fr" | "sw";

export const LANG_NAMES: Record<LangCode, string> = {
  en: "English",
  rw: "Kinyarwanda",
  fr: "Français",
  sw: "Swahili",
};

interface LanguageStore {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
}

export const useLanguageStore = create<LanguageStore>()((set) => ({
  lang: "en",
  setLang: (lang) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("farumasi_lang", lang);
      document.documentElement.lang = lang;
    }
    set({ lang });
  },
}));

/** Call once on client mount to hydrate the store from localStorage. */
export function hydrateLanguage() {
  if (typeof window === "undefined") return;
  const stored = localStorage.getItem("farumasi_lang") as LangCode | null;
  if (stored && (["en", "rw", "fr", "sw"] as LangCode[]).includes(stored)) {
    useLanguageStore.getState().setLang(stored);
  }
}
