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
  return [
    { id: "1", slug: "malaria-prevention-tips", title: "Malaria Prevention Tips for the Rainy Season", subtitle: "Viral Infection", summary: "Key steps to protect yourself during high-risk periods.", fullContent: "1. Sleep under an insecticide-treated net every night.\n2. Use mosquito repellent containing DEET.\n3. Drain stagnant water around your home.\n4. Take prescribed prophylactics if traveling to high-risk zones.\n5. See a doctor immediately if you develop fever, chills or headache.", imageUrl: "", source: "Farumasi", category: "Viral Infection", readTimeMin: 2, publishedAt: new Date("2026-05-01") },
    { id: "2", slug: "managing-diabetes-diet", title: "Managing Diabetes Through Diet", subtitle: "Chronic Care", summary: "What to eat (and avoid) when living with Type 2 diabetes.", fullContent: "A balanced diet is central to managing blood glucose. Prioritize whole grains, legumes, and non-starchy vegetables. Limit refined sugars and white bread. Monitor portion sizes and eat at consistent times. Consult your dietitian for a personalised meal plan.", imageUrl: "", source: "Farumasi", category: "Chronic Care", readTimeMin: 3, publishedAt: new Date("2026-04-20") },
    { id: "3", slug: "breastfeeding-benefits", title: "The Benefits of Exclusive Breastfeeding", subtitle: "Mother & Babies", summary: "Why the first 6 months matter most for you and your baby.", fullContent: "Breast milk provides the ideal nutrition for newborns. It contains antibodies that help fight off viruses and bacteria. Exclusive breastfeeding for 6 months reduces the risk of ear infections, respiratory illness and bouts of diarrhea. It also supports healthy weight and may reduce allergy risk.", imageUrl: "", source: "Farumasi", category: "Mother & Babies", readTimeMin: 2, publishedAt: new Date("2026-05-10") },
    { id: "4", slug: "hydration-myths", title: "Hydration Myths Busted", subtitle: "Wellness", summary: "Is 8 glasses a day really necessary? The science says maybe not.", fullContent: "The \"8 glasses a day\" rule has little scientific backing. Your needs depend on body size, activity level, climate and diet. A practical guide: drink when thirsty, aim for pale-yellow urine, and increase intake during exercise or hot weather.", imageUrl: "", source: "Farumasi", category: "Wellness", readTimeMin: 2, publishedAt: new Date("2026-05-15") },
  ];
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
