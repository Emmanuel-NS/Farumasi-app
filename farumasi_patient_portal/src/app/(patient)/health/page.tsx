"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { mockHealthArticles } from "@/data/mock";
import { localizeArticle } from "@/data/mock-i18n";
import { useLanguageStore } from "@/store/language-store";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/translations";
import { X, Search, Lightbulb, ChevronRight, BookOpen, Clock } from "lucide-react";
import type { HealthArticle } from "@/types";

// ── Flutter tab labels (exact match) ─────────────────────────────────────────
const TABS = [
  "General Tips",
  "Remedies",
  "SRH",
  "Mental Health",
  "Nutrition",
  "Mother & Babies",
  "Did You Know?",
] as const;

type Tab = (typeof TABS)[number];

// ── Tab → article category mapping (mirrors Flutter's list groupings) ─────────
const TAB_CATEGORIES: Record<Tab, string[]> = {
  "General Tips":    ["General Health", "Wellness"],
  "Remedies":        ["Remedies", "Chronic Care"],
  "SRH":             ["SRH"],
  "Mental Health":   ["Mental Health"],
  "Nutrition":       ["Nutrition"],
  "Mother & Babies": ["Mother & Babies"],
  "Did You Know?":   ["Did You Know?"],
};

export default function HealthPage() {
  const router = useRouter();
  const t = useTranslation();
  const lang = useLanguageStore((s) => s.lang);
  const [activeTab, setActiveTab] = useState<Tab>("General Tips");
  const [searchQuery, setSearchQuery] = useState("");

  const TAB_LABELS: Record<Tab, string> = {
    "General Tips":    t.health_tab_general,
    "Remedies":        t.health_tab_remedies,
    "SRH":             t.health_tab_srh,
    "Mental Health":   t.health_tab_mental,
    "Nutrition":       t.health_tab_nutrition,
    "Mother & Babies": t.health_tab_mother,
    "Did You Know?":   t.health_tab_diyk,
  };

  const articles = useMemo(() => {
    const cats = TAB_CATEGORIES[activeTab];
    let list = mockHealthArticles.filter((a) => cats.includes(a.category));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.subtitle ?? "").toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)
      );
    }
    return list.map((a) => localizeArticle(a, lang));
  }, [activeTab, searchQuery, lang]);

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB]">
      {/* ── Header (matches Flutter SliverAppBar with search + tabs) ─────────── */}
      <div className="bg-white shadow-sm shrink-0">
        {/* Title */}
        <div className="px-5 pt-6 pb-3">
          <h1 className="text-[22px] font-bold text-farumasi-600 leading-tight">
            {t.health_title}
          </h1>
        </div>

        {/* Search bar */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 bg-[#F3F4F6] rounded-[12px] border border-slate-200 h-[45px] px-3">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.health_search_ph}
              className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tab bar — mirrors Flutter TabBar with pill-style indicators */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-5 pb-4">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "shrink-0 px-5 py-2 rounded-full border text-sm font-bold transition-all duration-150",
                activeTab === tab
                  ? "bg-farumasi-600 text-white border-farumasi-600 shadow-[0_4px_8px_rgba(30,158,104,0.3)]"
                  : "text-farumasi-600 border-farumasi-600 bg-transparent hover:bg-farumasi-50"
              )}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Article list ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-5">
        {articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Search className="w-16 h-16 text-slate-200 mb-4" />
            <p className="text-slate-500 font-medium">{t.health_no_articles}</p>
            <p className="text-slate-400 text-sm mt-1">{t.health_search_ph}</p>
          </div>
        ) : activeTab === "Did You Know?" ? (
          /* Did You Know? card style */
          <div className="max-w-[600px] mx-auto space-y-5">
            {articles.map((article) => (
              <DidYouKnowCard key={article.id} article={article} onSelect={(a) => router.push(`/health/${a.id}`)} />
            ))}
          </div>
        ) : (
          /* Uniform 2-column grid — all cards share the same 3:2 aspect ratio */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {articles.map((article) => (
              <ModernArticleCard
                key={article.id}
                article={article}
                onSelect={(a) => router.push(`/health/${a.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── ModernArticleCard — uniform 3:2 aspect ratio ───────────────────────── */
function ModernArticleCard({
  article,
  onSelect,
}: {
  article: HealthArticle;
  onSelect: (a: HealthArticle) => void;
}) {
  const hasVideo = Boolean(article.videoUrl);
  return (
    <button
      onClick={() => onSelect(article)}
      className="group relative w-full text-left overflow-hidden rounded-[22px] shadow-[0_6px_18px_rgba(0,0,0,0.07)] hover:shadow-[0_14px_32px_rgba(0,0,0,0.13)] transition-all duration-300 hover:-translate-y-0.5"
      style={{ aspectRatio: "3/2" }}
    >
      {article.imageUrl ? (
        <img
          src={article.imageUrl}
          alt={article.title}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
        />
      ) : (
        <div className="absolute inset-0 bg-farumasi-100 flex items-center justify-center">
          <BookOpen className="w-16 h-16 text-farumasi-300" />
        </div>
      )}

      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.1) 55%, rgba(0,0,0,0) 80%)" }}
      />

      {/* Top badges */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
        {hasVideo && (
          <span className="flex items-center gap-1.5 bg-red-600 rounded-full px-2.5 py-1">
            <svg className="w-3 h-3 text-white fill-white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            <span className="text-[10px] font-bold text-white uppercase tracking-wide">Video</span>
          </span>
        )}
        <div className={cn("flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1", !hasVideo && "ml-auto")}>
          <Clock className="w-3 h-3 text-white/80" />
          <span className="text-[11px] text-white/90 font-semibold">{article.readTimeMin} min</span>
        </div>
      </div>

      {/* Bottom text */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-10">
        <span className="inline-block bg-white/15 border border-white/25 backdrop-blur-sm rounded-[6px] px-2 py-0.5 text-[10px] font-bold text-white/90 uppercase tracking-wider leading-none mb-2">
          {article.category}
        </span>
        <p className="text-white text-[16px] font-bold leading-snug line-clamp-2 mb-1">
          {article.title}
        </p>
        <p className="text-white/65 text-[12px] truncate">{article.subtitle}</p>
      </div>
    </button>
  );
}

/* ── _DidYouKnowCard — orange header + text+image body ──────────────────────── */
function DidYouKnowCard({
  article,
  onSelect,
}: {
  article: HealthArticle;
  onSelect: (a: HealthArticle) => void;
}) {
  return (
    <button
      onClick={() => onSelect(article)}
      className="w-full text-left bg-white rounded-[20px] border border-orange-100 overflow-hidden hover:shadow-md transition-shadow"
      style={{ boxShadow: "0 6px 10px #FFF7ED" }}
    >
      <div className="flex items-center justify-between px-4 py-2.5 bg-orange-50">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-orange-500" />
          <span className="text-[12px] font-black text-orange-800 tracking-[1.2px]">DID YOU KNOW?</span>
        </div>
        <ChevronRight className="w-3 h-3 text-orange-300" />
      </div>
      <div className="flex gap-4 p-4">
        <div className="flex-1 min-w-0">
          <p className="text-[18px] font-bold text-slate-900 leading-snug mb-2">{article.title}</p>
          <p className="text-[14px] text-slate-500 leading-relaxed line-clamp-3">{article.summary}</p>
        </div>
        {article.imageUrl && (
          <div className="w-20 h-20 shrink-0 rounded-[12px] overflow-hidden">
            <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" />
          </div>
        )}
      </div>
    </button>
  );
}
