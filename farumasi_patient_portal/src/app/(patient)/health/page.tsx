"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLanguageStore } from "@/store/language-store";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/translations";
import {
  X,
  Search,
  Lightbulb,
  ChevronRight,
  BookOpen,
  Clock,
  Sparkles,
  Heart,
  MessageCircle,
  Eye,
  Share2,
  Bookmark,
  SlidersHorizontal,
} from "lucide-react";
import type { HealthArticle, ArticleType } from "@/types";
import { articlesService, type ArticleSort } from "@/lib/services/articles.service";

// ── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  "All",
  "General Health",
  "Sexual Health",
  "Mother & Babies",
  "Women's Health",
  "Men's Health",
  "Nutrition",
  "Child Wellness",
  "Chronic Diseases",
  "Mental Health",
  "Others",
] as const;

type Tab = (typeof TABS)[number];

// Maps backend category strings → which patient tabs they belong to.
// Categories NOT listed here fall into the "Others" tab.
const ARTICLE_CATEGORY_MAP: Record<string, Tab[]> = {
  "General Health":      ["General Health"],
  "Wellness":            ["General Health"],
  "First Aid":           ["General Health"],
  "SRH":                 ["Sexual Health"],
  "Sexual Health":       ["Sexual Health"],
  "Mother & Babies":     ["Mother & Babies"],
  "Pediatrics":          ["Mother & Babies", "Child Wellness"],
  "Women's Health":      ["Women's Health"],
  "Men's Health":        ["Men's Health"],
  "Nutrition":           ["Nutrition"],
  "Child Wellness":      ["Child Wellness"],
  "Chronic Disease":     ["Chronic Diseases"],
  "Cardiovascular":      ["Chronic Diseases"],
  "Respiratory":         ["Chronic Diseases"],
  "Digestive Health":    ["Chronic Diseases"],
  "Infectious Diseases": ["Chronic Diseases"],
  "Skin Health":         ["Chronic Diseases"],
  "Eye Health":          ["Chronic Diseases"],
  "Oral Health":         ["Chronic Diseases"],
  "Mental Health":       ["Mental Health"],
};

const ARTICLE_TYPES: { value: "all" | ArticleType; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "article", label: "Article" },
  { value: "tip", label: "Tip" },
  { value: "guide", label: "Guide" },
  { value: "news", label: "News" },
  { value: "did_you_know", label: "Did You Know" },
];

const SORT_OPTIONS: { value: ArticleSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "likes", label: "Most Liked" },
  { value: "views", label: "Most Viewed" },
  { value: "shares", label: "Most Shared" },
  { value: "comments", label: "Most Commented" },
];

