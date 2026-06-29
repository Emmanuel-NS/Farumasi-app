"use client";

interface ContentPreviewProps {
  html: string;
  title?: string;
}

/** Live preview of how published HTML will render on patient portals. */
export function ContentPreview({ html, title = "Preview" }: ContentPreviewProps) {
  if (!html.trim()) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
        Start writing to see a live preview.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      </div>
      <div className="p-5 max-h-[480px] overflow-y-auto">
        <div className="rich-content" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
