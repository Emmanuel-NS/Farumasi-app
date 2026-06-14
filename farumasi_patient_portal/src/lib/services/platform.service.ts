import { api } from "@/lib/api";

export interface MarketplaceStats {
  productCount: number;
  sellerCount: number;
}

export async function fetchMarketplaceStats(): Promise<MarketplaceStats> {
  const [productsRes, partnersRes, pharmaciesRes] = await Promise.all([
    api.get<{ total: number }>("/products", {
      params: { limit: 1, only_with_listings: true },
    }),
    api.get<{ total: number }>("/partners/public/", { params: { limit: 1 } }),
    api.get<{ total: number }>("/pharmacies/", {
      params: { limit: 1, open_only: true },
    }),
  ]);
  const productCount = productsRes.data.total ?? 0;
  const sellerCount =
    (partnersRes.data.total ?? 0) + (pharmaciesRes.data.total ?? 0);
  return { productCount, sellerCount };
}
