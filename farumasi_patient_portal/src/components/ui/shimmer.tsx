"use client";

import { cn } from "@/lib/utils";

function ShimmerBlock({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-slate-200/80",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_1.2s_ease-in-out_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent",
        className,
      )}
      style={style}
    />
  );
}

export function ShimmerProductCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-white rounded-[12px] shadow-md overflow-hidden flex flex-col min-h-[280px] sm:min-h-[310px]",
        className,
      )}
    >
      <ShimmerBlock className="flex-1 min-h-[140px] rounded-none" />
      <div className="p-3 space-y-2">
        <ShimmerBlock className="h-3.5 w-full" />
        <ShimmerBlock className="h-3 w-2/3" />
        <ShimmerBlock className="h-4 w-16 mt-2" />
      </div>
    </div>
  );
}

export function ShimmerProductGrid({
  count = 8,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-[14px]",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerProductCard key={i} />
      ))}
    </div>
  );
}

export function ShimmerArticleCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <ShimmerBlock className="h-36 sm:h-40 rounded-none" />
      <div className="p-4 space-y-2">
        <ShimmerBlock className="h-2.5 w-16 rounded-full" />
        <ShimmerBlock className="h-4 w-full" />
        <ShimmerBlock className="h-3.5 w-4/5" />
      </div>
    </div>
  );
}

export function ShimmerArticleList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerArticleCard key={i} />
      ))}
    </div>
  );
}
