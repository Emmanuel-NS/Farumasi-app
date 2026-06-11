"use client";

import { useDynamicTranslation } from "@/hooks/use-dynamic-translation";
import type { LangCode } from "@/store/language-store";
import { cn } from "@/lib/utils";

export function TranslatedText({
  children,
  context = "dynamic",
  sourceLang = "en",
  className,
  as: Tag = "span",
}: {
  children: string;
  context?: string;
  sourceLang?: LangCode;
  className?: string;
  as?: "span" | "p" | "div";
}) {
  const { text, loading } = useDynamicTranslation(children, context, sourceLang);
  return (
    <Tag className={cn(loading && "opacity-80", className)}>
      {text}
    </Tag>
  );
}
