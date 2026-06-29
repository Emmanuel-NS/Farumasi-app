"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { RichContent } from "@/components/content/rich-content";
import { contentService } from "@/lib/services/content.service";

interface DynamicLegalPageProps {
  slug: "terms" | "privacy" | "about";
  backHref?: string;
  fallbackTitle: string;
}

export function DynamicLegalPage({
  slug,
  backHref = "/register",
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
    <article className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-8 md:p-12">
      <Link href={backHref} className="text-sm text-farumasi-600 hover:underline font-medium">
        ← Back
      </Link>
      <h1 className="text-3xl font-bold text-slate-900 mt-4">{title}</h1>
      {updated && (
        <p className="text-sm text-slate-500 mt-1">
          Last updated: {new Date(updated).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </p>
      )}

      <div className="mt-8">
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
