import { create } from "zustand";
import api from "@/lib/api";

export interface CategoryItem {
  id: string;
  name: string;
  iconName: string;
  isDefault?: boolean;
}

interface RemoteCategoryItem {
  id: string;
  name: string;
  icon_name: string;
  is_default: boolean;
  display_order: number;
}

const CAT_STORAGE_KEY = "farumasi_product_categories";

const BACKEND_CATEGORIES = [
  "Analgesics", "Antibiotics", "Antidiabetics", "Antihypertensives",
  "Antimalarials", "Antihistamines", "Gastrointestinal", "Respiratory",
  "Vitamins & Supplements", "Pain Relief", "Cold & Flu", "Allergy & Asthma",
  "Digestive Health", "Chronic Care", "Supplements", "Personal Care",
  "First Aid", "Wellness", "General",
];

export function getDefaultIconName(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("analgesic") || n.includes("pain")) return "pain-relief";
  if (n.includes("antibiotic")) return "antibiotics";
  if (n.includes("antidiabet") || n.includes("diabet")) return "diabetes";
  if (n.includes("antihypertens") || n.includes("hypertens")) return "blood-pressure";
  if (n.includes("malaria")) return "infectious";
  if (n.includes("antihistamine") || n.includes("histamine")) return "allergy";
  if (n.includes("gastro") || n.includes("digestive")) return "digestive";
  if (n.includes("respiratory") || n.includes("lung")) return "respiratory";
  if (n.includes("vitamin")) return "vitamins";
  if (n.includes("supplement")) return "supplements";
  if (n.includes("cold") || n.includes("flu")) return "cold-flu";
  if (n.includes("allergy") || n.includes("asthma")) return "allergy";
  if (n.includes("chronic")) return "chronic-care";
  if (n.includes("personal care") || n.includes("beauty")) return "skincare";
  if (n.includes("first aid")) return "first-aid";
  if (n.includes("wellness")) return "general";
  if (n.includes("sleep")) return "sleep";
  if (n.includes("mental") || n.includes("neuro") || n.includes("brain")) return "mental-health";
  if (n.includes("baby") || n.includes("child") || n.includes("pedia")) return "pediatrics";
  if (n.includes("skin") || n.includes("derma")) return "skincare";
  if (n.includes("eye") || n.includes("ophthalm")) return "eye-care";
  if (n.includes("ear")) return "ear-care";
  if (n.includes("dental") || n.includes("oral")) return "dental";
  if (n.includes("cardiac") || n.includes("heart")) return "heart-health";
  if (n.includes("oncol") || n.includes("cancer")) return "cancer-care";
  if (n.includes("kidney") || n.includes("renal")) return "kidney";
  if (n.includes("liver") || n.includes("hepat")) return "liver";
  if (n.includes("bone") || n.includes("ortho")) return "bone-joint";
  if (n.includes("thyroid")) return "thyroid";
  if (n.includes("reproductive") || n.includes("uterus")) return "reproductive";
  return "general";
}

const DEFAULT_CATEGORIES: CategoryItem[] = BACKEND_CATEGORIES.map((name, i) => ({
  id: `default-${i}`,
  name,
  iconName: getDefaultIconName(name),
  isDefault: true,
}));

function remoteToLocal(r: RemoteCategoryItem): CategoryItem {
  return { id: r.id, name: r.name, iconName: r.icon_name, isDefault: r.is_default };
}

function readCache(): CategoryItem[] {
  if (typeof window === "undefined") return DEFAULT_CATEGORIES;
  try {
    const stored = localStorage.getItem(CAT_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as CategoryItem[]) : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

function writeCache(categories: CategoryItem[]) {
  try {
    localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(categories));
  } catch {
    /* noop */
  }
}

interface CategoryState {
  categories: CategoryItem[];
  loaded: boolean;
  loading: boolean;
  fetchCategories: () => Promise<void>;
  addCategory: (item: Omit<CategoryItem, "id">) => Promise<CategoryItem>;
  updateCategory: (id: string, patch: Partial<Omit<CategoryItem, "id">>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  resetAll: () => void;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: DEFAULT_CATEGORIES,
  loaded: false,
  loading: false,

  fetchCategories: async () => {
    if (get().loading) return;
    set({ loading: true });
    // Seed from cache first so UI is not empty while the request runs
    if (!get().loaded) {
      set({ categories: readCache() });
    }
    try {
      const { data } = await api.get<RemoteCategoryItem[]>("/products/categories/");
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map(remoteToLocal);
        writeCache(mapped);
        set({ categories: mapped, loaded: true, loading: false });
      } else {
        set({ loaded: true, loading: false });
      }
    } catch {
      set({ loaded: true, loading: false });
    }
  },

  addCategory: async (item) => {
    const { data } = await api.post<RemoteCategoryItem>("/products/categories/", {
      name: item.name,
      icon_name: item.iconName,
      display_order: get().categories.length,
    });
    const created = remoteToLocal(data);
    const next = [...get().categories, created];
    writeCache(next);
    set({ categories: next, loaded: true });
    return created;
  },

  updateCategory: async (id, patch) => {
    const next = get().categories.map((c) => (c.id === id ? { ...c, ...patch } : c));
    writeCache(next);
    set({ categories: next });
    await api.patch(`/products/categories/${id}`, {
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.iconName !== undefined && { icon_name: patch.iconName }),
    });
  },

  deleteCategory: async (id) => {
    const next = get().categories.filter((c) => c.id !== id);
    writeCache(next);
    set({ categories: next });
    await api.delete(`/products/categories/${id}`);
  },

  resetAll: () => {
    writeCache(DEFAULT_CATEGORIES);
    set({ categories: DEFAULT_CATEGORIES });
  },
}));
