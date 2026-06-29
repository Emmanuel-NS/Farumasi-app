import api from "@/lib/api";

export interface ContentPage {
  id: string;
  slug: string;
  page_type: string;
  audience: string;
  title: string;
  summary?: string | null;
  body?: string | null;
  status: string;
  version: number;
  contact_meta?: {
    email?: string;
    phone?: string;
    whatsapp?: string;
    faq?: Array<{ q: string; a: string }>;
  } | null;
  published_at?: string | null;
  updated_at?: string | null;
}

export const contentService = {
  async getPage(slug: string, audience = "patient"): Promise<ContentPage> {
    const { data } = await api.get<ContentPage>(`/content/pages/${slug}`, {
      params: { audience },
    });
    return data;
  },

  async listPages(audience = "patient"): Promise<ContentPage[]> {
    const { data } = await api.get<ContentPage[]>("/content/pages", {
      params: { audience },
    });
    return data;
  },
};
