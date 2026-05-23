"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Clock } from "lucide-react";
import { articlesService } from "@/lib/services/articles.service";
import type { HealthArticle } from "@/types";

export default function ArticleDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const slugOrId = params?.id ?? "";

  const [article, setArticle] = useState<HealthArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slugOrId) return;
    setLoading(true);
    articlesService.getBySlug(slugOrId)
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
    ? article.publishedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "";

  return (
    <div className="bg-[#F9FAFB] min-h-full">
      <div className="max-w-2xl mx-auto p-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-farumasi-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {article.imageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={article.imageUrl}
            alt={article.title}
            className="w-full aspect-[3/2] object-cover rounded-3xl mb-5 bg-slate-100"
          />
        )}

        <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
          <span className="inline-flex items-center gap-1 bg-farumasi-50 text-farumasi-700 font-semibold px-2.5 py-1 rounded-full">
            {article.category}
          </span>
          {article.readTimeMin > 0 && (
            <span className="inline-flex items-center gap-1 text-slate-500">
              <Clock className="w-3 h-3" />
              {article.readTimeMin} min read
            </span>
          )}
          {publishedLabel && (
            <span className="text-slate-400">· {publishedLabel}</span>
          )}
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900 mb-3 leading-tight">
          {article.title}
        </h1>

        {article.summary && (
          <p className="text-sm text-slate-600 mb-5 leading-relaxed">
            {article.summary}
          </p>
        )}

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
          <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {article.fullContent || "No content available for this article yet."}
          </div>
        </div>

        <p className="text-[11px] text-slate-400 text-center mt-6">
          Source: {article.source}
        </p>
      </div>
    </div>
  );
}
