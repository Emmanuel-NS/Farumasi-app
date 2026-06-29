"use client";

import { cn } from "@/lib/utils";

function looksLikeHtml(content: string): boolean {
  const trimmed = content.trim();
  return /^<[a-z][\s\S]*>/i.test(trimmed) || /<(p|div|h[1-6]|ul|ol|li|br|strong|em|span|a|img)\b/i.test(trimmed);
}

interface RichContentProps {
  html?: string | null;
  className?: string;
}

export function RichContent({ html, className }: RichContentProps) {
  const content = (html ?? "").trim();
  if (!content) {
    return <p className="text-sm text-muted-foreground italic">No content available.</p>;
  }

  if (looksLikeHtml(content)) {
    return (
      <div
        className={cn("prose prose-sm max-w-none text-slate-700", className)}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return <p className={cn("text-sm text-slate-700 whitespace-pre-wrap leading-relaxed", className)}>{content}</p>;
}
