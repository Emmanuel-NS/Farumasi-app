"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Globe, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguageStore, type LangCode } from "@/store/language-store";
import { useThemeStore } from "@/store/theme-store";
import { resolveDarkEnabled } from "@/lib/theme-schedule";
import { useTranslation } from "@/lib/translations";

const LANG_OPTIONS: { code: LangCode; native: string; short: string }[] = [
  { code: "en", native: "English", short: "EN" },
  { code: "rw", native: "Kinyarwanda", short: "RW" },
  { code: "fr", native: "Français", short: "FR" },
  { code: "sw", native: "Swahili", short: "SW" },
];

export function SidebarPreferences({ collapsed }: { collapsed: boolean }) {
  const t = useTranslation();
  const lang = useLanguageStore((s) => s.lang);
  const setLang = useLanguageStore((s) => s.setLang);
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const [langOpen, setLangOpen] = useState(false);
  const [darkActive, setDarkActive] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDarkActive(resolveDarkEnabled(themeMode));
  }, [themeMode]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const currentLang = LANG_OPTIONS.find((o) => o.code === lang) ?? LANG_OPTIONS[0];

  const toggleTheme = () => {
    setThemeMode(darkActive ? "light" : "dark");
  };

  return (
    <div
      className={cn(
        "mb-2 rounded-xl border border-[#47D196]/25 bg-[#0A2B1E]/40",
        collapsed ? "p-1.5 space-y-1" : "p-2 space-y-2",
      )}
    >
      <button
        type="button"
        onClick={toggleTheme}
        title={darkActive ? t.theme_light : t.theme_dark}
        className={cn(
          "w-full flex items-center rounded-lg transition-colors hover:bg-white/10",
          collapsed ? "justify-center p-2" : "px-2.5 py-2 gap-3",
        )}
      >
        <div className="w-[34px] h-[34px] shrink-0 rounded-[9px] bg-[#47D196]/20 flex items-center justify-center">
          {darkActive ? (
            <Sun className="w-[18px] h-[18px] text-amber-200" />
          ) : (
            <Moon className="w-[18px] h-[18px] text-white" />
          )}
        </div>
        {!collapsed && (
          <>
            <span className="flex-1 text-left text-[13px] font-medium text-[#D2E8DE]">
              {darkActive ? t.theme_light : t.theme_dark}
            </span>
            <span
              className={cn(
                "relative w-11 h-6 rounded-full transition-colors shrink-0",
                darkActive ? "bg-[#47D196]" : "bg-white/20",
              )}
              aria-hidden
            >
              <span
                className={cn(
                  "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                  darkActive ? "translate-x-[22px]" : "translate-x-0.5",
                )}
              />
            </span>
          </>
        )}
      </button>

      <div ref={langRef} className="relative">
        <button
          type="button"
          onClick={() => setLangOpen((o) => !o)}
          title={t.settings_language}
          className={cn(
            "w-full flex items-center rounded-lg transition-colors hover:bg-white/10",
            collapsed ? "justify-center p-2" : "px-2.5 py-2 gap-3",
            langOpen && !collapsed && "bg-white/10",
          )}
        >
          <div className="w-[34px] h-[34px] shrink-0 rounded-[9px] bg-[#47D196]/20 flex items-center justify-center">
            <Globe className="w-[18px] h-[18px] text-white" />
          </div>
          {!collapsed && (
            <>
              <span className="flex-1 text-left text-[13px] font-medium text-[#D2E8DE]">
                {currentLang.native}
              </span>
              <span className="text-[11px] font-bold text-[#9BC8B5] uppercase">
                {currentLang.short}
              </span>
            </>
          )}
        </button>

        {langOpen && (
          <div
            className={cn(
              "absolute z-50 rounded-xl border border-[#47D196]/30 bg-[#0F3D2C] shadow-xl overflow-hidden",
              collapsed
                ? "left-full bottom-0 ml-2 w-44"
                : "left-0 right-0 bottom-full mb-1.5",
            )}
          >
            {LANG_OPTIONS.map((opt) => (
              <button
                key={opt.code}
                type="button"
                onClick={() => {
                  setLang(opt.code);
                  setLangOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 text-left text-[13px] transition-colors",
                  lang === opt.code
                    ? "bg-[#47D196]/20 text-[#EFFBF5] font-semibold"
                    : "text-[#D2E8DE] hover:bg-white/10",
                )}
              >
                <span>{opt.native}</span>
                {lang === opt.code && <Check className="w-4 h-4 text-[#47D196]" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
