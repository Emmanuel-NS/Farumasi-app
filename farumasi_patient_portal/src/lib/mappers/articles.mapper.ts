import type { HealthArticle, ArticleCategory, ArticleType } from "@/types";

export interface BackendArticle {
  id: string;
  author_pharmacist_id?: string | null;
  title: string;
  slug: string;
  summary?: string | null;
  content?: string | null;
  category?: string | null;
  categories?: string[];
  article_type?: ArticleType | string | null;
  image_url?: string | null;
  video_url?: string | null;
  published_at?: string | null;
  created_at?: string;
  view_count?: number;
  like_count?: number;
  share_count?: number;
  comment_count?: number;
  is_liked?: boolean;
  is_saved?: boolean;
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

const VALID_TYPES: ReadonlySet<string> = new Set([
  "article", "tip", "guide", "news", "did_you_know",
]);

function normalizeType(t?: string | null): ArticleType {
  const v = (t ?? "article").toString();
  return (VALID_TYPES.has(v) ? v : "article") as ArticleType;
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
    videoUrl: a.video_url ?? undefined,
    source: "Farumasi",
    category: normalizeCategory(a.category),
    categories: a.categories ?? (a.category ? [a.category] : []),
    articleType: normalizeType(a.article_type),
    readTimeMin: Math.max(1, Math.ceil(content.split(/\s+/).filter(Boolean).length / 200)),
    publishedAt: a.published_at ? new Date(a.published_at) : undefined,
    likeCount: a.like_count ?? 0,
    commentCount: a.comment_count ?? 0,
    viewCount: a.view_count ?? 0,
    shareCount: a.share_count ?? 0,
    isLiked: a.is_liked ?? false,
    isSaved: a.is_saved ?? false,
  };
}
