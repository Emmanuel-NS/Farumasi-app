"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguageStore } from "@/store/language-store";
import { useAuthStore } from "@/store/auth-store";
import { articlesService, type ArticleComment } from "@/lib/services/articles.service";
import type { HealthArticle } from "@/types";
import { toast } from "sonner";
import {
  ArrowLeft,
  Clock,
  BookOpen,
  Lightbulb,
  ChevronRight,
  ShieldCheck,
  Heart,
  Bookmark,
  Share2,
  MessageCircle,
  Eye,
  Send,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { ShareArticleMenu } from "@/components/health/share-article-menu";
import { sortTrendingArticles } from "@/lib/share-article";
import { safeBackToHealth } from "@/lib/navigation";

const CAT_ACCENT: Record<string, { chip: string; bg: string; bar: string }> = {
  "General Health": { chip: "bg-farumasi-600 text-white", bg: "bg-farumasi-50", bar: "bg-farumasi-500" },
  "Wellness":       { chip: "bg-farumasi-600 text-white", bg: "bg-farumasi-50", bar: "bg-farumasi-500" },
  "Remedies":       { chip: "bg-blue-600 text-white",     bg: "bg-blue-50",     bar: "bg-blue-500" },
  "Chronic Care":   { chip: "bg-blue-600 text-white",     bg: "bg-blue-50",     bar: "bg-blue-500" },
  "SRH":            { chip: "bg-rose-600 text-white",     bg: "bg-rose-50",     bar: "bg-rose-500" },
  "Mental Health":  { chip: "bg-violet-600 text-white",   bg: "bg-violet-50",   bar: "bg-violet-500" },
  "Nutrition":      { chip: "bg-orange-500 text-white",   bg: "bg-orange-50",   bar: "bg-orange-500" },
  "Mother & Babies":{ chip: "bg-pink-500 text-white",     bg: "bg-pink-50",     bar: "bg-pink-500" },
  "Did You Know?":  { chip: "bg-amber-500 text-white",    bg: "bg-amber-50",    bar: "bg-amber-500" },
};
const DEFAULT_ACCENT = { chip: "bg-farumasi-600 text-white", bg: "bg-farumasi-50", bar: "bg-farumasi-500" };

function compactNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

function timeAgo(d: Date): string {
  const s = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function ArticleBody({ content, accent }: { content: string; accent: typeof DEFAULT_ACCENT }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-3" />;
        const boldFull = line.match(/^\*\*(.+?)\*\*$/);
        if (boldFull) {
          return (
            <div
              key={i}
              className={`flex items-start gap-3 mt-8 mb-2 px-4 py-3 rounded-[14px] ${accent.bg}`}
            >
              <div className={`w-[3px] self-stretch rounded-full ${accent.bar} shrink-0 min-h-[22px]`} />
              <h3 className="text-[16px] font-bold text-slate-900 leading-snug">
                {boldFull[1]}
              </h3>
            </div>
          );
        }
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} className="text-[16px] text-slate-600 leading-[1.9] px-1">
            {parts.map((part, j) => {
              const inner = part.match(/^\*\*(.+?)\*\*$/);
              return inner ? (
                <strong key={j} className="font-semibold text-slate-800">{inner[1]}</strong>
              ) : part;
            })}
          </p>
        );
      })}
    </div>
  );
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export default function ArticleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useLanguageStore((s) => s.lang);
  const isGuest = useAuthStore((s) => s.isGuest);

  const [article, setArticle] = useState<HealthArticle | null>(null);
  const [related, setRelated] = useState<HealthArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const viewTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    articlesService
      .getByIdOrSlug(id)
      .then((a) => {
        if (!a) { setNotFound(true); setArticle(null); }
        else setArticle(a);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!article) return;
    if (viewTrackedRef.current === article.id) return;
    viewTrackedRef.current = article.id;
    articlesService
      .trackView(article.id)
      .then((updated) => setArticle((prev) => (prev ? { ...prev, viewCount: updated.viewCount } : prev)))
      .catch(() => {});
  }, [article]);

  useEffect(() => {
    if (!article) return;
    articlesService
      .listPublished({ sortBy: "views", limit: 24 })
      .then((items) => {
        const pool = items.filter((x) => x.id !== article.id);
        setRelated(sortTrendingArticles(pool).slice(0, 10));
      })
      .catch(() => setRelated([]));
  }, [article]);

  const refreshComments = useCallback(() => {
    if (!article) return;
    setCommentsLoading(true);
    articlesService
      .listComments(article.id)
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false));
  }, [article]);

  useEffect(() => { refreshComments(); }, [refreshComments]);

  const requireAuth = useCallback((): boolean => {
    if (isGuest) {
      toast.error("Please sign in to continue");
      return false;
    }
    return true;
  }, [isGuest]);

  const handleToggleLike = useCallback(async () => {
    if (!article) return;
    if (!requireAuth()) return;
    const wasLiked = article.isLiked;
    setArticle({
      ...article,
      isLiked: !wasLiked,
      likeCount: Math.max(0, (article.likeCount ?? 0) + (wasLiked ? -1 : 1)),
    });
    try {
      const updated = wasLiked
        ? await articlesService.unlike(article.id)
        : await articlesService.like(article.id);
      setArticle((prev) => (prev ? { ...prev, ...updated } : updated));
    } catch {
      toast.error("Couldn't update like");
      setArticle((prev) =>
        prev
          ? { ...prev, isLiked: wasLiked, likeCount: Math.max(0, (prev.likeCount ?? 0) + (wasLiked ? 1 : -1)) }
          : prev,
      );
    }
  }, [article, requireAuth]);

  const handleToggleSave = useCallback(async () => {
    if (!article) return;
    if (!requireAuth()) return;
    const wasSaved = article.isSaved;
    setArticle({ ...article, isSaved: !wasSaved });
    try {
      const updated = wasSaved
        ? await articlesService.unsave(article.id)
        : await articlesService.save(article.id);
      setArticle((prev) => (prev ? { ...prev, ...updated } : updated));
      toast.success(wasSaved ? "Removed from saved" : "Saved for later");
    } catch {
      toast.error("Couldn't update bookmark");
      setArticle((prev) => (prev ? { ...prev, isSaved: wasSaved } : prev));
    }
  }, [article, requireAuth]);

  const trackShare = useCallback(async () => {
    if (!article) return;
    try {
      const updated = await articlesService.share(article.id);
      setArticle((prev) => (prev ? { ...prev, shareCount: updated.shareCount } : prev));
    } catch {
      /* ignore */
    }
  }, [article]);

  const handlePostComment = useCallback(async () => {
    if (!article) return;
    if (!requireAuth()) return;
    const text = commentDraft.trim();
    if (!text) return;
    setPostingComment(true);
    try {
      const c = await articlesService.addComment(article.id, text);
      setComments((prev) => [c, ...prev]);
      setCommentDraft("");
      setArticle((prev) =>
        prev ? { ...prev, commentCount: (prev.commentCount ?? 0) + 1 } : prev,
      );
    } catch {
      toast.error("Couldn't post comment");
    } finally {
      setPostingComment(false);
    }
  }, [article, commentDraft, requireAuth]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#F9FAFB] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-3" />
        <p className="text-sm">Loading article…</p>
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#F9FAFB] text-slate-500">
        <BookOpen className="w-16 h-16 text-slate-200 mb-4" />
        <p className="font-medium">Article not found</p>
        <button
          onClick={() => safeBackToHealth(router)}
          className="mt-4 text-farumasi-600 font-medium text-sm hover:underline"
        >
          ← Back to Health
        </button>
      </div>
    );
  }

  const accent = CAT_ACCENT[article.category] ?? DEFAULT_ACCENT;
  const isDyk = article.articleType === "did_you_know" || article.category === "Did You Know?";
  const ytId = article.videoUrl ? getYouTubeId(article.videoUrl) : null;

  return (
    <div className="min-h-full bg-[#F0F4F8]">
      {ytId ? (
        <div className="relative bg-black w-full">
          <button
            onClick={() => safeBackToHealth(router)}
            className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-md rounded-full pl-2.5 pr-4 py-2 text-white hover:bg-black/70 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[13px] font-semibold">Health</span>
          </button>
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
              className="absolute inset-0 w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={article.title}
            />
          </div>
        </div>
      ) : (
        <div className="relative w-full overflow-hidden h-44 sm:h-56 lg:h-72">
          {article.imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={article.imageUrl}
              alt={article.title}
              className="w-full h-full object-cover scale-[1.02]"
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${accent.bg}`}>
              {isDyk ? (
                <Lightbulb className="w-28 h-28 text-amber-300" />
              ) : (
                <BookOpen className="w-28 h-28 text-farumasi-200" />
              )}
            </div>
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.50) 0%, rgba(0,0,0,0) 38%, rgba(0,0,0,0.55) 80%, rgba(0,0,0,0.75) 100%)",
            }}
          />
          <button
            onClick={() => safeBackToHealth(router)}
            className="absolute top-4 left-4 flex items-center gap-2 bg-black/30 backdrop-blur-md rounded-full pl-2.5 pr-4 py-2 text-white hover:bg-black/50 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-[13px] font-semibold">Health</span>
          </button>
          <div className="absolute bottom-12 left-5 right-5 flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${accent.chip}`}>
              {article.category}
            </span>
            {(article.categories ?? []).filter((c) => c !== article.category).slice(0, 2).map((c) => (
              <span key={c} className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-white/15 border border-white/25 text-white backdrop-blur-sm">
                {c}
              </span>
            ))}
            <span className="flex items-center gap-1.5 bg-black/35 backdrop-blur-sm rounded-full px-3 py-1">
              <Clock className="w-3 h-3 text-white/80" />
              <span className="text-[11px] text-white/90 font-semibold">{article.readTimeMin} min read</span>
            </span>
          </div>
        </div>
      )}

      <div className={
        ytId
          ? "bg-white min-h-[60vh]"
          : "relative -mt-10 bg-white rounded-t-[32px] shadow-[0_-4px_30px_rgba(15,23,42,0.12)] min-h-[60vh]"
      }>
        {ytId && (
          <div className="flex items-center gap-3 px-5 sm:px-10 pt-5 pb-4 border-b border-slate-100 flex-wrap">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${accent.chip}`}>
              {article.category}
            </span>
            {(article.categories ?? []).filter((c) => c !== article.category).slice(0, 2).map((c) => (
              <span key={c} className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                {c}
              </span>
            ))}
            <div className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[13px]">{article.readTimeMin} min read</span>
            </div>
          </div>
        )}

        {/* Save & share — immediately after hero */}
        <div className="max-w-[760px] mx-auto px-5 sm:px-10 pt-5 sm:pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleToggleLike}
              className={
                article.isLiked
                  ? "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-red-500 text-white text-[13px] font-semibold hover:bg-red-600 transition-colors"
                  : "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-100 text-slate-700 text-[13px] font-semibold hover:bg-slate-200 transition-colors"
              }
            >
              <Heart className={article.isLiked ? "w-4 h-4 fill-current" : "w-4 h-4"} />
              {article.isLiked ? "Liked" : "Like"} · {compactNumber(article.likeCount ?? 0)}
            </button>
            <button
              onClick={handleToggleSave}
              className={
                article.isSaved
                  ? "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-500 text-white text-[13px] font-semibold hover:bg-amber-600 transition-colors"
                  : "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-100 text-slate-700 text-[13px] font-semibold hover:bg-slate-200 transition-colors"
              }
            >
              <Bookmark className={article.isSaved ? "w-4 h-4 fill-current" : "w-4 h-4"} />
              {article.isSaved ? "Saved" : "Save"}
            </button>
            <ShareArticleMenu article={article} onShared={() => void trackShare()} />
          </div>
        </div>

        <div className="max-w-[760px] mx-auto px-5 sm:px-10">
          <div className="pt-6 pb-6">
            {article.publishedAt && (
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-[1.4px] mb-3">
                {article.publishedAt.toLocaleDateString("en-GB", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </p>
            )}
            <h1 className="text-[28px] sm:text-[34px] font-extrabold text-slate-900 leading-[1.2] tracking-tight mb-4">
              {article.title}
            </h1>
            <p className="text-[17px] text-slate-500 leading-relaxed">
              {article.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-3 py-4 border-y border-slate-100 mb-6 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-farumasi-100 flex items-center justify-center">
                <BookOpen className="w-3.5 h-3.5 text-farumasi-600" />
              </div>
              <span className="text-[13px] text-slate-400">
                <span className="text-slate-600 font-semibold">{article.source}</span>
              </span>
            </div>
            <span className="text-slate-200">|</span>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[13px]">{article.readTimeMin} min read</span>
            </div>
            <div className="flex items-center gap-3 ml-auto text-slate-400 text-[12px] font-semibold">
              <span className="inline-flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {compactNumber(article.viewCount ?? 0)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Heart className={article.isLiked ? "w-3.5 h-3.5 text-red-500 fill-red-500" : "w-3.5 h-3.5"} />
                {compactNumber(article.likeCount ?? 0)}
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5" />
                {compactNumber(article.commentCount ?? 0)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Share2 className="w-3.5 h-3.5" />
                {compactNumber(article.shareCount ?? 0)}
              </span>
            </div>
          </div>

          {article.summary && (
            <div className={`flex gap-3 rounded-[16px] ${accent.bg} p-5 mb-8`}>
              <div className={`w-[3px] rounded-full ${accent.bar} shrink-0`} />
              <p className="text-[16px] text-slate-700 leading-[1.85] font-medium italic">
                {article.summary}
              </p>
            </div>
          )}

          <ArticleBody content={article.fullContent ?? article.summary ?? ""} accent={accent} />

          <div className="mt-12 mb-4 rounded-[20px] border border-slate-100 bg-gradient-to-br from-farumasi-50 to-white p-5 flex items-start gap-4 shadow-sm">
            <div className="w-11 h-11 rounded-full bg-farumasi-600 flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(30,158,104,0.35)]">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-farumasi-600 mb-0.5">Verified Source</p>
              <p className="text-[15px] font-bold text-slate-900">{article.source}</p>
              <p className="text-[13px] text-slate-400 mt-0.5 leading-snug">
                Reviewed by medical professionals for clinical accuracy.
              </p>
            </div>
          </div>

          <section className="mt-10 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-bold text-slate-900 inline-flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-farumasi-600" />
                Comments ({compactNumber(article.commentCount ?? 0)})
              </h2>
            </div>

            <div className="flex items-start gap-2 mb-5">
              <textarea
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                placeholder={isGuest ? "Sign in to comment" : "Share your thoughts…"}
                disabled={isGuest || postingComment}
                rows={2}
                className="flex-1 resize-none rounded-[14px] border border-slate-200 bg-white px-3 py-2 text-[14px] text-slate-800 placeholder:text-slate-400 outline-none focus:border-farumasi-400 disabled:bg-slate-50 disabled:text-slate-400"
              />
              <button
                onClick={handlePostComment}
                disabled={isGuest || postingComment || !commentDraft.trim()}
                className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-farumasi-600 text-white hover:bg-farumasi-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
                aria-label="Post comment"
              >
                {postingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>

            {commentsLoading ? (
              <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading comments…
              </div>
            ) : comments.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">
                Be the first to comment.
              </p>
            ) : (
              <ul className="space-y-3">
                {comments.map((c) => (
                  <li key={c.id} className="rounded-[14px] border border-slate-100 bg-white p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-full bg-farumasi-100 text-farumasi-700 text-[11px] font-bold flex items-center justify-center">
                        {(c.userName ?? "U").trim().charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[13px] font-semibold text-slate-800">
                        {c.userName ?? "Patient"}
                      </span>
                      <span className="text-[11px] text-slate-400">· {timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-[14px] text-slate-700 leading-snug whitespace-pre-wrap pl-9">
                      {c.content}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex justify-center py-6">
            <Link
              href="/health"
              className="inline-flex items-center gap-2 text-farumasi-600 font-semibold text-[14px] hover:gap-3 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Discover Wellness
            </Link>
          </div>

          {related.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-[20px] font-bold text-slate-900">More to read</h2>
                  <p className="text-[12px] text-slate-500 mt-0.5">Trending by views &amp; recency</p>
                </div>
                <Link
                  href="/health"
                  className="flex items-center gap-1 text-farumasi-600 text-[13px] font-semibold hover:underline shrink-0"
                >
                  See all <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {related.map((rel) => {
                  const ra = CAT_ACCENT[rel.category] ?? DEFAULT_ACCENT;
                  return (
                    <Link
                      key={rel.id}
                      href={`/health/${rel.slug ?? rel.id}`}
                      className="group flex flex-col bg-white rounded-[20px] overflow-hidden border border-slate-100 shadow-sm hover:shadow-[0_8px_24px_rgba(15,23,42,0.10)] transition-shadow"
                    >
                      <div className="relative overflow-hidden" style={{ height: 150 }}>
                        {rel.imageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={rel.imageUrl}
                            alt={rel.title}
                            className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500"
                          />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center ${ra.bg}`}>
                            <BookOpen className="w-10 h-10 text-slate-300" />
                          </div>
                        )}
                        <div
                          className="absolute inset-0"
                          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)" }}
                        />
                        <span className={`absolute bottom-3 left-3 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${ra.chip}`}>
                          {rel.category}
                        </span>
                      </div>
                      <div className="p-3.5 flex flex-col gap-1.5">
                        <p className="text-[14px] font-bold text-slate-900 line-clamp-2 leading-snug">
                          {rel.title}
                        </p>
                        <div className="flex items-center justify-between text-slate-400">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span className="text-[12px]">{rel.readTimeMin} min</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="inline-flex items-center gap-0.5">
                              <Heart className="w-3 h-3" />{compactNumber(rel.likeCount ?? 0)}
                            </span>
                            <span className="inline-flex items-center gap-0.5">
                              <Eye className="w-3 h-3" />{compactNumber(rel.viewCount ?? 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
