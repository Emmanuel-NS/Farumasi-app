"use client";

import { useState, useMemo } from "react";
import { mockHealthArticles } from "@/data/mock";
import { cn } from "@/lib/utils";
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
  const [activeTab, setActiveTab] = useState<Tab>("General Tips");
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<HealthArticle | null>(null);

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
    return list;
  }, [activeTab, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB]">
      {/* ── Header (matches Flutter SliverAppBar with search + tabs) ─────────── */}
      <div className="bg-white shadow-sm shrink-0">
        {/* Title */}
        <div className="px-5 pt-6 pb-3">
          <h1 className="text-[22px] font-bold text-farumasi-600 leading-tight">
            Discover Wellness
          </h1>
        </div>

        {/* Search bar */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 bg-[#F3F4F6] rounded-[12px] border border-slate-200 h-[45px] px-3">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tips, remedies, facts..."
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
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Article list ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-5">
        {articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Search className="w-16 h-16 text-slate-200 mb-4" />
            <p className="text-slate-500 font-medium">No results found</p>
            <p className="text-slate-400 text-sm mt-1">Try a different search term</p>
          </div>
        ) : activeTab === "Did You Know?" ? (
          /* Did You Know? card style */
          <div className="max-w-[600px] mx-auto space-y-5">
            {articles.map((article) => (
              <DidYouKnowCard key={article.id} article={article} onSelect={setSelected} />
            ))}
          </div>
        ) : (
          /* _ModernArticleCard grid */
          <div
            className="grid gap-5"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(450px, 100%), 1fr))" }}
          >
            {articles.map((article) => (
              <ModernArticleCard key={article.id} article={article} onSelect={setSelected} />
            ))}
          </div>
        )}
      </div>

      {/* Article detail modal */}
      {selected && (
        <ArticleDetailModal article={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

/* ── _ModernArticleCard — Flutter: 260px tall, full cover image + gradient + bottom text ── */
function ModernArticleCard({
  article,
  onSelect,
}: {
  article: HealthArticle;
  onSelect: (a: HealthArticle) => void;
}) {
  return (
    <button
      onClick={() => onSelect(article)}
      className="relative w-full text-left overflow-hidden rounded-[24px] shadow-[0_8px_15px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.10)] transition-shadow bg-white"
      style={{ height: 260 }}
    >
      {article.imageUrl ? (
        <img
          src={article.imageUrl}
          alt={article.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-farumasi-100 flex items-center justify-center">
          <BookOpen className="w-16 h-16 text-farumasi-300" />
        </div>
      )}

      {/* Gradient overlay — black85% at bottom → transparent at 60% */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 60%)" }}
      />

      {/* Bottom text overlay */}
      <div className="absolute bottom-5 left-5 right-5">
        <span className="inline-block bg-white/20 rounded-[8px] px-2.5 py-1 text-[11px] font-bold text-white leading-none mb-2">
          {article.category}
        </span>
        <p className="text-white text-[22px] font-bold leading-snug line-clamp-2 mb-1">
          {article.title}
        </p>
        <p className="text-white/70 text-[14px] truncate">{article.subtitle}</p>
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

/* ── ArticleDetailModal — matches Flutter ArticleDetailScreen ─────────────── */
function ArticleDetailModal({
  article,
  onClose,
}: {
  article: HealthArticle;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {article.imageUrl && (
          <div className="h-52 sm:h-64 relative shrink-0">
            <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" />
            <button
              onClick={onClose}
              className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center text-farumasi-600 hover:bg-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="overflow-y-auto scrollbar-hide flex-1">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="bg-farumasi-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wide">
                {article.category}
              </span>
              <div className="flex items-center gap-1 text-slate-400">
                <Clock className="w-4 h-4" />
                <span className="text-[13px]">{article.readTimeMin} min read</span>
              </div>
            </div>

            <h2 className="text-[28px] font-bold text-slate-900 leading-snug mb-2">{article.title}</h2>
            <p className="text-[18px] text-slate-500 leading-relaxed mb-6">{article.subtitle}</p>

            <div className="border-t border-slate-100 my-6" />

            <div className="text-[17px] text-slate-600 leading-[1.8] whitespace-pre-line">
              {article.fullContent ?? article.summary}
            </div>

            <div className="mt-10 bg-slate-50 rounded-[12px] border border-slate-200 p-4 flex items-start gap-3 mb-8">
              <BookOpen className="w-5 h-5 text-farumasi-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] text-slate-400">Source</p>
                <p className="font-bold text-slate-800">{article.source}</p>
              </div>
            </div>
          </div>
        </div>

        {!article.imageUrl && (
          <div className="border-t border-slate-100 px-6 py-4 shrink-0">
            <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700">
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
