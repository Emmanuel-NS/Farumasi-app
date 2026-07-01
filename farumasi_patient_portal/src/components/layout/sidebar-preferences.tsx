"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const langBtnRef = useRef<HTMLButtonElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDarkActive(resolveDarkEnabled(themeMode));
  }, [themeMode]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (langRef.current?.contains(target) || langBtnRef.current?.contains(target)) return;
      setLangOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!langOpen || !langBtnRef.current) {
      setMenuPos(null);
      return;
    }
    const update = () => {
      const rect = langBtnRef.current!.getBoundingClientRect();
      const width = collapsed ? 176 : Math.max(rect.width, 176);
      const left = collapsed ? rect.right + 8 : rect.left;
      const top = collapsed ? rect.top : rect.top - 8;
      setMenuPos({ top, left, width });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [langOpen, collapsed]);

  const currentLang = LANG_OPTIONS.find((o) => o.code === lang) ?? LANG_OPTIONS[0];

  const toggleTheme = () => {
    setThemeMode(darkActive ? "light" : "dark");
  };

  const langMenu =
    langOpen && menuPos && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={langRef}
            className="fixed z-[200] rounded-xl border border-[#47D196]/40 bg-[#0a2b1e] shadow-2xl overflow-hidden"
            style={{
              top: collapsed ? menuPos.top : menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
              transform: collapsed ? undefined : "translateY(-100%)",
            }}
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
                    ? "bg-[#47D196]/25 text-[#EFFBF5] font-semibold"
                    : "text-[#D2E8DE] hover:bg-white/10",
                )}
              >
                <span>{opt.native}</span>
                {lang === opt.code && <Check className="w-4 h-4 text-[#47D196]" />}
              </button>
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      className={cn(
        "mb-2 rounded-xl border border-[#47D196]/25 bg-[#0A2B1E]/60",
        collapsed ? "p-1.5 space-y-1" : "p-2 space-y-2",
      )}
    >
      <button
        type="button"
        onClick={toggleTheme}
        role="switch"
        aria-checked={darkActive}
        aria-label={darkActive ? t.theme_light : t.theme_dark}
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
              aria-hidden
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors",
                darkActive
                  ? "border-[#47D196] bg-[#47D196]"
                  : "border-white/30 bg-[#1a4d3a]",
              )}
            >
              <span
                className={cn(
                  "inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform",
                  darkActive ? "translate-x-[22px]" : "translate-x-0.5",
                )}
              />
            </span>
          </>
        )}
      </button>

      <button
        ref={langBtnRef}
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

      {langMenu}
    </div>
  );
}
