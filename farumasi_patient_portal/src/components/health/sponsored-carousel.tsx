"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { mediaUrl } from "@/lib/api";
import type { HealthArticle } from "@/types";
import { articlesService } from "@/lib/services/articles.service";

const ROTATE_MS = 6000;

export function SponsoredCarousel({ className }: { className?: string }) {
  const router = useRouter();
  const [items, setItems] = useState<HealthArticle[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    articlesService
      .listSponsored(10)
      .then((list) => {
        setItems(list);
        setIndex(0);
      })
      .catch((err) => {
        if (process.env.NODE_ENV === "development") {
          console.warn("[SponsoredCarousel] load failed", err);
        }
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [items.length]);

  if (loading) {
    return (
      <div
        className={cn(
          "mb-3 h-[72px] sm:h-28 rounded-xl sm:rounded-2xl border border-amber-100 bg-amber-50/40 animate-pulse",
          className,
        )}
        aria-hidden
      />
    );
  }

  if (items.length === 0) return null;

  const current = items[index];
  const imageSrc = current.imageUrl ? mediaUrl(current.imageUrl) : "";

  return (
    <section
      className={cn("mb-3 sm:mb-5", className)}
      aria-label="Sponsored health content"
      data-testid="sponsored-carousel"
    >
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-50 via-white to-farumasi-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 shadow-sm">
        <button
          type="button"
          onClick={() => router.push(`/health/${current.slug ?? current.id}`)}
          className="w-full text-left block"
        >
          <div
            key={current.id}
            className="flex flex-row items-stretch transition-opacity duration-500"
          >
            {imageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageSrc}
                alt=""
                className="w-[72px] h-[72px] sm:w-36 sm:h-28 object-cover shrink-0"
              />
            ) : (
              <div className="w-[72px] h-[72px] sm:w-36 sm:h-28 bg-farumasi-100 shrink-0 flex items-center justify-center">
                <Sparkles className="w-6 h-6 sm:w-10 sm:h-10 text-farumasi-400" />
              </div>
            )}
            <div className="flex-1 p-2.5 sm:p-4 min-w-0 flex flex-col justify-center">
              <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/40 px-1.5 sm:px-2 py-0.5 rounded-full mb-1 sm:mb-2 w-fit">
                <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Sponsored
              </span>
              <h2 className="text-[13px] sm:text-base font-bold text-slate-900 line-clamp-2 leading-snug">
                {current.title}
              </h2>
              <p className="hidden sm:block text-xs text-slate-600 mt-1 line-clamp-2">
                {current.summary || current.subtitle}
              </p>
              <span className="inline-flex items-center gap-0.5 text-[11px] sm:text-xs font-semibold text-farumasi-700 mt-1 sm:mt-2">
                Read more <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </span>
            </div>
          </div>
        </button>

        {items.length > 1 && (
          <div className="flex justify-center gap-1 pb-1.5 sm:pb-3">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Show sponsored ${i + 1}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-1 rounded-full transition-all",
                  i === index ? "w-5 sm:w-6 bg-farumasi-600" : "w-1.5 bg-slate-300 dark:bg-slate-600",
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
