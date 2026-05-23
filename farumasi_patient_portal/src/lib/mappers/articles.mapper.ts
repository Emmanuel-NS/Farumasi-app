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

const KNOWN_CATEGORIES: ArticleCategory[] = [
  "General Health",
  "Wellness",
  "Remedies",
  "SRH",
  "Mental Health",
  "Nutrition",
  "Chronic Care",
  "Viral Infection",
  "Mother & Babies",
  "Did You Know?",
];

function normalizeCategory(c?: string | null): ArticleCategory {
  if (!c) return "General Health";
  const match = KNOWN_CATEGORIES.find((k) => k.toLowerCase() === c.toLowerCase());
  return match ?? ("General Health" as ArticleCategory);
}

export function adaptArticle(a: BackendArticle): HealthArticle {
  const content = a.content ?? "";
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    subtitle: a.category ?? "Health",
    summary: a.summary ?? "",
    fullContent: content,
    imageUrl: a.image_url ?? "",
    source: "Farumasi",
    category: normalizeCategory(a.category),
    readTimeMin: Math.max(1, Math.ceil(content.split(/\s+/).filter(Boolean).length / 200)),
    publishedAt: a.published_at ? new Date(a.published_at) : undefined,
  };
}
