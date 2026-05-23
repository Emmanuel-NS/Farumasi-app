import api from "@/lib/api";
import { isMockMode } from "@/lib/env";
import type { HealthArticle } from "@/types";
import {
  adaptArticle,
  type BackendArticle,
  type PaginatedArticles,
} from "@/lib/mappers/articles.mapper";

export interface ListArticlesQuery {
  category?: string;
  offset?: number;
  limit?: number;
}

function mockArticles(): HealthArticle[] {
  return [];
}

export const articlesService = {
  async listPublished(query: ListArticlesQuery = {}): Promise<HealthArticle[]> {
    if (isMockMode()) return mockArticles();
    const { data } = await api.get<PaginatedArticles>("/articles/", {
      params: {
        category: query.category,
        offset: query.offset ?? 0,
        limit: query.limit ?? 50,
      },
    });
    return (data.items ?? []).map(adaptArticle);
  },

  async getBySlug(slug: string): Promise<HealthArticle | null> {
    if (isMockMode()) {
      return mockArticles().find((a) => a.slug === slug || a.id === slug) ?? null;
    }
    try {
      const { data } = await api.get<BackendArticle>(`/articles/slug/${encodeURIComponent(slug)}`);
      return adaptArticle(data);
    } catch {
      return null;
    }
  },
};
