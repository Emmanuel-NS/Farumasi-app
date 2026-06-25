"use client";

import { cn } from "@/lib/utils";

function looksLikeHtml(content: string): boolean {
  const trimmed = content.trim();
  return /^<[a-z][\s\S]*>/i.test(trimmed) || /<(p|div|h[1-6]|ul|ol|li|br|strong|em|span|a|img)\b/i.test(trimmed);
}

/** Legacy markdown-style body (bold lines + paragraphs). */
function LegacyArticleBody({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-3" />;
        const boldFull = line.match(/^\*\*(.+?)\*\*$/);
        if (boldFull) {
          return (
            <h3 key={i} className="text-[16px] font-bold text-slate-900 leading-snug mt-8 mb-2">
              {boldFull[1]}
            </h3>
          );
        }
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} className="text-[16px] text-slate-600 leading-[1.9]">
            {parts.map((part, j) => {
              const inner = part.match(/^\*\*(.+?)\*\*$/);
              return inner ? (
                <strong key={j} className="font-semibold text-slate-800">{inner[1]}</strong>
              ) : (
                part
              );
            })}
          </p>
        );
      })}
    </div>
  );
}

interface RichContentProps {
  html?: string | null;
  className?: string;
}

/** Renders pharmacist-authored HTML with full formatting, or legacy plain/markdown text. */
export function RichContent({ html, className }: RichContentProps) {
  const content = (html ?? "").trim();
  if (!content) {
    return <p className="text-sm text-slate-400 italic">No content available.</p>;
  }

  if (looksLikeHtml(content)) {
    return (
      <div
        className={cn("rich-content", className)}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return (
    <div className={cn("rich-content rich-content--plain", className)}>
      <LegacyArticleBody content={content} />
    </div>
  );
}
