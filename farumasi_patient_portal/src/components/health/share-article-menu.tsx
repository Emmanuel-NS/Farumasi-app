"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Share2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { mediaUrl } from "@/lib/api";
import type { HealthArticle } from "@/types";
import {
  buildArticleSharePayload,
  fetchShareImageFile,
  canShareWithFiles,
  shareArticleNative,
  whatsAppShareUrl,
} from "@/lib/share-article";

interface ShareArticleMenuProps {
  article: HealthArticle;
  onShared?: () => void;
  className?: string;
  buttonClassName?: string;
  label?: string;
}

export function ShareArticleMenu({
  article,
  onShared,
  className,
  buttonClassName,
  label = "Share",
}: ShareArticleMenuProps) {
  const [open, setOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const getUrl = useCallback(
    () => (typeof window !== "undefined" ? window.location.href : ""),
    [],
  );

  const getPayload = useCallback(() => {
    const url = getUrl();
    return buildArticleSharePayload(article, url);
  }, [article, getUrl]);

  const bannerSrc = article.imageUrl ? mediaUrl(article.imageUrl) : null;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const notifyShared = useCallback(() => {
    onShared?.();
    setOpen(false);
  }, [onShared]);

  const shareWithBanner = async () => {
    const payload = getPayload();
    setSharing(true);
    try {
      const shared = await shareArticleNative(payload);
      if (shared) {
        notifyShared();
        return;
      }
      if (payload.imageUrl) {
        const file = await fetchShareImageFile(payload.imageUrl, payload.title);
        if (file) {
          const url = URL.createObjectURL(file);
          const a = document.createElement("a");
          a.href = url;
          a.download = file.name;
          a.click();
          URL.revokeObjectURL(url);
          await navigator.clipboard.writeText(payload.text);
          toast.success("Banner saved and article text copied — paste both in your chat app");
          notifyShared();
          return;
        }
      }
      await navigator.clipboard.writeText(payload.text);
      toast.success("Article preview copied");
      notifyShared();
    } catch {
      /* cancelled */
    } finally {
      setSharing(false);
    }
  };

  const handleWhatsApp = () => {
    const payload = getPayload();
    window.open(whatsAppShareUrl(payload.text), "_blank", "noopener,noreferrer");
    notifyShared();
  };

  const handleCopyPreview = async () => {
    try {
      await navigator.clipboard.writeText(getPayload().text);
      toast.success("Article preview copied");
      notifyShared();
    } catch {
      toast.error("Could not copy");
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getUrl());
      toast.success("Link copied");
      notifyShared();
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => void shareWithBanner()}
        disabled={sharing}
        className={cn(
          "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-100 text-slate-700 text-[13px] font-semibold hover:bg-slate-200 transition-colors disabled:opacity-60",
          buttonClassName,
        )}
      >
        <Share2 className="w-4 h-4" />
        {sharing ? "Sharing…" : label}
      </button>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ml-1.5 inline-flex items-center px-2 py-2 rounded-full text-slate-500 hover:bg-slate-100 text-xs font-semibold"
        aria-label="More share options"
      >
        ···
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-30 w-[min(100vw-2rem,280px)] rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-fade-in">
          {bannerSrc && (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bannerSrc}
                alt={article.title}
                className="w-full h-32 sm:h-36 object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-8">
                <p className="text-white text-sm font-bold leading-snug line-clamp-2">
                  {article.title}
                </p>
                <p className="text-white/80 text-[11px] mt-0.5">
                  Shared with banner when your app supports it
                </p>
              </div>
            </div>
          )}

          <div className="p-2">
            <div className="flex items-center justify-between px-2 py-1 mb-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Share options
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              disabled={sharing}
              onClick={() => void shareWithBanner()}
              className="w-full px-3 py-2.5 rounded-xl text-left text-[13px] font-semibold text-slate-800 hover:bg-farumasi-50 transition-colors disabled:opacity-60"
            >
              Share article + banner
            </button>
            <button
              type="button"
              onClick={handleWhatsApp}
              className="w-full px-3 py-2.5 rounded-xl text-left text-[13px] font-semibold text-slate-800 hover:bg-green-50 transition-colors"
            >
              WhatsApp (link shows banner preview)
            </button>
            <button
              type="button"
              onClick={() => void handleCopyPreview()}
              className="w-full px-3 py-2.5 rounded-xl text-left text-[13px] font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
            >
              Copy title and summary
            </button>
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="w-full px-3 py-2.5 rounded-xl text-left text-[13px] font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
            >
              Copy link only
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
