import api from "@/lib/api";
import type { Medicine, MarketingPharmacy } from "@/types";

/** Shape returned by GET /products */
export interface BackendProduct {
  id: string;
  name: string;
  generic_name: string | null;
  category: string | null;
  product_type: string;
  description: string | null;
  dosage_form: string | null;
  strength: string | null;
  manufacturer: string | null;
  brand: string | null;
  prescription_required: boolean;
  approval_status: string;
  image_url: string | null;
  created_at: string;
  /** Lowest listing price across active pharmacy/partner listings (RWF) */
  price_from: number | null;
  /** Number of active sellers stocking this product */
  listing_count: number | null;
}

export interface PaginatedProducts {
  items: BackendProduct[];
  total: number;
  offset: number;
  limit: number;
}

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80";

export function adaptProduct(p: BackendProduct): Medicine {
  // Use real listing price if available, fall back to deterministic placeholder
  const displayPrice = p.price_from != null
    ? Math.round(p.price_from)
    : 1500 + (p.id.charCodeAt(0) % 10) * 500;
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? `${p.name}${p.strength ? ` ${p.strength}` : ""} — ${p.dosage_form ?? "medicine"}.`,
    price: displayPrice,
    maxPrice: Math.round(displayPrice * 1.3),
    imageUrl: p.image_url ?? PLACEHOLDER_IMAGE,
    category: p.category ?? "General",
    subCategory: p.dosage_form ?? undefined,
    additionalCategories: [],
    additionalSubCategories: [],
    requiresPrescription: p.prescription_required,
    rating: 4.2,
    isPopular: (p.listing_count ?? 0) >= 5,
    dosage: p.strength ? `${p.strength} — follow prescriber instructions.` : "Follow prescriber instructions.",
    sideEffects: "Consult your pharmacist or doctor for side-effect information.",
    manufacturer: p.manufacturer ?? p.brand ?? "Unknown",
    keywords: [p.name.toLowerCase(), p.generic_name?.toLowerCase() ?? "", p.category?.toLowerCase() ?? ""].filter(Boolean),
    ageDosages: [],
    marketingPharmacies: [] as MarketingPharmacy[],
    warnings: "Keep out of reach of children. Read the label carefully.",
    storage: "Store below 25°C in a dry place away from sunlight.",
    composition: p.generic_name ? `Active ingredient: ${p.generic_name}${p.strength ? ` ${p.strength}` : ""}` : undefined,
  };
}

export const productsService = {
  async getProducts(params?: {
    search?: string;
    category?: string;
    offset?: number;
    limit?: number;
    only_with_listings?: boolean;
  }): Promise<PaginatedProducts> {
    const { data } = await api.get<PaginatedProducts>("/products", { params });
    return data;
  },

  async getProductById(id: string): Promise<Medicine> {
    const { data } = await api.get<BackendProduct>(`/products/${id}`);
    return adaptProduct(data);
  },

  async searchProducts(query: string): Promise<Medicine[]> {
    const data = await this.getProducts({ search: query, limit: 50 });
    return data.items.map(adaptProduct);
  },

  async getAllProducts(): Promise<Medicine[]> {
    const data = await this.getProducts({ limit: 100, only_with_listings: true });
    return data.items.map(adaptProduct);
  },
};
