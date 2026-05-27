import api from "@/lib/api";

export type ArticleStatus = "draft" | "published" | "archived";

export interface BackendArticle {
  id: string;
  author_pharmacist_id: string | null;
  title: string;
  slug: string;
  summary: string | null;
  content: string | null;
  category: string | null;
  image_url: string | null;
  status: ArticleStatus;
  published_at: string | null;
  created_at: string;
}

export interface ArticleListResponse {
  items: BackendArticle[];
  total: number;
  offset: number;
  limit: number;
}

export interface CreateArticleInput {
  title: string;
  summary?: string;
  content: string;
  category?: string;
  image_url?: string;
  slug?: string;
}

export type UpdateArticleInput = Partial<CreateArticleInput>;

export const articlesService = {
  async listAdmin(params: { offset?: number; limit?: number; status?: ArticleStatus } = {}) {
    const { data } = await api.get<ArticleListResponse>("/articles/admin/all", { params });
    return data;
  },
  async get(id: string) {
    const { data } = await api.get<BackendArticle>(`/articles/${id}`);
    return data;
  },
  async create(input: CreateArticleInput) {
    const { data } = await api.post<BackendArticle>("/articles/", input);
    return data;
  },
  async update(id: string, input: UpdateArticleInput) {
    const { data } = await api.patch<BackendArticle>(`/articles/${id}`, input);
    return data;
  },
  async publish(id: string) {
    const { data } = await api.patch<BackendArticle>(`/articles/${id}/publish`);
    return data;
  },
  async archive(id: string) {
    const { data } = await api.patch<BackendArticle>(`/articles/${id}/archive`);
    return data;
  },
  async remove(id: string) {
    await api.delete(`/articles/${id}`);
  },
};
