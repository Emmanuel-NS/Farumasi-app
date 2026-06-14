"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Share2, MessageCircle, Copy, Link2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { HealthArticle } from "@/types";
import {
  buildArticleSharePayload,
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
  const rootRef = useRef<HTMLDivElement>(null);

  const getUrl = useCallback(
    () => (typeof window !== "undefined" ? window.location.href : ""),
    [],
  );

  const getPayload = useCallback(() => {
    const url = getUrl();
    return buildArticleSharePayload(article, url);
  }, [article, getUrl]);

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

  const handleNativeShare = async () => {
    const payload = getPayload();
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: payload.title,
          text: payload.text,
          url: payload.url,
        });
        notifyShared();
      } else {
        await navigator.clipboard.writeText(payload.text);
        toast.success("Article preview copied");
        notifyShared();
      }
    } catch {
      /* cancelled */
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
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-100 text-slate-700 text-[13px] font-semibold hover:bg-slate-200 transition-colors",
          buttonClassName,
        )}
      >
        <Share2 className="w-4 h-4" />
        {label}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-30 w-[min(100vw-2rem,240px)] rounded-2xl border border-slate-200 bg-white shadow-xl p-2 animate-fade-in">
          <div className="flex items-center justify-between px-2 py-1 mb-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Share article
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
            onClick={() => void handleNativeShare()}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-[13px] font-semibold text-slate-700 hover:bg-farumasi-50 transition-colors"
          >
            <Share2 className="w-4 h-4 text-farumasi-600" />
            Share via apps
          </button>
          <button
            type="button"
            onClick={handleWhatsApp}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-[13px] font-semibold text-slate-700 hover:bg-green-50 transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-green-600" />
            WhatsApp
          </button>
          <button
            type="button"
            onClick={() => void handleCopyPreview()}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Copy className="w-4 h-4 text-slate-500" />
            Copy with preview
          </button>
          <button
            type="button"
            onClick={() => void handleCopyLink()}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Link2 className="w-4 h-4 text-slate-500" />
            Copy link only
          </button>
        </div>
      )}
    </div>
  );
}
