"use client";

import { useEffect } from "react";
import { useLanguageStore } from "@/store/language-store";
import { useTranslationOverlayStore } from "@/store/translation-overlay-store";

/**
 * Warms UI translation bundle when the user selects a non-English language.
 * English strings in translations.ts remain the source; API fills overlay from cache/Google.
 */
export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const lang = useLanguageStore((s) => s.lang);
  const warmUiBundle = useTranslationOverlayStore((s) => s.warmUiBundle);

  useEffect(() => {
    void warmUiBundle(lang);
  }, [lang, warmUiBundle]);

  return <>{children}</>;
}
