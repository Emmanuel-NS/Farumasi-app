import { create } from "zustand";
import { api } from "@/lib/api";

export type LangCode = "en" | "rw" | "fr" | "sw";

export const LANG_NAMES: Record<LangCode, string> = {
  en: "English",
  rw: "Kinyarwanda",
  fr: "Français",
  sw: "Swahili",
};

interface LanguageStore {
  lang: LangCode;
  setLang: (lang: LangCode, options?: { skipServer?: boolean }) => void;
  syncFromProfile: (lang: string | null | undefined) => void;
}

function applyLang(lang: LangCode) {
  if (typeof window !== "undefined") {
    localStorage.setItem("farumasi_lang", lang);
    document.documentElement.lang = lang;
  }
}

async function persistLangToServer(lang: LangCode) {
  if (typeof window === "undefined") return;
  const token = localStorage.getItem("farumasi_access_token");
  if (!token) return;
  try {
    await api.put("/users/me", { preferred_language: lang });
  } catch {
    /* offline or guest — local preference still applies */
  }
}

export const useLanguageStore = create<LanguageStore>()((set) => ({
  lang: "en",
  setLang: (lang, options) => {
    applyLang(lang);
    set({ lang });
    if (!options?.skipServer) void persistLangToServer(lang);
  },
  syncFromProfile: (lang) => {
    if (lang && (["en", "rw", "fr", "sw"] as LangCode[]).includes(lang as LangCode)) {
      const code = lang as LangCode;
      applyLang(code);
      set({ lang: code });
    }
  },
}));

/** Call once on client mount to hydrate the store from localStorage. */
export function hydrateLanguage() {
  if (typeof window === "undefined") return;
  const stored = localStorage.getItem("farumasi_lang") as LangCode | null;
  if (stored && (["en", "rw", "fr", "sw"] as LangCode[]).includes(stored)) {
    useLanguageStore.getState().setLang(stored, { skipServer: true });
  }
}
