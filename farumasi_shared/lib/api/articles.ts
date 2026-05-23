import { getClient } from "./client";
import type {
  ArticleOut,
  ArticlePublicOut,
  ArticleStatus,
  PaginatedResponse,
} from "./types";

export const articlesApi = {
  /** Public, published only. */
  listPublic: (params?: { page?: number; page_size?: number; category?: string }) =>
    getClient().get<PaginatedResponse<ArticlePublicOut>>("/articles/", { params }),

  getBySlug: (slug: string) => getClient().get<ArticlePublicOut>(`/articles/slug/${slug}`),

  /** Author/admin: full list including drafts. */
  listAdmin: (params?: { page?: number; page_size?: number; status?: ArticleStatus }) =>
    getClient().get<PaginatedResponse<ArticleOut>>("/articles/admin/all", { params }),

  getById: (id: string) => getClient().get<ArticleOut>(`/articles/${id}`),

  create: (payload: Partial<ArticleOut>) => getClient().post<ArticleOut>("/articles/", payload),
  update: (id: string, payload: Partial<ArticleOut>) =>
    getClient().patch<ArticleOut>(`/articles/${id}`, payload),
  publish: (id: string) => getClient().patch<ArticleOut>(`/articles/${id}/publish`),
  archive: (id: string) => getClient().patch<ArticleOut>(`/articles/${id}/archive`),
  remove: (id: string) => getClient().delete<void>(`/articles/${id}`),
};
