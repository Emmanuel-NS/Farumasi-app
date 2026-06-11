import api from "@/lib/api";
import type { LangCode } from "@/store/language-store";

export interface TranslationBatchItem {
  id: string;
  text: string;
  context?: string;
}

export interface TranslationBatchResult {
  id: string;
  text: string;
  cached: boolean;
}

export interface TranslationUsage {
  chars_used_today: number;
  daily_char_limit: number;
  chars_remaining: number;
  api_calls_today: number;
  translation_enabled: boolean;
}

const LS_PREFIX = "farumasi_tx_v1";
const memoryCache = new Map<string, string>();

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function cacheKey(target: LangCode, context: string, text: string): string {
  const norm = normalizeText(text);
  return `${target}|${context}|${norm}`;
}

function readLocal(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(`${LS_PREFIX}:${key}`);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${LS_PREFIX}:${key}`, value);
  } catch {
    /* quota — memory cache still helps */
  }
}

export const translationService = {
  async getStatus(): Promise<TranslationUsage> {
    const { data } = await api.get<TranslationUsage>("/translations/status");
    return data;
  },

  /**
   * Translate strings with client memory + localStorage cache, then server DB cache + Google.
   */
  async translateBatch(
    targetLang: LangCode,
    items: TranslationBatchItem[],
    sourceLang: LangCode = "en",
  ): Promise<TranslationBatchResult[]> {
    if (sourceLang === targetLang) {
      return items.map((it) => ({
        id: it.id,
        text: it.text,
        cached: true,
      }));
    }

    const results: TranslationBatchResult[] = [];
    const pending: TranslationBatchItem[] = [];

    for (const it of items) {
      const text = normalizeText(it.text);
      if (!text) {
        results.push({ id: it.id, text: "", cached: true });
        continue;
      }
      const ctx = it.context ?? "dynamic";
      const key = cacheKey(targetLang, ctx, text);
      const mem = memoryCache.get(key);
      if (mem) {
        results.push({ id: it.id, text: mem, cached: true });
        continue;
      }
      const local = readLocal(key);
      if (local) {
        memoryCache.set(key, local);
        results.push({ id: it.id, text: local, cached: true });
        continue;
      }
      pending.push({ ...it, text, context: ctx });
    }

    if (pending.length === 0) return results;

    const CHUNK = 80;
    for (let i = 0; i < pending.length; i += CHUNK) {
      const chunk = pending.slice(i, i + CHUNK);
      const { data } = await api.post<{
        translations: TranslationBatchResult[];
      }>("/translations/batch", {
        source_lang: sourceLang,
        target_lang: targetLang,
        items: chunk.map((c) => ({
          id: c.id,
          text: c.text,
          context: c.context,
        })),
      });

      for (const row of data.translations) {
        const src = chunk.find((c) => c.id === row.id);
        if (src) {
          const key = cacheKey(targetLang, src.context ?? "dynamic", src.text);
          memoryCache.set(key, row.text);
          writeLocal(key, row.text);
        }
        results.push(row);
      }
    }

    return results;
  },

  async translateOne(
    text: string,
    targetLang: LangCode,
    context = "dynamic",
    sourceLang: LangCode = "en",
  ): Promise<string> {
    if (!text?.trim() || sourceLang === targetLang) return text;
    const [row] = await this.translateBatch(
      targetLang,
      [{ id: "0", text, context }],
      sourceLang,
    );
    return row?.text ?? text;
  },
};
