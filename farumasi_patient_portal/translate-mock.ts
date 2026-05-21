import fs from "fs";
import path from "path";
import { mockNotifications, mockHealthArticles, mockMedicines } from "./src/data/mock";

// ⚠️ PASTE YOUR GOOGLE CLOUD API KEY HERE ⚠️
const API_KEY = "YOUR_GOOGLE_TRANSLATE_API_KEY";

const TARGET_LANGS = ["rw", "fr", "sw"];

async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text) return "";
  
  const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: text,
      source: "en",
      target: targetLang,
      format: "text"
    })
  });

  const data = await res.json();
  if (data.error) {
    console.error("Translation Error:", data.error.message);
    process.exit(1);
  }
  return data.data.translations[0].translatedText;
}

// Ensure clean stringifying for output
function escapeOutput(str: string): string {
  return str.replace(/`/g, "\\`").replace(/\$/g, "\\$");
}

async function main() {
  if (API_KEY === "YOUR_GOOGLE_TRANSLATE_API_KEY") {
    console.log("❌ Please insert your API key at the top of translate-mock.ts");
    return;
  }

  console.log("🚀 Starting translation magic...");
  
  // 1. Translations for Notifications
  let notifMapStr = `export const notifI18n: Record<number, NotifI18n> = {\n`;
  for (const n of mockNotifications) {
    console.log(`Translating Notification ${n.id}...`);
    notifMapStr += `  ${n.id}: {\n    title: {\n`;
    for (const lang of TARGET_LANGS) notifMapStr += `      ${lang}: \`${escapeOutput(await translateText(n.title, lang))}\`,\n`;
    notifMapStr += `    },\n    message: {\n`;
    for (const lang of TARGET_LANGS) notifMapStr += `      ${lang}: \`${escapeOutput(await translateText(n.message, lang))}\`,\n`;
    notifMapStr += `    }\n  },\n`;
  }
  notifMapStr += `};\n`;

  // 2. Translations for Articles
  let articleMapStr = `export const articleI18n: Record<string, ArticleI18n> = {\n`;
  for (const a of mockHealthArticles) {
    console.log(`Translating Article ${a.id}...`);
    articleMapStr += `  "${a.id}": {\n    title: {\n`;
    for (const lang of TARGET_LANGS) articleMapStr += `      ${lang}: \`${escapeOutput(await translateText(a.title, lang))}\`,\n`;
    articleMapStr += `    },\n    subtitle: {\n`;
    for (const lang of TARGET_LANGS) articleMapStr += `      ${lang}: \`${escapeOutput(await translateText(a.subtitle, lang))}\`,\n`;
    articleMapStr += `    },\n    summary: {\n`;
    for (const lang of TARGET_LANGS) articleMapStr += `      ${lang}: \`${escapeOutput(await translateText(a.summary, lang))}\`,\n`;
    articleMapStr += `    },\n    fullContent: {\n`;
    for (const lang of TARGET_LANGS) articleMapStr += `      ${lang}: \`${escapeOutput(await translateText(a.fullContent, lang))}\`,\n`;
    articleMapStr += `    }\n  },\n`;
  }
  articleMapStr += `};\n`;

  // 3. Translations for Medicines
  let medMapStr = `export const medicineI18n: Record<string, MedI18n> = {\n`;
  for (const m of mockMedicines) {
    console.log(`Translating Medicine ${m.id}...`);
    medMapStr += `  "${m.id}": {\n    description: {\n`;
    for (const lang of TARGET_LANGS) medMapStr += `      ${lang}: \`${escapeOutput(await translateText(m.description, lang))}\`,\n`;
    medMapStr += `    },\n    sideEffects: {\n`;
    for (const lang of TARGET_LANGS) medMapStr += `      ${lang}: \`${escapeOutput(await translateText(m.sideEffects, lang))}\`,\n`;
    medMapStr += `    }\n  },\n`;
  }
  medMapStr += `};\n`;


  const finalFileString = `/**
 * AUTO-GENERATED FILE. Generated via Google Cloud Translate API.
 * Multilingual overrides for dynamic mock content.
 * English is already in mock.ts (the base). This file provides rw / fr / sw.
 */

import type { LangCode } from "@/store/language-store";

type L3 = { rw: string; fr: string; sw: string };
type NotifI18n = { title: L3; message: L3 };
type ArticleI18n = { title: L3; subtitle: L3; summary: L3; fullContent: L3; };
type MedI18n = { description: L3; sideEffects: L3 };

// ─────────────────────────────────────────────────────────────────────────────
// DATA MAPS
// ─────────────────────────────────────────────────────────────────────────────

${notifMapStr}
${articleMapStr}
${medMapStr}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSLATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────
import type { AppNotification, HealthArticle, Medicine } from "@/types";

function pick(map: L3 | undefined, lang: LangCode): string | undefined {
  if (!map || lang === "en") return undefined;
  return map[lang as keyof L3] ?? undefined;
}

export function localizeNotification(n: AppNotification, lang: LangCode): AppNotification {
  const i = notifI18n[n.id];
  if (!i || lang === "en") return n;
  return { ...n, title: pick(i.title, lang) ?? n.title, message: pick(i.message, lang) ?? n.message };
}

export function localizeArticle(a: HealthArticle, lang: LangCode): HealthArticle {
  const i = articleI18n[a.id];
  if (!i || lang === "en") return a;
  return {
    ...a,
    title: pick(i.title, lang) ?? a.title,
    subtitle: pick(i.subtitle, lang) ?? a.subtitle,
    summary: pick(i.summary, lang) ?? a.summary,
    fullContent: pick(i.fullContent, lang) ?? a.fullContent,
  };
}

export function localizeMedicine(m: Medicine, lang: LangCode): Medicine {
  const i = medicineI18n[m.id];
  if (!i || lang === "en") return m;
  return {
    ...m,
    description: pick(i.description, lang) ?? m.description,
    sideEffects: pick(i.sideEffects, lang) ?? m.sideEffects,
  };
}
`;

  try {
    fs.writeFileSync(path.join(process.cwd(), "src/data/mock-i18n.ts"), finalFileString);
    console.log("✅ Translation complete! The 'mock-i18n.ts' file has been successfully overwritten with perfect translations.");
  } catch (e) {
    console.error("Failed to write to mock-i18n.ts", e);
  }
}

main();