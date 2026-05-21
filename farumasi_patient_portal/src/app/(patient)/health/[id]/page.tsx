"use client";

"use client";

import { useParams, useRouter } from "next/navigation";
import { mockHealthArticles } from "@/data/mock";
import { localizeArticle } from "@/data/mock-i18n";
import { useLanguageStore } from "@/store/language-store";
import { ArrowLeft, Clock, BookOpen, Lightbulb, ChevronRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

// ── Category accent colours ────────────────────────────────────────────────
const CAT_ACCENT: Record<string, { chip: string; bg: string; bar: string }> = {
  "General Health": { chip: "bg-farumasi-600 text-white", bg: "bg-farumasi-50",  bar: "bg-farumasi-500" },
  "Wellness":       { chip: "bg-farumasi-600 text-white", bg: "bg-farumasi-50",  bar: "bg-farumasi-500" },
  "Remedies":       { chip: "bg-blue-600 text-white",     bg: "bg-blue-50",      bar: "bg-blue-500"      },
  "Chronic Care":   { chip: "bg-blue-600 text-white",     bg: "bg-blue-50",      bar: "bg-blue-500"      },
  "SRH":            { chip: "bg-rose-600 text-white",     bg: "bg-rose-50",      bar: "bg-rose-500"      },
  "Mental Health":  { chip: "bg-violet-600 text-white",   bg: "bg-violet-50",    bar: "bg-violet-500"    },
  "Nutrition":      { chip: "bg-orange-500 text-white",   bg: "bg-orange-50",    bar: "bg-orange-500"    },
  "Mother & Babies":{ chip: "bg-pink-500 text-white",     bg: "bg-pink-50",      bar: "bg-pink-500"      },
  "Did You Know?":  { chip: "bg-amber-500 text-white",    bg: "bg-amber-50",     bar: "bg-amber-500"     },
};
const DEFAULT_ACCENT = { chip: "bg-farumasi-600 text-white", bg: "bg-farumasi-50", bar: "bg-farumasi-500" };

/* ── Markdown body renderer ───────────────────────────────────────────────── */
function ArticleBody({ content, accent }: { content: string; accent: typeof DEFAULT_ACCENT }) {
  const lines = content.split("\n");
  let sectionCount = 0;

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-3" />;

        // **Section Header** at start/end of line
        const boldFull = line.match(/^\*\*(.+?)\*\*$/);
        if (boldFull) {
          sectionCount++;
          return (
            <div
              key={i}
              className={`flex items-start gap-3 mt-8 mb-2 px-4 py-3 rounded-[14px] ${accent.bg}`}
            >
              <div className={`w-[3px] self-stretch rounded-full ${accent.bar} shrink-0 min-h-[22px]`} />
              <h3 className="text-[16px] font-bold text-slate-900 leading-snug">
                {boldFull[1]}
              </h3>
            </div>
          );
        }

        // Inline **bold**
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} className="text-[16px] text-slate-600 leading-[1.9] px-1">
            {parts.map((part, j) => {
              const inner = part.match(/^\*\*(.+?)\*\*$/);
              return inner ? (
                <strong key={j} className="font-semibold text-slate-800">{inner[1]}</strong>
              ) : part;
            })}
          </p>
        );
      })}
    </div>
  );
}

