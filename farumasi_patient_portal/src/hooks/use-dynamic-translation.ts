"use client";

import { useEffect, useState } from "react";
import { useLanguageStore, type LangCode } from "@/store/language-store";
import { translationService } from "@/lib/services/translation.service";

/**
 * Translate arbitrary dynamic text (notifications, pharmacist notes, etc.)
 * with client + server cache. Returns source text until translation is ready.
 */
export function useDynamicTranslation(
  text: string | null | undefined,
  context = "dynamic",
  sourceLang: LangCode = "en",
): { text: string; loading: boolean } {
  const lang = useLanguageStore((s) => s.lang);
  const [translated, setTranslated] = useState(text ?? "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const source = text?.trim() ?? "";
    if (!source || lang === sourceLang) {
      setTranslated(source);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    translationService
      .translateOne(source, lang, context, sourceLang)
      .then((result) => {
        if (!cancelled) {
          setTranslated(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTranslated(source);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [text, lang, context, sourceLang]);

  return { text: translated, loading };
}
