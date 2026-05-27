import type { HealthArticle, ArticleCategory } from "@/types";

export interface BackendArticle {
  id: string;
  author_pharmacist_id?: string | null;
  title: string;
  slug: string;
  summary?: string | null;
  content?: string | null;
  category?: string | null;
  image_url?: string | null;
  published_at?: string | null;
  created_at?: string;
}

export interface PaginatedArticles {
  items: BackendArticle[];
  total: number;
  offset: number;
  limit: number;
}

function normalizeCategory(c?: string | null): ArticleCategory {
  const trimmed = (c ?? "").trim();
  return trimmed.length > 0 ? trimmed : "General Health";
}

export function adaptArticle(a: BackendArticle): HealthArticle {
  const content = a.content ?? "";
  const summary = a.summary ?? "";
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    subtitle: summary || (a.category ?? "Health"),
    summary,
    fullContent: content,
    imageUrl: a.image_url ?? "",
    source: "Farumasi",
    category: normalizeCategory(a.category),
    readTimeMin: Math.max(1, Math.ceil(content.split(/\s+/).filter(Boolean).length / 200)),
    publishedAt: a.published_at ? new Date(a.published_at) : undefined,
  };
}
