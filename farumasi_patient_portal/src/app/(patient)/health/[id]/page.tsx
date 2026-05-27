"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Clock, Share2, Bookmark, CalendarDays } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { articlesService } from "@/lib/services/articles.service";
import type { HealthArticle } from "@/types";

export default function ArticleDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const slugOrId = params?.id ?? "";

  const [article, setArticle] = useState<HealthArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!slugOrId) return;
    setLoading(true);
    articlesService
      .getBySlug(slugOrId)
      .then(setArticle)
      .catch(() => setArticle(null))
      .finally(() => setLoading(false));
  }, [slugOrId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#F9FAFB] py-20">
        <div className="w-10 h-10 border-2 border-farumasi-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#F9FAFB] text-slate-500 py-20">
        <BookOpen className="w-16 h-16 text-slate-200 mb-4" />
        <p className="font-medium">Article not found.</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-farumasi-600 font-medium text-sm hover:underline"
        >
          Back to Health
        </button>
      </div>
    );
  }

  const publishedLabel = article.publishedAt
    ? article.publishedAt.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: article.title, text: article.summary, url });
      } catch {
        /* user cancelled */
      }
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <div className="bg-[#F9FAFB] min-h-full">
      {/* ── Hero image with overlay header ─────────────────────────────────── */}
      <div className="relative w-full aspect-[16/10] sm:aspect-[21/9] bg-slate-200 overflow-hidden">
        {article.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={article.imageUrl}
            alt={article.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-farumasi-200 to-farumasi-50 flex items-center justify-center">
            <BookOpen className="w-20 h-20 text-farumasi-400" />
          </div>
        )}
        {/* Gradient veil for legibility */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.05) 55%, rgba(0,0,0,0.85) 100%)",
          }}
        />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 sm:px-6 pt-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 bg-black/30 hover:bg-black/45 backdrop-blur-sm text-white rounded-full pl-2.5 pr-3.5 py-1.5 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSaved((s) => !s)}
              aria-label="Save article"
              className={`w-9 h-9 grid place-items-center rounded-full backdrop-blur-sm transition-colors ${
                saved
                  ? "bg-white text-farumasi-700"
                  : "bg-black/30 hover:bg-black/45 text-white"
              }`}
            >
              <Bookmark className={`w-4 h-4 ${saved ? "fill-current" : ""}`} />
            </button>
            <button
              onClick={handleShare}
              aria-label="Share article"
              className="w-9 h-9 grid place-items-center rounded-full bg-black/30 hover:bg-black/45 backdrop-blur-sm text-white transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom title block */}
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 pb-5">
          <div className="max-w-3xl mx-auto">
            <span className="inline-block bg-farumasi-600 text-white text-[10px] font-bold uppercase tracking-[1px] px-2.5 py-1 rounded-full mb-2">
              {article.category}
            </span>
            <h1 className="text-white text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight drop-shadow-md">
              {article.title}
            </h1>
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Meta strip */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 mb-5 pb-5 border-b border-slate-200">
          {article.readTimeMin > 0 && (
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5" />
              {article.readTimeMin} min read
            </span>
          )}
          {publishedLabel && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              {publishedLabel}
            </span>
          )}
          {article.source && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              {article.source}
            </span>
          )}
        </div>

        {/* Summary lead */}
        {article.summary && (
          <p className="text-[15px] sm:text-base text-slate-700 leading-relaxed mb-7 font-medium border-l-[3px] border-farumasi-500 pl-4">
            {article.summary}
          </p>
        )}

        {/* Markdown content */}
        <article className="article-content text-slate-800 leading-[1.75] text-[15px]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {article.fullContent || "_No content available for this article yet._"}
          </ReactMarkdown>
        </article>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-slate-200">
          <p className="text-[11px] text-slate-400">
            Reviewed by Farumasi clinical team. Information is general and does
            not replace professional medical advice.
          </p>
        </div>
      </div>

      {/* ── Local typography for markdown ─────────────────────────────────── */}
      <style jsx global>{`
        .article-content h1,
        .article-content h2,
        .article-content h3,
        .article-content h4 {
          color: #0f172a;
          font-weight: 800;
          line-height: 1.25;
          letter-spacing: -0.01em;
          margin-top: 1.6em;
          margin-bottom: 0.6em;
        }
        .article-content h2 {
          font-size: 1.35rem;
          padding-bottom: 0.35em;
          border-bottom: 1px solid #e5e7eb;
        }
        .article-content h3 {
          font-size: 1.1rem;
          color: #166534;
        }
        .article-content h4 {
          font-size: 1rem;
        }
        .article-content p {
          margin: 0 0 1em;
        }
        .article-content strong {
          color: #0f172a;
          font-weight: 700;
        }
        .article-content ul,
        .article-content ol {
          margin: 0 0 1.15em 0;
          padding-left: 1.4em;
        }
        .article-content ul {
          list-style: none;
          padding-left: 0;
        }
        .article-content ul li {
          position: relative;
          padding-left: 1.25em;
          margin-bottom: 0.45em;
        }
        .article-content ul li::before {
          content: "";
          position: absolute;
          left: 0.15em;
          top: 0.65em;
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: #16a34a;
        }
        .article-content ol {
          list-style: decimal;
        }
        .article-content ol li {
          margin-bottom: 0.45em;
          padding-left: 0.25em;
        }
        .article-content ol li::marker {
          color: #16a34a;
          font-weight: 700;
        }
        .article-content blockquote {
          margin: 1.25em 0;
          padding: 0.9em 1.1em;
          background: #fffbeb;
          border-left: 4px solid #f59e0b;
          border-radius: 0 12px 12px 0;
          color: #78350f;
        }
        .article-content blockquote p {
          margin: 0;
        }
        .article-content table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin: 1.25em 0;
          font-size: 0.9rem;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
        }
        .article-content thead {
          background: #f0fdf4;
        }
        .article-content th,
        .article-content td {
          padding: 0.65em 0.85em;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        .article-content th {
          color: #166534;
          font-weight: 700;
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .article-content tbody tr:last-child td {
          border-bottom: none;
        }
        .article-content tbody tr:nth-child(even) {
          background: #fafafa;
        }
        .article-content code {
          background: #f1f5f9;
          color: #0f172a;
          padding: 0.1em 0.4em;
          border-radius: 6px;
          font-size: 0.88em;
        }
        .article-content a {
          color: #15803d;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .article-content hr {
          margin: 2em 0;
          border: none;
          border-top: 1px solid #e5e7eb;
        }
      `}</style>
    </div>
  );
}
