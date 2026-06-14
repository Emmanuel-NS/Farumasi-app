import type { HealthArticle } from "@/types";
import { mediaUrl } from "@/lib/api";

export interface ArticleSharePayload {
  title: string;
  text: string;
  url: string;
  imageUrl?: string;
}

export function buildArticleSharePayload(
  article: Pick<
    HealthArticle,
    "title" | "subtitle" | "summary" | "readTimeMin" | "category" | "imageUrl" | "slug"
  >,
  url: string,
): ArticleSharePayload {
  const teaser = (article.summary || article.subtitle || "").trim();
  const meta = [
    article.category ? `Category: ${article.category}` : "",
    article.readTimeMin ? `${article.readTimeMin} min read` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const imageUrl = mediaUrl(article.imageUrl) || undefined;

  const lines = [
    article.title,
    teaser,
    meta,
    "",
    "Read on FARUMASI Health:",
    url,
  ].filter((line, i) => line !== "" || i === 3);

  return {
    title: article.title,
    text: lines.join("\n"),
    url,
    imageUrl,
  };
}

function safeFilename(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${base || "farumasi-article"}.jpg`;
}

/** Fetch hero/banner image as a File for native share sheets (mobile). */
export async function fetchShareImageFile(
  imageUrl: string,
  title: string,
): Promise<File | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    const type = blob.type && blob.type.startsWith("image/") ? blob.type : "image/jpeg";
    return new File([blob], safeFilename(title), { type });
  } catch {
    return null;
  }
}

export function canShareWithFiles(files: File[]): boolean {
  if (typeof navigator === "undefined" || !navigator.canShare) return false;
  try {
    return navigator.canShare({ files });
  } catch {
    return false;
  }
}

/** Prefer sharing banner image + caption; falls back to link-only share. */
export async function shareArticleNative(payload: ArticleSharePayload): Promise<boolean> {
  if (typeof navigator === "undefined" || !("share" in navigator)) return false;

  let file: File | null = null;
  if (payload.imageUrl) {
    file = await fetchShareImageFile(payload.imageUrl, payload.title);
  }

  if (file && canShareWithFiles([file])) {
    const withFiles = { files: [file], text: payload.text, title: payload.title };
    if (navigator.canShare(withFiles)) {
      await navigator.share(withFiles);
      return true;
    }
  }

  await navigator.share({
    title: payload.title,
    text: payload.text,
    url: payload.url,
  });
  return true;
}

export function whatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function twitterShareUrl(text: string, url: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

/** Trending score blending views with recency (higher = more trending). */
export function trendingScore(article: HealthArticle): number {
  const views = article.viewCount ?? 0;
  const shares = article.shareCount ?? 0;
  const likes = article.likeCount ?? 0;
  const engagement = views + shares * 3 + likes * 2;
  const ageMs = article.publishedAt
    ? Date.now() - article.publishedAt.getTime()
    : 1000 * 60 * 60 * 24 * 30;
  const ageDays = Math.max(1, ageMs / (1000 * 60 * 60 * 24));
  const recencyBoost = Math.max(0.15, 1 - ageDays / 60);
  return engagement * recencyBoost + engagement / Math.sqrt(ageDays);
}

export function sortTrendingArticles(articles: HealthArticle[]): HealthArticle[] {
  return [...articles].sort((a, b) => {
    const diff = trendingScore(b) - trendingScore(a);
    if (diff !== 0) return diff;
    const tb = b.publishedAt?.getTime() ?? 0;
    const ta = a.publishedAt?.getTime() ?? 0;
    return tb - ta;
  });
}
