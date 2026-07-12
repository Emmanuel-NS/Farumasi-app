import api, { mediaUrl } from "@/lib/api";
import { cacheThrough } from "@/lib/memory-cache";
import type { Medicine, MarketingPharmacy, ProductType } from "@/types";

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
  information_source_url?: string | null;
  created_at: string;
  /** Lowest listing price across active pharmacy/partner listings (RWF) */
  price_from: number | null;
  /** Highest listing price across active pharmacy/partner listings (RWF) */
  price_to: number | null;
  /** Number of active sellers stocking this product */
  listing_count: number | null;
  packaging_class?: string | null;
  /** Partial selling fields */
  allows_partial_selling?: boolean;
  min_partial_quantity?: number | null;
  units_per_pack?: number | null;
  partial_unit_name?: string | null;
  unit_price_from?: number | null;
}

export interface PaginatedProducts {
  items: BackendProduct[];
  total: number;
  offset: number;
  limit: number;
}

const PLACEHOLDER_IMAGE = "/pill-placeholder.svg";

interface ParsedDesc {
  short?: string;
  dosage_summary?: string;
  overview?: string;
  dosage_details?: string;
  safety?: string;
}

function parseDesc(raw: string | null | undefined): ParsedDesc {
  if (!raw) return {};
  try { return JSON.parse(raw) as ParsedDesc; } catch { return {}; }
}

export function adaptProduct(p: BackendProduct): Medicine {
  const displayPrice =
    p.price_from != null ? Math.round(p.price_from) : 0;
  const maxPrice =
    p.price_to != null ? Math.round(p.price_to) : displayPrice;

  const desc = parseDesc(p.description);
  const shortDesc = desc.short?.trim() ||
    `${p.name}${p.strength ? ` ${p.strength}` : ""} — ${p.dosage_form ?? "medicine"}.`;

  return {
    id: p.id,
    name: p.name,
    description: shortDesc,
    shortDescription: shortDesc,
    overviewDescription: desc.overview?.trim() || undefined,
    dosageSummary: desc.dosage_summary?.trim() || undefined,
    dosageDetails: desc.dosage_details?.trim() || undefined,
    safetyInfo: desc.safety?.trim() || undefined,
    informationSourceUrl: p.information_source_url?.trim() || undefined,
    price: displayPrice,
    maxPrice: maxPrice,
    imageUrl: (() => {
      const raw = p.image_url?.trim();
      return raw ? mediaUrl(raw) : PLACEHOLDER_IMAGE;
    })(),
    category: p.category ?? "General",
    subCategory: p.dosage_form ?? undefined,
    additionalCategories: [],
    additionalSubCategories: [],
    requiresPrescription: p.prescription_required,
    rating: (p.listing_count ?? 0) > 0 ? 0 : 0,
    isPopular: (p.listing_count ?? 0) >= 5,
    dosage: p.strength ? `${p.strength} — follow prescriber instructions.` : "Follow prescriber instructions.",
    sideEffects: "Consult your pharmacist or doctor for side-effect information.",
    manufacturer: p.manufacturer ?? p.brand ?? "Unknown",
    keywords: [p.name.toLowerCase(), p.generic_name?.toLowerCase() ?? "", p.category?.toLowerCase() ?? ""].filter(Boolean),
    product_type: (p.product_type as ProductType) ?? "medicine",
    ageDosages: [],
    marketingPharmacies: [] as MarketingPharmacy[],
    warnings: "Keep out of reach of children. Read the label carefully.",
    storage: "Store below 25°C in a dry place away from sunlight.",
    composition: p.generic_name ? `Active ingredient: ${p.generic_name}${p.strength ? ` ${p.strength}` : ""}` : undefined,
    packagingClass: p.packaging_class ?? undefined,
    allowsPartialSelling: p.allows_partial_selling ?? false,
    minPartialQuantity: p.min_partial_quantity ?? undefined,
    unitsPerPack: p.units_per_pack ?? undefined,
    partialUnitName: p.partial_unit_name ?? undefined,
    unitPriceFrom: p.unit_price_from != null ? Math.round(p.unit_price_from) : undefined,
  };
}

const CATALOG_TTL_MS = 90_000;
const CATEGORY_TTL_MS = 300_000;

export const productsService = {
  async getProducts(params?: {
    search?: string;
    category?: string;
    offset?: number;
    limit?: number;
    only_with_listings?: boolean;
  }): Promise<PaginatedProducts> {
    const key = `products:${JSON.stringify(params ?? {})}`;
    return cacheThrough(key, CATALOG_TTL_MS, async () => {
      const { data } = await api.get<PaginatedProducts>("/products", { params });
      return data;
    });
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

  async getCategories(): Promise<{ id: string; name: string; icon_name: string; is_default: boolean; display_order: number }[]> {
    return cacheThrough("products:categories", CATEGORY_TTL_MS, async () => {
      const { data } = await api.get<{ id: string; name: string; icon_name: string; is_default: boolean; display_order: number }[]>(
        "/products/categories/",
      );
      return data;
    });
  },
};