/* ── YouTube video ID extractor ───────────────────────────────────────────── */
function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export default function ArticleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const lang = useLanguageStore((s) => s.lang);
  const rawArticle = mockHealthArticles.find((a) => a.id === id);

  if (!rawArticle) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#F9FAFB] text-slate-500">
        <BookOpen className="w-16 h-16 text-slate-200 mb-4" />
        <p className="font-medium">Article not found</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-farumasi-600 font-medium text-sm hover:underline"
        >
          ← Back to Health
        </button>
      </div>
    );
  }

  const article = localizeArticle(rawArticle, lang);

  // Related articles: same category, exclude current
  const related = mockHealthArticles
    .filter((a) => a.category === article.category && a.id !== article.id)
    .slice(0, 3)
    .map((a) => localizeArticle(a, lang));

  const accent = CAT_ACCENT[article.category] ?? DEFAULT_ACCENT;
  const isDyk = article.category === "Did You Know?";
  const ytId = article.videoUrl ? getYouTubeId(article.videoUrl) : null;

  return (
    <div className="min-h-full bg-[#F0F4F8]">

      {/* ── VIDEO HERO (YouTube embed, 16:9 responsive) ─────────────────── */}
      {ytId ? (
        <div className="relative bg-black w-full">
          {/* Floating back button */}
          <button
            onClick={() => router.back()}
            className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-md rounded-full pl-2.5 pr-4 py-2 text-white hover:bg-black/70 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[13px] font-semibold">Health</span>
          </button>
          {/* 16:9 iframe container */}
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
              className="absolute inset-0 w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={article.title}
            />
          </div>
        </div>
      ) : (
        /* ── IMAGE HERO (fixed 420px, content card overlaps) ────────────── */
        <div className="relative w-full overflow-hidden" style={{ height: 420 }}>
          {article.imageUrl ? (
            <img
              src={article.imageUrl}
              alt={article.title}
              className="w-full h-full object-cover scale-[1.02]"
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${accent.bg}`}>
              {isDyk ? (
                <Lightbulb className="w-28 h-28 text-amber-300" />
              ) : (
                <BookOpen className="w-28 h-28 text-farumasi-200" />
              )}
            </div>
          )}
          {/* Dual scrim */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.50) 0%, rgba(0,0,0,0) 38%, rgba(0,0,0,0.55) 80%, rgba(0,0,0,0.75) 100%)",
            }}
          />
          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="absolute top-4 left-4 flex items-center gap-2 bg-black/30 backdrop-blur-md rounded-full pl-2.5 pr-4 py-2 text-white hover:bg-black/50 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-[13px] font-semibold">Health</span>
          </button>
          {/* Category + read time chips */}
          <div className="absolute bottom-[68px] left-5 right-5 flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${accent.chip}`}>
              {article.category}
            </span>
            <span className="flex items-center gap-1.5 bg-black/35 backdrop-blur-sm rounded-full px-3 py-1">
              <Clock className="w-3 h-3 text-white/80" />
              <span className="text-[11px] text-white/90 font-semibold">{article.readTimeMin} min read</span>
            </span>
          </div>
        </div>
      )}

      {/* ── Content card ─────────────────────────────────────────────────── */}
      {/* Overlaps image hero; sits flush below video hero */}
      <div className={
        ytId
          ? "bg-white min-h-[60vh]"
          : "relative -mt-14 bg-white rounded-t-[32px] shadow-[0_-4px_30px_rgba(15,23,42,0.12)] min-h-[60vh]"
      }>
        {/* For video: category + read-time row at top of content card */}
        {ytId && (
          <div className="flex items-center gap-3 px-5 sm:px-10 pt-5 pb-4 border-b border-slate-100">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${accent.chip}`}>
              {article.category}
            </span>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[13px]">{article.readTimeMin} min read</span>
            </div>
          </div>
        )}
        <div className="max-w-[760px] mx-auto px-5 sm:px-10">

          {/* Title block */}
          <div className="pt-8 pb-6">
            {article.publishedAt && (
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-[1.4px] mb-3">
                {article.publishedAt.toLocaleDateString("en-GB", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </p>
            )}
            <h1 className="text-[28px] sm:text-[34px] font-extrabold text-slate-900 leading-[1.2] tracking-tight mb-4">
              {article.title}
            </h1>
            <p className="text-[17px] text-slate-500 leading-relaxed">
              {article.subtitle}
            </p>
          </div>

          {/* Meta bar */}
          <div className="flex items-center gap-3 py-4 border-y border-slate-100 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-farumasi-100 flex items-center justify-center">
                <BookOpen className="w-3.5 h-3.5 text-farumasi-600" />
              </div>
              <span className="text-[13px] text-slate-400">
                <span className="text-slate-600 font-semibold">{article.source}</span>
              </span>
            </div>
            <span className="text-slate-200">|</span>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[13px]">{article.readTimeMin} min read</span>
            </div>
          </div>

          {/* Summary callout */}
          <div className={`flex gap-3 rounded-[16px] ${accent.bg} p-5 mb-8`}>
            <div className={`w-[3px] rounded-full ${accent.bar} shrink-0`} />
            <p className="text-[16px] text-slate-700 leading-[1.85] font-medium italic">
              {article.summary}
            </p>
          </div>

          {/* Full body */}
          <ArticleBody content={article.fullContent ?? article.summary} accent={accent} />

          {/* Verified source card */}
          <div className="mt-12 mb-4 rounded-[20px] border border-slate-100 bg-gradient-to-br from-farumasi-50 to-white p-5 flex items-start gap-4 shadow-sm">
            <div className="w-11 h-11 rounded-full bg-farumasi-600 flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(30,158,104,0.35)]">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-farumasi-600 mb-0.5">Verified Source</p>
              <p className="text-[15px] font-bold text-slate-900">{article.source}</p>
              <p className="text-[13px] text-slate-400 mt-0.5 leading-snug">
                Reviewed by medical professionals for clinical accuracy.
              </p>
            </div>
          </div>

          {/* Back to Health link */}
          <div className="flex justify-center py-6">
            <Link
              href="/health"
              className="inline-flex items-center gap-2 text-farumasi-600 font-semibold text-[14px] hover:gap-3 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Discover Wellness
            </Link>
          </div>

          {/* Related articles */}
          {related.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[20px] font-bold text-slate-900">More to read</h2>
                <Link
                  href="/health"
                  className="flex items-center gap-1 text-farumasi-600 text-[13px] font-semibold hover:underline"
                >
                  See all <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((rel) => {
                  const ra = CAT_ACCENT[rel.category] ?? DEFAULT_ACCENT;
                  return (
                    <Link
                      key={rel.id}
                      href={`/health/${rel.id}`}
                      className="group flex flex-col bg-white rounded-[20px] overflow-hidden border border-slate-100 shadow-sm hover:shadow-[0_8px_24px_rgba(15,23,42,0.10)] transition-shadow"
                    >
                      <div className="relative overflow-hidden" style={{ height: 150 }}>
                        {rel.imageUrl ? (
                          <img
                            src={rel.imageUrl}
                            alt={rel.title}
                            className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500"
                          />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center ${ra.bg}`}>
                            <BookOpen className="w-10 h-10 text-slate-300" />
                          </div>
                        )}
                        <div
                          className="absolute inset-0"
                          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)" }}
                        />
                        <span className={`absolute bottom-3 left-3 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${ra.chip}`}>
                          {rel.category}
                        </span>
                      </div>
                      <div className="p-3.5 flex flex-col gap-1.5">
                        <p className="text-[14px] font-bold text-slate-900 line-clamp-2 leading-snug">
                          {rel.title}
                        </p>
                        <div className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span className="text-[12px]">{rel.readTimeMin} min read</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
