import api from "@/lib/api";

export type ArticleStatus = "draft" | "published" | "archived";
export type ArticleType = "article" | "tip" | "guide" | "news" | "did_you_know";

export interface BackendArticle {
  id: string;
  author_pharmacist_id: string | null;
  title: string;
  slug: string;
  summary: string | null;
  content: string | null;
  category: string | null;
  categories: string[];
  article_type: ArticleType;
  image_url: string | null;
  status: ArticleStatus;
  published_at: string | null;
  created_at: string;
  view_count: number;
  like_count: number;
  share_count: number;
  comment_count: number;
  video_url: string | null;
  is_sponsored?: boolean;
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
  categories?: string[];
  article_type?: ArticleType;
  image_url?: string;
  video_url?: string;
  slug?: string;
  is_sponsored?: boolean;
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
  async setSponsored(id: string, is_sponsored: boolean) {
    const { data } = await api.patch<BackendArticle>(
      `/articles/${id}/sponsored`,
      { is_sponsored },
    );
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
