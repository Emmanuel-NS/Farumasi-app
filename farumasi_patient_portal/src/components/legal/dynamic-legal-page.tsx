"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Loader2 } from "lucide-react";
import { RichContent } from "@/components/shared/rich-content";
import { contentService } from "@/lib/services/content.service";

interface DynamicLegalPageProps {
  slug: "terms" | "privacy" | "about";
  backHref?: string;
  fallbackTitle: string;
}

export function DynamicLegalPage({
  slug,
  backHref = "/settings",
  fallbackTitle,
}: DynamicLegalPageProps) {
  const [page, setPage] = useState<Awaited<ReturnType<typeof contentService.getPage>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    contentService
      .getPage(slug)
      .then(setPage)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const title = page?.title ?? fallbackTitle;
  const updated = page?.updated_at ?? page?.published_at;

  return (
    <article className="p-6 max-w-2xl mx-auto pb-24">
      <Link href={backHref} className="inline-flex items-center text-xs text-slate-500 hover:text-slate-700 mb-3">
        <ChevronLeft className="w-3.5 h-3.5" /> Back
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {updated && (
        <p className="text-xs text-slate-500 mt-1">
          Last updated: {new Date(updated).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          {page?.version ? ` · v${page.version}` : ""}
        </p>
      )}

      <div className="prose prose-sm max-w-none mt-6 text-slate-700">
        {loading && (
          <div className="flex items-center gap-2 text-slate-400 py-8">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        )}
        {!loading && !error && page?.body && <RichContent html={page.body} />}
        {!loading && (error || !page?.body) && (
          <p className="text-sm text-slate-500">Content is temporarily unavailable. Please try again later.</p>
        )}
      </div>
    </article>
  );
}
