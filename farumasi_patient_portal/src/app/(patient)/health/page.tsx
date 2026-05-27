"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguageStore } from "@/store/language-store";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/translations";
import { X, Search, Lightbulb, ChevronRight, BookOpen, Clock, Sparkles } from "lucide-react";
import type { HealthArticle } from "@/types";
import { articlesService } from "@/lib/services/articles.service";

// ── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  "All",
  "General Tips",
  "Conditions",
  "Medication",
  "Women & Babies",
  "Mental Health",
  "Nutrition",
  "Did You Know?",
] as const;

type Tab = (typeof TABS)[number];

// Backend category → tab routing. Unmapped categories fall into "General Tips".
const ARTICLE_CATEGORY_MAP: Record<string, Tab[]> = {
  // General
  "General Health": ["General Tips"],
  "Wellness": ["General Tips"],
  "First Aid": ["General Tips"],
  // Conditions / Diseases
  "Chronic Disease": ["Conditions"],
  "Infectious Diseases": ["Conditions"],
  "Cardiovascular": ["Conditions"],
  "Respiratory": ["Conditions"],
  "Digestive Health": ["Conditions"],
  "Skin Health": ["Conditions"],
  "Eye Health": ["Conditions"],
  "Oral Health": ["Conditions"],
  // Medication
  "Medication Safety": ["Medication"],
  "Remedies": ["Medication"],
  "Antibiotics": ["Medication"],
  "Elderly Care": ["Medication"],
  // Women & Babies
  "Women's Health": ["Women & Babies"],
  "SRH": ["Women & Babies"],
  "Pediatrics": ["Women & Babies"],
  "Mother & Babies": ["Women & Babies"],
  // Mental / Nutrition
  "Mental Health": ["Mental Health"],
  "Nutrition": ["Nutrition"],
};

