import api from "@/lib/api";
import type { HealthArticle } from "@/types";
import {
  adaptArticle,
  type BackendArticle,
  type PaginatedArticles,
} from "@/lib/mappers/articles.mapper";

export type ArticleSort = "newest" | "oldest" | "likes" | "views" | "shares" | "comments";

export interface ListArticlesQuery {
  category?: string;
  categories?: string[];
  articleType?: string;
  /** Keyword search (title, summary, body, category, slug) */
  search?: string;
  sortBy?: ArticleSort;
  savedOnly?: boolean;
  offset?: number;
  limit?: number;
}

export interface ArticleComment {
  id: string;
  articleId: string;
  userId: string;
  parentId?: string | null;
  content: string;
  createdAt: Date;
  userName?: string | null;
}

interface BackendComment {
  id: string;
  article_id: string;
  user_id: string;
  parent_id?: string | null;
  content: string;
  created_at: string;
  user_name?: string | null;
}

function adaptComment(c: BackendComment): ArticleComment {
  return {
    id: c.id,
    articleId: c.article_id,
    userId: c.user_id,
    parentId: c.parent_id ?? null,
    content: c.content,
    createdAt: new Date(c.created_at),
    userName: c.user_name ?? null,
  };
}

function buildListParams(query: ListArticlesQuery): Record<string, unknown> {
  const search = query.search?.trim();
  return {
    category: search ? undefined : query.category,
    categories:
      search || !query.categories || query.categories.length === 0
        ? undefined
        : query.categories,
    article_type: query.articleType,
    search: search || undefined,
    sort_by: query.sortBy,
    saved_only: query.savedOnly ? true : undefined,
    offset: query.offset ?? 0,
    limit: query.limit ?? 50,
  };
}

export const articlesService = {
  /** Published sponsored articles for home / health carousel. */
  async listSponsored(limit = 10): Promise<HealthArticle[]> {
    const adapt = (items: BackendArticle[]) => (items ?? []).map(adaptArticle);

    // Prefer /feed/sponsored — avoids old APIs treating "/sponsored" as an article id.
    try {
      const { data } = await api.get<BackendArticle[]>("/articles/feed/sponsored", {
        params: { limit },
      });
      if (Array.isArray(data) && data.length > 0) return adapt(data);
    } catch {
      /* try fallbacks */
    }

    try {
      const { data } = await api.get<PaginatedArticles>("/articles/", {
        params: { sponsored_only: true, limit },
      });
      const items = (data.items ?? []).filter((a) => a.is_sponsored === true);
      if (items.length) return adapt(items);
    } catch {
      /* try legacy path */
    }

    try {
      const { data } = await api.get<BackendArticle[]>("/articles/sponsored", {
        params: { limit },
      });
      if (Array.isArray(data)) return adapt(data);
    } catch {
      /* none available */
    }

    return [];
  },

  async listPublished(query: ListArticlesQuery = {}): Promise<HealthArticle[]> {
    const { data } = await api.get<PaginatedArticles>("/articles/", {
      params: buildListParams(query),
      paramsSerializer: { indexes: null },
    });
    return (data.items ?? []).map(adaptArticle);
  },

  async listSaved(query: Omit<ListArticlesQuery, "savedOnly"> = {}): Promise<HealthArticle[]> {
    const { data } = await api.get<PaginatedArticles>("/articles/me/saved", {
      params: { offset: query.offset ?? 0, limit: query.limit ?? 50 },
    });
    return (data.items ?? []).map(adaptArticle);
  },

  async getBySlug(slug: string): Promise<HealthArticle | null> {
    try {
      const { data } = await api.get<BackendArticle>(`/articles/slug/${encodeURIComponent(slug)}`);
      return adaptArticle(data);
    } catch {
      return null;
    }
  },

  async getById(id: string): Promise<HealthArticle | null> {
    try {
      const { data } = await api.get<BackendArticle>(`/articles/${encodeURIComponent(id)}`);
      return adaptArticle(data);
    } catch {
      return null;
    }
  },

  async getByIdOrSlug(idOrSlug: string): Promise<HealthArticle | null> {
    const bySlug = await this.getBySlug(idOrSlug);
    if (bySlug) return bySlug;
    return this.getById(idOrSlug);
  },

  async like(id: string): Promise<HealthArticle> {
    const { data } = await api.post<BackendArticle>(`/articles/${id}/like`);
    return adaptArticle(data);
  },

  async unlike(id: string): Promise<HealthArticle> {
    const { data } = await api.delete<BackendArticle>(`/articles/${id}/like`);
    return adaptArticle(data);
  },

  async save(id: string): Promise<HealthArticle> {
    const { data } = await api.post<BackendArticle>(`/articles/${id}/save`);
    return adaptArticle(data);
  },

  async unsave(id: string): Promise<HealthArticle> {
    const { data } = await api.delete<BackendArticle>(`/articles/${id}/save`);
    return adaptArticle(data);
  },

  async share(id: string): Promise<HealthArticle> {
    const { data } = await api.post<BackendArticle>(`/articles/${id}/share`);
    return adaptArticle(data);
  },

  async trackView(id: string): Promise<HealthArticle> {
    const { data } = await api.post<BackendArticle>(`/articles/${id}/view`);
    return adaptArticle(data);
  },

  async listComments(id: string): Promise<ArticleComment[]> {
    const { data } = await api.get<BackendComment[]>(`/articles/${id}/comments`);
    return (data ?? []).map(adaptComment);
  },

  async addComment(id: string, content: string, parentId?: string): Promise<ArticleComment> {
    const { data } = await api.post<BackendComment>(`/articles/${id}/comments`, {
      content,
      parent_id: parentId,
    });
    return adaptComment(data);
  },
};
