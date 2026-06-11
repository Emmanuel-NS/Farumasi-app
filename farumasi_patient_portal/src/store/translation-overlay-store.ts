import { create } from "zustand";
import type { LangCode } from "@/store/language-store";
import type { T } from "@/lib/translations";
import { getTranslation } from "@/lib/translations";
import { translationService } from "@/lib/services/translation.service";

const UI_BUNDLE_VERSION = "1";
const LS_UI_PREFIX = "farumasi_ui_bundle_v1";

interface TranslationOverlayState {
  lang: LangCode | null;
  uiOverlay: Partial<T>;
  warming: boolean;
  lastError: string | null;
  warmUiBundle: (lang: LangCode) => Promise<void>;
  clearOverlay: () => void;
}

function loadStoredBundle(lang: LangCode): Partial<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${LS_UI_PREFIX}:${lang}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { v: string; data: Partial<T> };
    if (parsed.v !== UI_BUNDLE_VERSION) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function storeBundle(lang: LangCode, data: Partial<T>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${LS_UI_PREFIX}:${lang}`,
      JSON.stringify({ v: UI_BUNDLE_VERSION, data }),
    );
  } catch {
    /* ignore */
  }
}

export const useTranslationOverlayStore = create<TranslationOverlayState>()((set, get) => ({
  lang: null,
  uiOverlay: {},
  warming: false,
  lastError: null,

  clearOverlay: () => set({ uiOverlay: {}, lang: null }),

  warmUiBundle: async (lang: LangCode) => {
    if (lang === "en") {
      set({ lang: "en", uiOverlay: {}, warming: false, lastError: null });
      return;
    }

    const cached = loadStoredBundle(lang);
    if (cached && Object.keys(cached).length > 0) {
      set({ lang, uiOverlay: cached, warming: false, lastError: null });
    }

    if (get().warming) return;
    set({ warming: true, lastError: null });

    try {
      const en = getTranslation("en") as Record<string, string>;
      const items = Object.entries(en).map(([key, text]) => ({
        id: key,
        text: String(text),
        context: `ui:${key}`,
      }));

      const translated = await translationService.translateBatch(lang, items, "en");
      const overlay: Partial<T> = {};
      for (const row of translated) {
        (overlay as Record<string, string>)[row.id] = row.text;
      }

      storeBundle(lang, overlay);
      set({ lang, uiOverlay: overlay, warming: false, lastError: null });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Translation unavailable";
      set({
        warming: false,
        lastError: msg,
        lang,
        uiOverlay: cached ?? get().uiOverlay,
      });
    }
  },
}));