export default function HealthPage() {
  const router = useRouter();
  const t = useTranslation();
  const lang = useLanguageStore((s) => s.lang);
  const [activeTab, setActiveTab] = useState<Tab>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [ARTICLES, setArticles] = useState<HealthArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    articlesService
      .listPublished({ limit: 100 })
      .then((items) => setArticles(items))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, []);

  const TAB_LABELS: Record<Tab, string> = {
    "All": lang === "rw" ? "Byose" : lang === "fr" ? "Tous" : "All",
    "General Tips": t.health_tab_general,
    "Conditions": lang === "rw" ? "Indwara" : lang === "fr" ? "Maladies" : "Conditions",
    "Medication": lang === "rw" ? "Imiti" : lang === "fr" ? "Médicaments" : "Medication",
    "Women & Babies": lang === "rw" ? "Ababyeyi & Abana" : lang === "fr" ? "Femmes & Bébés" : "Women & Babies",
    "Mental Health": t.health_tab_mental,
    "Nutrition": t.health_tab_nutrition,
    "Did You Know?": t.health_tab_diyk,
  };

  const articles = useMemo(() => {
    let list = ARTICLES;
    if (activeTab !== "All") {
      list = list.filter((a) => {
        const tabs = ARTICLE_CATEGORY_MAP[a.category] ?? ["General Tips"];
        return tabs.includes(activeTab);
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.subtitle ?? "").toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          (a.summary ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [ARTICLES, activeTab, searchQuery]);

  // Featured = top N most recent in current filter; rest goes in the grid.
  const FEATURED_COUNT = 6;
  const featured = articles.slice(0, Math.min(FEATURED_COUNT, articles.length));
  const rest = articles.slice(featured.length);

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB]">
      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="bg-white shadow-sm shrink-0 sticky top-0 z-10">
        <div className="px-5 pt-6 pb-3 flex items-end justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-farumasi-700 leading-tight">
              {t.health_title}
            </h1>
            <p className="text-[12px] text-slate-500 mt-0.5">
              {lang === "rw"
                ? "Inkuru z'ubuzima zizewe ku Banyarwanda"
                : lang === "fr"
                ? "Articles santé fiables pour le Rwanda"
                : "Trusted health articles for Rwanda"}
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-farumasi-700 bg-farumasi-50 px-2 py-1 rounded-full font-semibold">
            <Sparkles className="w-3 h-3" />
            {ARTICLES.length} articles
          </span>
        </div>

        {/* Search bar */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 bg-[#F3F4F6] rounded-[12px] border border-slate-200 h-[45px] px-3 focus-within:border-farumasi-400 focus-within:bg-white transition-colors">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.health_search_ph}
              className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-5 pb-4">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "shrink-0 px-4 py-1.5 rounded-full border text-[13px] font-semibold transition-all duration-150",
                  isActive
                    ? "bg-farumasi-600 text-white border-farumasi-600 shadow-[0_4px_8px_rgba(30,158,104,0.3)]"
                    : "text-farumasi-700 border-slate-200 bg-white hover:border-farumasi-300 hover:bg-farumasi-50"
                )}
              >
                {TAB_LABELS[tab]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Article list ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 sm:px-5 py-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-10 h-10 border-2 border-farumasi-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-slate-500 text-sm">Loading articles…</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Search className="w-14 h-14 text-slate-200 mb-3" />
            <p className="text-slate-600 font-semibold">{t.health_no_articles}</p>
            <p className="text-slate-400 text-sm mt-1 max-w-xs">
              Try another tab or clear the search to see more articles.
            </p>
          </div>
        ) : activeTab === "Did You Know?" ? (
          <div className="max-w-[600px] mx-auto space-y-4">
            {articles.map((article) => (
              <DidYouKnowCard
                key={article.id}
                article={article}
                onSelect={(a) => router.push(`/health/${a.slug ?? a.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-5">
            {/* Featured auto-sliding rail */}
            {featured.length > 0 && (
              <FeaturedRail
                articles={featured}
                onSelect={(a) => router.push(`/health/${a.slug ?? a.id}`)}
                label={
                  lang === "rw"
                    ? "Bishimangirwa"
                    : lang === "fr"
                    ? "À la une"
                    : "Featured"
                }
              />
            )}

            {/* Section heading */}
            {rest.length > 0 && (
              <div className="flex items-end justify-between pt-1">
                <h2 className="text-[15px] font-bold text-slate-900">
                  {lang === "rw"
                    ? "Ibindi byasomwa"
                    : lang === "fr"
                    ? "À lire aussi"
                    : "More to read"}
                </h2>
                <span className="text-[11px] text-slate-400 font-medium">
                  {rest.length} {rest.length === 1 ? "article" : "articles"}
                </span>
              </div>
            )}

            {/* Grid */}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rest.map((article) => (
                  <ModernArticleCard
                    key={article.id}
                    article={article}
                    onSelect={(a) => router.push(`/health/${a.slug ?? a.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── FeaturedRail — auto-sliding portrait carousel (right → left) ───────── */
function FeaturedRail({
  articles,
  onSelect,
  label,
}: {
  articles: HealthArticle[];
  onSelect: (a: HealthArticle) => void;
  label: string;
}) {
  // Duplicate the list so the marquee loop is seamless.
  const loop = [...articles, ...articles];
  // Slower with more items; tuned for ~80px/sec.
  const durationSec = Math.max(18, articles.length * 5);

  return (
    <section aria-label="Featured articles">
      <div className="flex items-end justify-between mb-2.5 px-0.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-[1.2px] px-2 py-0.5 rounded-full">
            <Sparkles className="w-3 h-3" />
            {label}
          </span>
          <h2 className="text-[15px] font-bold text-slate-900">
            {articles.length} highlights
          </h2>
        </div>
        <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
          auto-scrolling
        </span>
      </div>

      <div className="relative overflow-hidden group">
        {/* edge fades */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#F9FAFB] to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#F9FAFB] to-transparent z-10" />

        <div
          className="featured-track flex gap-3 sm:gap-4 will-change-transform"
          style={{ animationDuration: `${durationSec}s` }}
        >
          {loop.map((article, idx) => (
            <FeaturedRailCard
              key={`${article.id}-${idx}`}
              article={article}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        .featured-track {
          animation-name: featuredMarquee;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          width: max-content;
        }
        .group:hover .featured-track,
        .featured-track:focus-within {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .featured-track {
            animation: none;
          }
        }
        @keyframes featuredMarquee {
          from {
            transform: translateX(0);
          }
          to {
            /* Half because the list is duplicated for seamless looping. */
            transform: translateX(-50%);
          }
        }
      `}</style>
    </section>
  );
}

/* ── FeaturedRailCard — small portrait card used inside the rail ────────── */
function FeaturedRailCard({
  article,
  onSelect,
}: {
  article: HealthArticle;
  onSelect: (a: HealthArticle) => void;
}) {
  return (
    <button
      onClick={() => onSelect(article)}
      className="group/card relative shrink-0 w-[148px] sm:w-[170px] text-left overflow-hidden rounded-[16px] bg-slate-900 shadow-[0_4px_12px_rgba(0,0,0,0.10)] hover:shadow-[0_10px_24px_rgba(0,0,0,0.18)] transition-shadow"
      style={{ aspectRatio: "3/4" }}
    >
      {article.imageUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={article.imageUrl}
          alt={article.title}
          className="absolute inset-0 w-full h-full object-cover opacity-95 group-hover/card:scale-[1.06] transition-transform duration-500"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-farumasi-600 to-farumasi-300 flex items-center justify-center">
          <BookOpen className="w-10 h-10 text-white/80" />
        </div>
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.2) 55%, rgba(0,0,0,0) 90%)",
        }}
      />
      <div className="absolute top-2 left-2 right-2">
        <span className="inline-block bg-white/15 border border-white/25 backdrop-blur-sm text-white/95 text-[9px] font-bold uppercase tracking-[0.8px] px-1.5 py-0.5 rounded-full">
          {article.category}
        </span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5 pt-6">
        <p className="text-white text-[12.5px] font-bold leading-snug line-clamp-3 mb-1">
          {article.title}
        </p>
        <div className="flex items-center gap-1 text-white/70 text-[10px]">
          <Clock className="w-2.5 h-2.5" />
          <span>{article.readTimeMin} min</span>
        </div>
      </div>
    </button>
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
      className="group relative w-full text-left overflow-hidden rounded-[20px] bg-slate-900 shadow-[0_6px_18px_rgba(0,0,0,0.07)] hover:shadow-[0_14px_32px_rgba(0,0,0,0.13)] transition-all duration-300 hover:-translate-y-0.5"
      style={{ aspectRatio: "4/5" }}
    >
      {article.imageUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={article.imageUrl}
          alt={article.title}
          className="absolute inset-0 w-full h-full object-cover opacity-95 group-hover:scale-[1.05] transition-transform duration-500"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-farumasi-200 to-farumasi-50 flex items-center justify-center">
          <BookOpen className="w-14 h-14 text-farumasi-400" />
        </div>
      )}

      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0) 85%)",
        }}
      />

      {/* Top badges */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
        {hasVideo ? (
          <span className="flex items-center gap-1.5 bg-red-600 rounded-full px-2.5 py-1">
            <svg className="w-3 h-3 text-white fill-white" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span className="text-[10px] font-bold text-white uppercase tracking-wide">Video</span>
          </span>
        ) : (
          <span className="inline-block bg-white/15 border border-white/25 backdrop-blur-sm rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white/95 uppercase tracking-[0.8px]">
            {article.category}
          </span>
        )}
        <div className="flex items-center gap-1 bg-black/35 backdrop-blur-sm rounded-full px-2 py-0.5">
          <Clock className="w-3 h-3 text-white/80" />
          <span className="text-[11px] text-white/95 font-semibold">
            {article.readTimeMin} min
          </span>
        </div>
      </div>

      {/* Bottom text */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-12">
        <p className="text-white text-[15px] font-bold leading-snug line-clamp-2 mb-1.5">
          {article.title}
        </p>
        <p className="text-white/70 text-[12px] leading-snug line-clamp-2">
          {article.summary || article.subtitle}
        </p>
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
          <span className="text-[12px] font-black text-orange-800 tracking-[1.2px]">
            DID YOU KNOW?
          </span>
        </div>
        <ChevronRight className="w-3 h-3 text-orange-300" />
      </div>
      <div className="flex gap-4 p-4">
        <div className="flex-1 min-w-0">
          <p className="text-[18px] font-bold text-slate-900 leading-snug mb-2">
            {article.title}
          </p>
          <p className="text-[14px] text-slate-500 leading-relaxed line-clamp-3">
            {article.summary}
          </p>
        </div>
        {article.imageUrl && (
          <div className="w-20 h-20 shrink-0 rounded-[12px] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.imageUrl}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>
    </button>
  );
}