function timeAgo(d?: Date): string {
  if (!d) return "";
  const s = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(months / 12)}y`;
}

function compactNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export default function HealthPage() {
  const router = useRouter();
  const t = useTranslation();
  const lang = useLanguageStore((s) => s.lang);
  const [activeTab, setActiveTab] = useState<Tab>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [ARTICLES, setArticles] = useState<HealthArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedOnly, setSavedOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | ArticleType>("all");
  const [sortBy, setSortBy] = useState<ArticleSort>("newest");

  const fetchArticles = useCallback(() => {
    setLoading(true);
    const promise = savedOnly
      ? articlesService.listSaved({ limit: 100 })
      : articlesService.listPublished({
          limit: 100,
          sortBy,
          articleType: typeFilter !== "all" ? typeFilter : undefined,
        });
    promise
      .then((items) => setArticles(items))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, [savedOnly, sortBy, typeFilter]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const TAB_LABELS: Record<Tab, string> = {
    "All":              lang === "rw" ? "Byose"                   : lang === "fr" ? "Tous"                : "All",
    "General Health":   lang === "rw" ? "Ubuzima Rusange"          : lang === "fr" ? "Santé Générale"      : "General Health",
    "Sexual Health":    lang === "rw" ? "Ubuzima bw'Imibonano"     : lang === "fr" ? "Santé Sexuelle"      : "Sexual Health",
    "Mother & Babies":  lang === "rw" ? "Ababyeyi & Abana"         : lang === "fr" ? "Mères & Bébés"       : "Mother & Babies",
    "Women's Health":   lang === "rw" ? "Ubuzima bw'Abagore"       : lang === "fr" ? "Santé Féminine"      : "Women's Health",
    "Men's Health":     lang === "rw" ? "Ubuzima bw'Abagabo"       : lang === "fr" ? "Santé Masculine"     : "Men's Health",
    "Nutrition":        t.health_tab_nutrition,
    "Child Wellness":   lang === "rw" ? "Ubuzima bw'Abana"         : lang === "fr" ? "Santé Enfant"        : "Child Wellness",
    "Chronic Diseases": lang === "rw" ? "Indwara Zidakira (NCDs)"  : lang === "fr" ? "Maladies Chroniques" : "Chronic Diseases",
    "Mental Health":    t.health_tab_mental,
    "Others":           lang === "rw" ? "Ibindi"                   : lang === "fr" ? "Autres"              : "Others",
  };

  const articles = useMemo(() => {
    let list = ARTICLES;
    if (activeTab === "Others") {
      // Articles whose categories are all outside the known map
      list = list.filter((a) => {
        const cats = a.categories && a.categories.length > 0 ? a.categories : [a.category ?? ""];
        return !cats.some((c) => c in ARTICLE_CATEGORY_MAP);
      });
    } else if (activeTab !== "All") {
      list = list.filter((a) => {
        const cats = a.categories && a.categories.length > 0 ? a.categories : [a.category ?? ""];
        return cats.some((c) => (ARTICLE_CATEGORY_MAP[c] ?? []).includes(activeTab));
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.subtitle ?? "").toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          (a.categories ?? []).some((c) => c.toLowerCase().includes(q)) ||
          (a.summary ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [ARTICLES, activeTab, searchQuery]);

  const FEATURED_COUNT = 4;
  const featured = articles.slice(0, Math.min(FEATURED_COUNT, articles.length));
  // Grid always shows ALL articles (not just the rest after featured)
  const gridArticles = articles;

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
            {articles.length} articles
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

        {/* Filter / sort row */}
        <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
          <button
            onClick={() => setSavedOnly((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-colors",
              savedOnly
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-white text-slate-700 border-slate-200 hover:border-amber-300"
            )}
            aria-pressed={savedOnly}
          >
            <Bookmark className={cn("w-3.5 h-3.5", savedOnly && "fill-current")} />
            {savedOnly ? "Saved only" : "Saved"}
          </button>

          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "all" | ArticleType)}
              className="appearance-none bg-white border border-slate-200 text-slate-700 text-[12px] font-semibold rounded-full pl-3 pr-7 py-1.5 hover:border-farumasi-300 focus:outline-none focus:border-farumasi-400"
            >
              {ARTICLE_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  Type: {o.label}
                </option>
              ))}
            </select>
            <ChevronRight className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
          </div>

          <div className="relative ml-auto">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ArticleSort)}
              className="appearance-none bg-white border border-slate-200 text-slate-700 text-[12px] font-semibold rounded-full pl-7 pr-7 py-1.5 hover:border-farumasi-300 focus:outline-none focus:border-farumasi-400"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  Sort: {o.label}
                </option>
              ))}
            </select>
            <ChevronRight className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
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
            <p className="text-slate-600 font-semibold">
              {savedOnly ? "No saved articles yet" : t.health_no_articles}
            </p>
            <p className="text-slate-400 text-sm mt-1 max-w-xs">
              {savedOnly
                ? "Tap the bookmark on any article to save it for later."
                : "Try another tab or clear the search to see more articles."}
            </p>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-5">
            {/* Featured rail */}
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

            {/* Grid — always show all articles */}
            {gridArticles.length > 0 && (
              <>
                <div className="flex items-end justify-between pt-1">
                  <h2 className="text-[15px] font-bold text-slate-900">
                    {lang === "rw"
                      ? "Ibindi byasomwa"
                      : lang === "fr"
                      ? "À lire aussi"
                      : "More to read"}
                  </h2>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {gridArticles.length} {gridArticles.length === 1 ? "article" : "articles"}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {gridArticles.map((article) => (
                    <ModernArticleCard
                      key={article.id}
                      article={article}
                      onSelect={(a) => router.push(`/health/${a.slug ?? a.id}`)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── FeaturedRail ───────────────────────────────────────────────────────── */
function FeaturedRail({
  articles,
  onSelect,
  label,
}: {
  articles: HealthArticle[];
  onSelect: (a: HealthArticle) => void;
  label: string;
}) {
  const loop = [...articles, ...articles];
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

    </section>
  );
}

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
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1">
        <span className="inline-block bg-white/15 border border-white/25 backdrop-blur-sm text-white/95 text-[9px] font-bold uppercase tracking-[0.8px] px-1.5 py-0.5 rounded-full truncate">
          {article.category}
        </span>
        {article.isSaved && (
          <Bookmark className="w-3 h-3 text-amber-300 fill-amber-300 shrink-0" />
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5 pt-6">
        <p className="text-white text-[12.5px] font-bold leading-snug line-clamp-3 mb-1">
          {article.title}
        </p>
        <div className="flex items-center gap-2 text-white/80 text-[10px]">
          <span className="inline-flex items-center gap-0.5">
            <Heart className={cn("w-2.5 h-2.5", article.isLiked && "fill-red-400 text-red-400")} />
            {compactNumber(article.likeCount ?? 0)}
          </span>
          <span className="inline-flex items-center gap-0.5">
            <Eye className="w-2.5 h-2.5" />
            {compactNumber(article.viewCount ?? 0)}
          </span>
          <span className="inline-flex items-center gap-0.5 ml-auto">
            <Clock className="w-2.5 h-2.5" />
            {timeAgo(article.publishedAt) || `${article.readTimeMin}m`}
          </span>
        </div>
      </div>
    </button>
  );
}

/* ── ModernArticleCard ──────────────────────────────────────────────────── */
function ModernArticleCard({
  article,
  onSelect,
}: {
  article: HealthArticle;
  onSelect: (a: HealthArticle) => void;
}) {
  const hasVideo = Boolean(article.videoUrl);
  const extraCats = (article.categories?.length ?? 0) > 1 ? (article.categories!.length - 1) : 0;
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

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0) 85%)",
        }}
      />

      {/* Top badges */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {hasVideo ? (
            <span className="flex items-center gap-1.5 bg-red-600 rounded-full px-2.5 py-1 shrink-0">
              <svg className="w-3 h-3 text-white fill-white" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span className="text-[10px] font-bold text-white uppercase tracking-wide">Video</span>
            </span>
          ) : (
            <span className="inline-block bg-white/15 border border-white/25 backdrop-blur-sm rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white/95 uppercase tracking-[0.8px] truncate max-w-[120px]">
              {article.category}
            </span>
          )}
          {extraCats > 0 && (
            <span className="inline-block bg-black/40 backdrop-blur-sm rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white/90 shrink-0">
              +{extraCats}
            </span>
          )}
          {article.articleType && article.articleType !== "article" && (
            <span className="inline-block bg-farumasi-600/90 rounded-full px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-[0.6px] shrink-0">
              {article.articleType === "did_you_know" ? "DYK" : article.articleType}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {article.isSaved && (
            <Bookmark className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
          )}
          <div className="flex items-center gap-1 bg-black/35 backdrop-blur-sm rounded-full px-2 py-0.5">
            <Clock className="w-3 h-3 text-white/80" />
            <span className="text-[11px] text-white/95 font-semibold">
              {timeAgo(article.publishedAt) || `${article.readTimeMin}m`}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom text + stats */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-12">
        <p className="text-white text-[15px] font-bold leading-snug line-clamp-2 mb-1">
          {article.title}
        </p>
        <p className="text-white/70 text-[12px] leading-snug line-clamp-2 mb-2">
          {article.summary || article.subtitle}
        </p>
        <div className="flex items-center gap-3 text-white/90 text-[11px] font-semibold">
          <span className="inline-flex items-center gap-1">
            <Heart className={cn("w-3.5 h-3.5", article.isLiked && "fill-red-400 text-red-400")} />
            {compactNumber(article.likeCount ?? 0)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="w-3.5 h-3.5" />
            {compactNumber(article.commentCount ?? 0)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {compactNumber(article.viewCount ?? 0)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Share2 className="w-3.5 h-3.5" />
            {compactNumber(article.shareCount ?? 0)}
          </span>
        </div>
      </div>
    </button>
  );
}

/* ── DidYouKnowCard ─────────────────────────────────────────────────────── */
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
          <p className="text-[14px] text-slate-500 leading-relaxed line-clamp-3 mb-2">
            {article.summary}
          </p>
          <div className="flex items-center gap-3 text-slate-400 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1">
              <Heart className={cn("w-3 h-3", article.isLiked && "fill-red-500 text-red-500")} />
              {compactNumber(article.likeCount ?? 0)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              {compactNumber(article.commentCount ?? 0)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {compactNumber(article.viewCount ?? 0)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo(article.publishedAt) || `${article.readTimeMin}m`}
            </span>
          </div>
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
