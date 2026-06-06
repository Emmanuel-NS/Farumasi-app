"use client";

import { useEffect, type MouseEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type SellerImagePreview = {
  src: string;
  name: string;
};

export function SellerImageLightbox({
  preview,
  onClose,
}: {
  preview: SellerImagePreview | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [preview, onClose]);

  if (!preview) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10"
      role="dialog"
      aria-modal="true"
      aria-label={`${preview.name} store image`}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close image preview"
      />
      <div className="relative z-10 w-full max-w-3xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 z-20 w-10 h-10 rounded-full bg-white text-slate-700 shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="rounded-3xl overflow-hidden bg-white shadow-2xl border border-white/20">
          <div className="bg-slate-950 flex items-center justify-center min-h-[240px] max-h-[75vh] p-4 sm:p-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview.src}
              alt={preview.name}
              className="max-w-full max-h-[68vh] w-auto h-auto object-contain"
            />
          </div>
          <div className="px-5 py-4 border-t border-slate-100 bg-white">
            <p className="text-base sm:text-lg font-bold text-slate-900">{preview.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">Tap outside or press Esc to close</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SellerImageThumb({
  src,
  name,
  onPreview,
  className,
  imgClassName,
}: {
  src: string;
  name: string;
  onPreview: (preview: SellerImagePreview) => void;
  className?: string;
  imgClassName?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e: MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        onPreview({ src, name });
      }}
      className={cn(
        "relative block w-full h-full overflow-hidden cursor-zoom-in",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-farumasi-500",
        className,
      )}
      aria-label={`View ${name} store image`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        className={cn("w-full h-full object-cover transition-transform hover:scale-105", imgClassName)}
      />
    </button>
  );
}
