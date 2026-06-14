import type { HealthArticle } from "@/types";

export interface ArticleSharePayload {
  title: string;
  text: string;
  url: string;
}

export function buildArticleSharePayload(
  article: Pick<HealthArticle, "title" | "subtitle" | "summary" | "readTimeMin" | "category">,
  url: string,
): ArticleSharePayload {
  const teaser = (article.summary || article.subtitle || "").trim();
  const meta = [
    article.category ? `Category: ${article.category}` : "",
    article.readTimeMin ? `${article.readTimeMin} min read` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const lines = [
    `📖 ${article.title}`,
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
  };
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
