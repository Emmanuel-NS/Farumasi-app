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
          "mb-5 h-32 rounded-2xl border border-amber-100 bg-amber-50/40 animate-pulse",
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
      className={cn("mb-5", className)}
      aria-label="Sponsored health content"
      data-testid="sponsored-carousel"
    >
      <div className="relative overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-farumasi-50 shadow-sm">
        <button
          type="button"
          onClick={() => router.push(`/health/${current.slug ?? current.id}`)}
          className="w-full text-left block"
        >
          <div
            key={current.id}
            className="flex flex-col sm:flex-row transition-opacity duration-500"
          >
            {imageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageSrc}
                alt=""
                className="sm:w-44 h-36 sm:h-auto object-cover shrink-0"
              />
            ) : (
              <div className="sm:w-44 h-28 bg-farumasi-100 shrink-0 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-farumasi-400" />
              </div>
            )}
            <div className="flex-1 p-4 min-w-0">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full mb-2">
                <Sparkles className="w-3 h-3" /> Sponsored
              </span>
              <h2 className="text-base font-bold text-slate-900 line-clamp-2">{current.title}</h2>
              <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                {current.summary || current.subtitle}
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-farumasi-700 mt-2">
                Read more <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </button>

        {items.length > 1 && (
          <div className="flex justify-center gap-1.5 pb-3">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Show sponsored ${i + 1}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-6 bg-farumasi-600" : "w-1.5 bg-slate-300",
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
