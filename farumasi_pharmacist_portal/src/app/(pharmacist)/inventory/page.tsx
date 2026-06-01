"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import api from "@/lib/api";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TipTapUnderline from "@tiptap/extension-underline";
import type { CategoryIconComponent } from "@/components/icons/CategoryIcons";
import { HEALTHCARE_CATEGORY_ICONS, IconGeneral } from "@/components/icons/CategoryIcons";
import {
  Search, X, ChevronLeft, ChevronRight,
  Loader2, Building2, Plus, Package,
  ChevronDown, Pencil, Eye, ImagePlus,
  Calendar, TrendingUp,
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Undo2, Redo2,
  ArrowLeft, ShieldOff, Trash2, MoreVertical, AlertTriangle,
  // Category icon picker — medical & clinical
  Pill, Syringe, Stethoscope, Thermometer, Bandage, Microscope, FlaskConical, TestTube,
  Cross, ClipboardPlus, ClipboardList, FileHeart, FilePlus, Scan, Dna, Hospital,
  Bed, BedDouble, Accessibility, HeartPulse, Heart, HeartCrack, HeartHandshake,
  Activity, Brain, Ear, Fingerprint, Bone, PersonStanding,
  // Conditions / immunity
  Bug, Shield, ShieldCheck, ShieldPlus, ShieldAlert, Zap, Flame,
  Droplets, Wind, Cloud, Snowflake, Gauge, Timer,
  // Wellness / lifestyle
  Sun, Moon, Star, Sparkles, Gem, Dumbbell, Mountain, Waves, TreePine, Leaf,
  Sprout, Flower2, Smile, Frown, Laugh, Meh, Baby,
  Users, User, UserCheck, UserPlus,
  // Nutrition & food
  Apple, Utensils, Coffee, Beer, Wine, Fish, Cookie, Beef, Wheat, Pizza,
  Candy, IceCreamCone, Sandwich, Croissant, Egg, Carrot, Grape, Citrus, Soup, Milk,
  Salad, Popcorn, Nut, ChefHat, UtensilsCrossed,
  // Personal care & hygiene
  Scissors, SprayCan, Palette, Shirt, Watch, Glasses, Bath, Brush,
  // Mental / emotional
  MessageCircleHeart, Headphones, BookOpen, PenLine,
  // Movement / devices
  Bike, Car, Truck, Ambulance, Footprints, Hand,
  // Specific body systems
  Scan as ScanBody, EarOff, EyeOff,
  // Misc utility
  LayoutGrid, Tag, Layers, Hash, Trophy, Award, Medal, Ribbon,
  RotateCcw, RefreshCw, Repeat, Clock, AlarmClock, Hourglass,
  // Extra
  Feather, Anchor, Compass, Globe, Map as MapIcon, MapPin, Navigation,
  Lightbulb, Battery, BatteryCharging, Cpu, Radio, Wifi,
  Camera, Video, Image as ImageIcon, FileImage, QrCode,
  Lock, Unlock, Key, KeyRound, Fingerprint as FingerprintAlt,
  CreditCard, Wallet, Banknote, Gift, ShoppingCart, ShoppingBag,
  Home, Building2 as BuildingHospital, Store, Tent,
  Trees, Wind as WindAlt, Sunset, Sunrise, CloudRain, CloudSnow,
  Thermometer as ThermometerAlt, Droplet,
  Microscope as MicroscopeAlt,
} from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import {
  productsService,
  type BackendProduct,
  type CreateProductInput,
  type UpdateProductInput,
} from "@/lib/services/products.service";
import { listingsService, type BackendListing, type ListingAvailability } from "@/lib/services/listings.service";
import { pharmaciesService, type BackendPharmacy } from "@/lib/services/pharmacies.service";
import { ordersService } from "@/lib/services/orders.service";

/* ─── Constants ─────────────────────────────────────────── */
const CATEGORY_LIST = [
  "All", "Pain Relief", "Antibiotics", "Allergy & Asthma", "Cold & Flu",
  "Digestive Health", "Chronic Care", "Supplements", "Personal Care",
  "Antimalarial", "First Aid", "Wellness",
];

const BACKEND_CATEGORIES = [
  "Analgesics", "Antibiotics", "Antidiabetics", "Antihypertensives",
  "Antimalarials", "Antihistamines", "Gastrointestinal", "Respiratory",
  "Vitamins & Supplements", "Pain Relief", "Cold & Flu", "Allergy & Asthma",
  "Digestive Health", "Chronic Care", "Supplements", "Personal Care",
  "First Aid", "Wellness", "General",
];

const DOSAGE_FORMS = [
  "Tablet", "Capsule", "Syrup", "Injection", "Inhaler",
  "Cream", "Ointment", "Drops", "Sachet", "Patch", "Suppository", "Other",
];
const PRODUCT_TYPES = [
  { value: "medicine",         label: "Medicine"         },
  { value: "medical_device",   label: "Medical Device"   },
  { value: "food_supplements", label: "Food Supplements" },
  { value: "cosmetics",        label: "Cosmetics"        },
];

/* ─── Category icon registry ────────────────────────────── */
const CATEGORY_ICONS = HEALTHCARE_CATEGORY_ICONS;

// Legacy lucide icons kept referenced so unused-import linters stay quiet.
const _legacyCategoryIcons = [
  { name: "pill",             Icon: IconGeneral,      label: "Pill"               },
  { name: "syringe",          Icon: Syringe,          label: "Injection"          },
  { name: "stethoscope",      Icon: Stethoscope,      label: "Stethoscope"        },
  { name: "thermometer",      Icon: Thermometer,      label: "Thermometer"        },
  { name: "bandage",          Icon: Bandage,          label: "Bandage"            },
  { name: "microscope",       Icon: Microscope,       label: "Microscope"         },
  { name: "flask",            Icon: FlaskConical,     label: "Flask"              },
  { name: "test-tube",        Icon: TestTube,         label: "Test Tube"          },
  { name: "cross",            Icon: Cross,            label: "Medical Cross"      },
  { name: "clipboard-plus",   Icon: ClipboardPlus,    label: "Prescription"       },
  { name: "clipboard-list",   Icon: ClipboardList,    label: "Drug List"          },
  { name: "file-heart",       Icon: FileHeart,        label: "Health Record"      },
  { name: "file-plus",        Icon: FilePlus,         label: "New Record"         },
  { name: "scan",             Icon: Scan,             label: "Scan / Barcode"     },
  { name: "dna",              Icon: Dna,              label: "DNA / Genetics"     },
  { name: "hospital",         Icon: Hospital,         label: "Hospital"           },
  { name: "bed",              Icon: Bed,              label: "Ward / Bed"         },
  { name: "bed-double",       Icon: BedDouble,        label: "Recovery"           },
  { name: "ambulance",        Icon: Ambulance,        label: "Emergency"          },
  { name: "accessibility",    Icon: Accessibility,    label: "Mobility / Disability"},
  // ── Heart & Cardiovascular ───────────────────────────────────────────────
  { name: "heart",            Icon: Heart,            label: "Cardiac"            },
  { name: "heart-pulse",      Icon: HeartPulse,       label: "Vitals"             },
  { name: "heart-crack",      Icon: HeartCrack,       label: "Cardiac Risk"       },
  { name: "heart-handshake",  Icon: HeartHandshake,   label: "Patient Care"       },
  { name: "activity",         Icon: Activity,         label: "Monitor / ECG"      },
  // ── Neuro / Senses ──────────────────────────────────────────────────────
  { name: "brain",            Icon: Brain,            label: "Neurology"          },
  { name: "ear",              Icon: Ear,              label: "ENT / Audiology"    },
  { name: "eye",              Icon: Eye,              label: "Ophthalmology"      },
  { name: "eye-off",          Icon: EyeOff,           label: "Vision Impairment"  },
  { name: "fingerprint",      Icon: Fingerprint,      label: "Dermatology"        },
  { name: "glasses",          Icon: Glasses,          label: "Eyewear / Optics"   },
  // ── Musculoskeletal / Movement ───────────────────────────────────────────
  { name: "bone",             Icon: Bone,             label: "Orthopedics / Bone" },
  { name: "dumbbell",         Icon: Dumbbell,         label: "Fitness"            },
  { name: "footprints",       Icon: Footprints,       label: "Podiatry / Walking" },
  { name: "hand",             Icon: Hand,             label: "Hand / Arthritis"   },
  { name: "person-standing",  Icon: PersonStanding,   label: "Physiotherapy"      },
  { name: "bike",             Icon: Bike,             label: "Rehab / Active"     },
  // ── Infections / Immunity ───────────────────────────────────────────────
  { name: "bug",              Icon: Bug,              label: "Malaria / Parasites"},
  { name: "cloud-rain",       Icon: CloudRain,        label: "Allergic Rhinitis"  },
  { name: "shield",           Icon: Shield,           label: "Antimalarial"       },
  { name: "shield-check",     Icon: ShieldCheck,      label: "Antibiotic"         },
  { name: "shield-plus",      Icon: ShieldPlus,       label: "Immunity Boost"     },
  { name: "shield-alert",     Icon: ShieldAlert,      label: "Drug Resistance"    },
  { name: "shield-off",       Icon: ShieldOff,        label: "Immunosuppressant"  },
  // ── Symptoms / Conditions ───────────────────────────────────────────────
  { name: "zap",              Icon: Zap,              label: "Pain Relief"        },
  { name: "flame",            Icon: Flame,            label: "Inflammation"       },
  { name: "droplets",         Icon: Droplets,         label: "Hydration / Fluids" },
  { name: "droplet",          Icon: Droplet,          label: "Drops / Tincture"   },
  { name: "wind",             Icon: Wind,             label: "Respiratory"        },
  { name: "cloud",            Icon: Cloud,            label: "Cold & Flu"         },
  { name: "snowflake",        Icon: Snowflake,        label: "Cold Therapy"       },
  { name: "cloud-rain",       Icon: CloudRain,        label: "Allergic Rhinitis"  },
  { name: "gauge",            Icon: Gauge,            label: "Chronic Care"       },
  { name: "timer",            Icon: Timer,            label: "Timed Dose"         },
  { name: "hourglass",        Icon: Hourglass,        label: "Timed Release"      },
  { name: "clock",            Icon: Clock,            label: "Dosage Schedule"    },
  { name: "alarm-clock",      Icon: AlarmClock,       label: "Reminder"           },
  // ── Digestive / Nutrition ───────────────────────────────────────────────
  { name: "utensils",         Icon: Utensils,         label: "Digestive"          },
  { name: "utensils-crossed", Icon: UtensilsCrossed,  label: "Diet Restriction"   },
  { name: "chef-hat",         Icon: ChefHat,          label: "Clinical Nutrition" },
  { name: "apple",            Icon: Apple,            label: "Nutrition"          },
  { name: "carrot",           Icon: Carrot,           label: "Vegetables / Fiber" },
  { name: "egg",              Icon: Egg,              label: "Protein"            },
  { name: "fish",             Icon: Fish,             label: "Omega / Seafood"    },
  { name: "beef",             Icon: Beef,             label: "Protein / Iron"     },
  { name: "wheat",            Icon: Wheat,            label: "Carbohydrates"      },
  { name: "salad",            Icon: Salad,            label: "Salad / Greens"     },
  { name: "soup",             Icon: Soup,             label: "Liquid Diet"        },
  { name: "sandwich",         Icon: Sandwich,         label: "Food / Nutrition"   },
  { name: "croissant",        Icon: Croissant,        label: "Bakery / Carbs"     },
  { name: "pizza",            Icon: Pizza,            label: "Meal Plan"          },
  { name: "grape",            Icon: Grape,            label: "Antioxidants"       },
  { name: "citrus",           Icon: Citrus,           label: "Vitamin C"          },
  { name: "milk",             Icon: Milk,             label: "Calcium / Dairy"    },
  { name: "coffee",           Icon: Coffee,           label: "Stimulant"          },
  { name: "beer",             Icon: Beer,             label: "Alcohol / Beverage" },
  { name: "wine",             Icon: Wine,             label: "Alcohol"            },
  { name: "candy",            Icon: Candy,            label: "Sugar / Diabetic"   },
  { name: "ice-cream-cone",   Icon: IceCreamCone,     label: "Cold Dessert"       },
  { name: "cookie",           Icon: Cookie,           label: "Snack"              },
  { name: "popcorn",          Icon: Popcorn,          label: "Snack / Fibre"      },
  { name: "nut",              Icon: Nut,              label: "Nuts / Healthy Fats"},
  // ── Vitamins / Supplements / Wellness ──────────────────────────────────
  { name: "sun",              Icon: Sun,              label: "Vitamins / Sunlight"},
  { name: "sunrise",          Icon: Sunrise,          label: "Morning Routine"    },
  { name: "sunset",           Icon: Sunset,           label: "Evening Routine"    },
  { name: "sparkles",         Icon: Sparkles,         label: "Supplements"        },
  { name: "star",             Icon: Star,             label: "Wellness"           },
  { name: "gem",              Icon: Gem,              label: "Premium / Luxury"   },
  { name: "leaf",             Icon: Leaf,             label: "Herbal"             },
  { name: "sprout",           Icon: Sprout,           label: "Natural / Organic"  },
  { name: "flower2",          Icon: Flower2,          label: "Allergy / Botanical"},
  { name: "tree-pine",        Icon: TreePine,         label: "Organic"            },
  { name: "trees",            Icon: Trees,            label: "Eco / Natural"      },
  // ── Mental Health / Sleep ───────────────────────────────────────────────
  { name: "moon",             Icon: Moon,             label: "Sleep / Sedative"   },
  { name: "smile",            Icon: Smile,            label: "Mental Health"      },
  { name: "frown",            Icon: Frown,            label: "Depression"         },
  { name: "meh",              Icon: Meh,              label: "Anxiety / Mood"     },
  { name: "laugh",            Icon: Laugh,            label: "Joy / Wellbeing"    },
  { name: "message-heart",    Icon: MessageCircleHeart, label: "Emotional Support"},
  { name: "headphones",       Icon: Headphones,       label: "Therapy / Audio"    },
  { name: "book-open",        Icon: BookOpen,         label: "CBT / Self-Help"    },
  { name: "lightbulb",        Icon: Lightbulb,        label: "Mindfulness"        },
  // ── Paediatrics / Maternal ──────────────────────────────────────────────
  { name: "baby",             Icon: Baby,             label: "Pediatric"          },
  { name: "user-plus",        Icon: UserPlus,         label: "Maternal Health"    },
  // ── Personal Care / Hygiene ─────────────────────────────────────────────
  { name: "scissors",         Icon: Scissors,         label: "Surgical / Incision"},
  { name: "spray-can",        Icon: SprayCan,         label: "Spray / Aerosol"    },
  { name: "palette",          Icon: Palette,          label: "Cosmetics"          },
  { name: "brush",            Icon: Brush,            label: "Topical / Brush"    },
  { name: "droplet",          Icon: Droplet,          label: "Drops / Tincture"   },
  { name: "shirt",            Icon: Shirt,            label: "Wearable / Clothing"},
  { name: "watch",            Icon: Watch,            label: "Wearable Device"    },
  { name: "pen-line",         Icon: PenLine,          label: "Topical / Ointment" },
  // ── Devices / Diagnostics ───────────────────────────────────────────────
  { name: "battery",          Icon: Battery,          label: "Medical Device"     },
  { name: "battery-charging", Icon: BatteryCharging,  label: "Charging Device"    },
  { name: "cpu",              Icon: Cpu,              label: "Smart Device"       },
  { name: "qr-code",          Icon: QrCode,           label: "QR / Drug Code"     },
  { name: "radio",            Icon: Radio,            label: "Remote Monitor"     },
  { name: "wifi",             Icon: Wifi,             label: "Connected Health"   },
  { name: "camera",           Icon: Camera,           label: "Imaging / X-Ray"    },  // ── Pharmacy / Store ────────────────────────────────────────────────────
  { name: "shopping-cart",    Icon: ShoppingCart,     label: "OTC / Store"        },
  { name: "shopping-bag",     Icon: ShoppingBag,      label: "Retail Pack"        },
  { name: "gift",             Icon: Gift,             label: "Health Gift"        },
  { name: "ribbon",           Icon: Ribbon,           label: "Awareness Ribbon"   },
  { name: "award",            Icon: Award,            label: "Certified"          },
  { name: "trophy",           Icon: Trophy,           label: "Best Seller"        },
  { name: "medal",            Icon: Medal,            label: "Gold Standard"      },
  { name: "store",            Icon: Store,            label: "Pharmacy"           },
  { name: "home",             Icon: Home,             label: "Home Care"          },
  { name: "tent",             Icon: Tent,             label: "Field / Camp"       },
  { name: "map-pin",          Icon: MapPin,           label: "Location"           },
  { name: "globe",            Icon: Globe,            label: "International"      },
  { name: "compass",          Icon: Compass,          label: "Navigation"         },
  // ── Users / People ──────────────────────────────────────────────────────
  { name: "user",             Icon: User,             label: "Individual"         },
  { name: "users",            Icon: Users,            label: "Community"          },
  { name: "user-check",       Icon: UserCheck,        label: "Verified Patient"   },
  // ── General / Misc ──────────────────────────────────────────────────────
  { name: "package",          Icon: Package,          label: "General"            },
  { name: "tag",              Icon: Tag,              label: "Miscellaneous"      },
  { name: "layers",           Icon: Layers,           label: "Multi-Use"          },
  { name: "layout-grid",      Icon: LayoutGrid,       label: "All / Catalogue"    },
  { name: "hash",             Icon: Hash,             label: "Index"              },
  { name: "refresh-cw",       Icon: RefreshCw,        label: "Refill"             },
  { name: "repeat",           Icon: Repeat,           label: "Repeat Prescription"},
  { name: "feather",          Icon: Feather,          label: "Lightweight"        },
  { name: "anchor",           Icon: Anchor,           label: "Stability"          },
  { name: "mountain",         Icon: Mountain,         label: "Endurance"          },
  { name: "waves",            Icon: Waves,            label: "Hydration"          },
  { name: "cloud-snow",       Icon: IconGeneral,      label: "Cold / Cryotherapy" },
];
void _legacyCategoryIcons;

const ICON_BY_NAME: Record<string, CategoryIconComponent> = Object.fromEntries(
  CATEGORY_ICONS.map(({ name, Icon }) => [name, Icon]),
);
function resolveIcon(name: string): CategoryIconComponent {
  return ICON_BY_NAME[name] ?? IconGeneral;
}

function getDefaultIconName(catName: string): string {
  const n = catName.toLowerCase();
  if (n.includes("analgesic") || n.includes("pain"))           return "pain-relief";
  if (n.includes("antibiotic"))                                return "antibiotics";
  if (n.includes("antidiabet") || n.includes("diabet"))        return "diabetes";
  if (n.includes("antihypertens") || n.includes("hypertens"))  return "blood-pressure";
  if (n.includes("malaria"))                                   return "infectious";
  if (n.includes("antihistamine") || n.includes("histamine"))  return "allergy";
  if (n.includes("gastro") || n.includes("digestive"))         return "digestive";
  if (n.includes("respiratory") || n.includes("lung"))         return "respiratory";
  if (n.includes("vitamin"))                                   return "vitamins";
  if (n.includes("supplement"))                                return "supplements";
  if (n.includes("cold") || n.includes("flu"))                 return "cold-flu";
  if (n.includes("allergy") || n.includes("asthma"))           return "allergy";
  if (n.includes("chronic"))                                   return "chronic-care";
  if (n.includes("personal care") || n.includes("beauty"))     return "skincare";
  if (n.includes("first aid"))                                 return "first-aid";
  if (n.includes("wellness"))                                  return "general";
  if (n.includes("sleep"))                                     return "sleep";
  if (n.includes("mental") || n.includes("neuro") || n.includes("brain")) return "mental-health";
  if (n.includes("baby") || n.includes("child") || n.includes("pedia"))   return "pediatrics";
  if (n.includes("skin") || n.includes("derma"))               return "skincare";
  if (n.includes("eye") || n.includes("ophthalm"))             return "eye-care";
  if (n.includes("ear"))                                       return "ear-care";
  if (n.includes("dental") || n.includes("oral"))              return "dental";
  if (n.includes("cardiac") || n.includes("heart"))            return "heart-health";
  if (n.includes("oncol") || n.includes("cancer"))             return "cancer-care";
  if (n.includes("kidney") || n.includes("renal"))             return "kidney";
  if (n.includes("liver") || n.includes("hepat"))              return "liver";
  if (n.includes("bone") || n.includes("ortho"))               return "bone-joint";
  if (n.includes("thyroid"))                                   return "thyroid";
  if (n.includes("reproductive") || n.includes("uterus"))      return "reproductive";
  return "general";
}

interface CategoryItem {
  id: string;
  name: string;
  iconName: string;
  isDefault?: boolean;
}

const DEFAULT_CATEGORIES: CategoryItem[] = BACKEND_CATEGORIES.map((name, i) => ({
  id: `default-${i}`,
  name,
  iconName: getDefaultIconName(name),
  isDefault: true,
}));

const CAT_STORAGE_KEY = "farumasi_product_categories";

/* Remote category shape from GET /products/categories/ */
interface RemoteCategoryItem {
  id: string;
  name: string;
  icon_name: string;
  is_default: boolean;
  display_order: number;
}

function remoteToLocal(r: RemoteCategoryItem): CategoryItem {
  return { id: r.id, name: r.name, iconName: r.icon_name, isDefault: r.is_default };
}

function useCategoryStore() {
  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    if (typeof window === "undefined") return DEFAULT_CATEGORIES;
    try {
      const stored = localStorage.getItem(CAT_STORAGE_KEY);
      return stored ? (JSON.parse(stored) as CategoryItem[]) : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  });

  // Hydrate from backend on mount — backend is the source of truth
  useEffect(() => {
    api.get<RemoteCategoryItem[]>("/products/categories/")
      .then(({ data }) => {
        if (data.length > 0) {
          const mapped = data.map(remoteToLocal);
          setCategories(mapped);
          try { localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(mapped)); } catch { /* noop */ }
        }
      })
      .catch(() => { /* keep localStorage fallback */ });
  }, []);

  const persist = useCallback((next: CategoryItem[]) => {
    setCategories(next);
    try { localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(next)); } catch { /* noop */ }
  }, []);

  const addCategory = useCallback(
    async (item: Omit<CategoryItem, "id">) => {
      try {
        const { data } = await api.post<RemoteCategoryItem>("/products/categories/", {
          name: item.name,
          icon_name: item.iconName,
          display_order: categories.length,
        });
        persist([...categories, remoteToLocal(data)]);
      } catch {
        // Optimistic local-only fallback
        persist([...categories, { ...item, id: crypto.randomUUID() }]);
      }
    },
    [persist, categories],
  );

  const updateCategory = useCallback(
    async (id: string, patch: Partial<Omit<CategoryItem, "id">>) => {
      const next = categories.map((c) => (c.id === id ? { ...c, ...patch } : c));
      persist(next);
      try {
        await api.patch(`/products/categories/${id}`, {
          ...(patch.name !== undefined && { name: patch.name }),
          ...(patch.iconName !== undefined && { icon_name: patch.iconName }),
        });
      } catch { /* local already updated */ }
    },
    [persist, categories],
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      persist(categories.filter((c) => c.id !== id));
      try { await api.delete(`/products/categories/${id}`); } catch { /* local already updated */ }
    },
    [persist, categories],
  );

  const resetAll = useCallback(() => persist(DEFAULT_CATEGORIES), [persist]);

  return { categories, addCategory, updateCategory, deleteCategory, resetAll };
}

/* ─── CategoryManagerPage ──────────────────────────────── */
type CatViewState = { mode: "list" } | { mode: "create" } | { mode: "edit"; id: string };

function CategoryManagerPage({ onClose }: { onClose: () => void }) {
  const { categories, addCategory, updateCategory, deleteCategory, resetAll } = useCategoryStore();
  const [view, setView]               = useState<CatViewState>({ mode: "list" });
  const [name, setName]               = useState("");
  const [iconName, setIconName]       = useState("package");
  const [listSearch, setListSearch]   = useState("");
  const [iconSearch, setIconSearch]   = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const isForm = view.mode !== "list";

  function openCreate() {
    setName(""); setIconName("package"); setIconSearch(""); setView({ mode: "create" });
  }
  function openEdit(cat: CategoryItem) {
    setName(cat.name); setIconName(cat.iconName); setIconSearch(""); setView({ mode: "edit", id: cat.id });
  }
  async function handleSave() {
    if (!name.trim()) return;
    if (view.mode === "create") await addCategory({ name: name.trim(), iconName, isDefault: false });
    else if (view.mode === "edit") await updateCategory(view.id, { name: name.trim(), iconName });
    setView({ mode: "list" });
  }

  const filteredCategories = listSearch.trim()
    ? categories.filter((c) => c.name.toLowerCase().includes(listSearch.toLowerCase()))
    : categories;

  const filteredIcons = iconSearch.trim()
    ? CATEGORY_ICONS.filter((ic) =>
        ic.label.toLowerCase().includes(iconSearch.toLowerCase()) ||
        ic.name.toLowerCase().includes(iconSearch.toLowerCase()),
      )
    : CATEGORY_ICONS;

  const PreviewIcon = resolveIcon(iconName);

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 shrink-0">
        <div className="max-w-3xl mx-auto px-6 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isForm ? (view.mode === "create" ? "New Category" : "Edit Category") : "Manage Categories"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isForm
                  ? "Give it a name and pick an icon — icons appear on the patient app."
                  : "Create and manage product categories. Icons show on the patient category bar."}
              </p>
            </div>
            <button
              type="button"
              onClick={isForm ? () => setView({ mode: "list" }) : onClose}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
            >
              {isForm ? <ArrowLeft className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-5 space-y-4">
          {isForm ? (
            <>
              {/* Name */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Category Name</p>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  placeholder="e.g. Antimalarials"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-200"
                />
              </div>

              {/* Icon picker */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Pick an Icon
                    <span className="text-farumasi-600 normal-case font-semibold ml-1">
                      · {CATEGORY_ICONS.find((i) => i.name === iconName)?.label ?? "–"}
                    </span>
                  </p>
                  {/* Live preview chip */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-farumasi-600 text-white">
                    <PreviewIcon className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs font-semibold">{name.trim() || "Preview"}</span>
                  </div>
                </div>
                {/* Icon search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    value={iconSearch}
                    onChange={(e) => setIconSearch(e.target.value)}
                    placeholder="Search icons…"
                    className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-200"
                  />
                </div>
                {/* Icon grid — icon-only, tooltip on hover */}
                <div className="grid grid-cols-8 sm:grid-cols-10 gap-1 max-h-72 overflow-y-auto scrollbar-hide">
                  {filteredIcons.map(({ name: iname, Icon: Ic, label }) => {
                    const active = iconName === iname;
                    return (
                      <button
                        key={iname}
                        type="button"
                        onClick={() => setIconName(iname)}
                        title={label}
                        className={cn(
                          "flex items-center justify-center w-9 h-9 rounded-xl border transition-all",
                          active
                            ? "bg-farumasi-600 text-white border-farumasi-600 shadow-sm"
                            : "bg-slate-50 text-slate-500 border-transparent hover:border-farumasi-300 hover:bg-farumasi-50 hover:text-farumasi-600",
                        )}
                      >
                        <Ic className="w-5 h-5 shrink-0" />
                      </button>
                    );
                  })}
                  {filteredIcons.length === 0 && (
                    <p className="col-span-10 text-xs text-slate-400 text-center py-8">No icons match.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Actions bar */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    value={listSearch}
                    onChange={(e) => setListSearch(e.target.value)}
                    placeholder="Search categories…"
                    className="w-full h-9 pl-8 pr-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-200"
                  />
                </div>
                <button
                  type="button"
                  onClick={openCreate}
                  className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-farumasi-600 hover:bg-farumasi-700 text-white text-sm font-bold transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" /> New Category
                </button>
              </div>

              {/* Category list */}
              <div className="space-y-2">
                {filteredCategories.length === 0 && (
                  <p className="text-center text-sm text-slate-400 py-10">No categories found.</p>
                )}
                {filteredCategories.map((cat) => {
                  const Ic = resolveIcon(cat.iconName);
                  return (
                    <div key={cat.id} className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-farumasi-50 flex items-center justify-center shrink-0">
                        <Ic className="w-5 h-5 text-farumasi-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{cat.name}</p>
                        {cat.isDefault && (
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Built-in</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEdit(cat)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-farumasi-600 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {!cat.isDefault && (
                          deleteConfirm === cat.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={async () => { await deleteCategory(cat.id); setDeleteConfirm(null); }}
                                className="px-2 py-1 rounded-lg bg-red-600 text-white text-[10px] font-bold hover:bg-red-700 transition-colors"
                              >Delete</button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm(null)}
                                className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold hover:bg-slate-200 transition-colors"
                              >Cancel</button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm(cat.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Reset all to built-in defaults? Custom categories will be removed.")) {
                      resetAll();
                    }
                  }}
                  className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset to defaults
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer — form mode only */}
      {isForm && (
        <div className="bg-white border-t border-slate-100 shrink-0">
          <div className="max-w-3xl mx-auto px-6 pb-6 pt-3 flex gap-3">
            <button
              type="button"
              onClick={() => setView({ mode: "list" })}
              className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!name.trim()}
              className="flex-1 h-10 rounded-xl bg-farumasi-600 text-white text-sm font-bold hover:bg-farumasi-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {view.mode === "create" ? "Create Category" : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Color helpers ─────────────────────────────────────── */
function categoryBg(cat?: string | null): string {
  const c = (cat ?? "").toLowerCase();
  if (c.includes("antibiotic"))                            return "bg-blue-100 text-blue-700 border-blue-200";
  if (c.includes("analgesic") || c.includes("pain"))      return "bg-orange-100 text-orange-700 border-orange-200";
  if (c.includes("malaria"))                               return "bg-red-100 text-red-700 border-red-200";
  if (c.includes("diabet") || c.includes("chronic"))      return "bg-purple-100 text-purple-700 border-purple-200";
  if (c.includes("vitamin") || c.includes("supplement"))  return "bg-yellow-100 text-yellow-700 border-yellow-200";
  if (c.includes("respiratory") || c.includes("cold") || c.includes("asthma"))
                                                           return "bg-sky-100 text-sky-700 border-sky-200";
  if (c.includes("gastro") || c.includes("digestive"))    return "bg-amber-100 text-amber-700 border-amber-200";
  if (c.includes("hypertension"))                         return "bg-rose-100 text-rose-700 border-rose-200";
  if (c.includes("antihistamine") || c.includes("allergy")) return "bg-teal-100 text-teal-700 border-teal-200";
  return "bg-farumasi-100 text-farumasi-700 border-farumasi-200";
}

function categoryGradient(cat?: string | null): string {
  const c = (cat ?? "").toLowerCase();
  if (c.includes("antibiotic"))                            return "from-blue-500 to-blue-700";
  if (c.includes("analgesic") || c.includes("pain"))      return "from-orange-400 to-orange-600";
  if (c.includes("malaria"))                               return "from-red-500 to-red-700";
  if (c.includes("diabet") || c.includes("chronic"))      return "from-purple-500 to-purple-700";
  if (c.includes("vitamin") || c.includes("supplement"))  return "from-yellow-400 to-amber-600";
  if (c.includes("respiratory") || c.includes("cold") || c.includes("asthma"))
                                                           return "from-sky-400 to-sky-600";
  if (c.includes("gastro") || c.includes("digestive"))    return "from-amber-500 to-amber-700";
  if (c.includes("hypertension"))                         return "from-rose-500 to-rose-700";
  if (c.includes("antihistamine") || c.includes("allergy")) return "from-teal-400 to-teal-600";
  return "from-farumasi-500 to-farumasi-700";
}

/* ─── Description helpers ───────────────────────────────── */
interface ParsedDesc {
  short: string;
  dosage_summary: string;
  overview: string;
  dosage_details: string;
  safety: string;
}
function parseDesc(raw?: string | null): ParsedDesc {
  const empty: ParsedDesc = { short: "", dosage_summary: "", overview: "", dosage_details: "", safety: "" };
  if (!raw) return empty;
  try {
    const p = JSON.parse(raw);
    if (p && typeof p === "object" && !Array.isArray(p)) return { ...empty, ...p };
  } catch {
    /* plain-text fallback */
  }
  return { ...empty, short: raw };
}
function serializeDesc(d: ParsedDesc): string { return JSON.stringify(d); }

/* ─── TipTap rich editor ────────────────────────────────── */
function RichEditor({
  initialContent,
  onChange,
  placeholder,
}: {
  initialContent: string;
  onChange: (html: string) => void;
  placeholder: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TipTapUnderline,
      Placeholder.configure({ placeholder }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: "min-h-[130px] px-3.5 py-3 focus:outline-none" },
    },
  });

  const btn = (active?: boolean) =>
    cn(
      "p-1.5 rounded text-slate-500 hover:bg-white hover:text-slate-800 transition-colors",
      active && "bg-white text-slate-900 shadow-sm",
    );

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center gap-0.5 px-2 py-1 bg-slate-50 border-b border-slate-100 flex-wrap">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBold().run(); }}
          className={btn(editor?.isActive("bold"))}
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleItalic().run(); }}
          className={btn(editor?.isActive("italic"))}
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleUnderline().run(); }}
          className={btn(editor?.isActive("underline"))}
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBulletList().run(); }}
          className={btn(editor?.isActive("bulletList"))}
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleOrderedList().run(); }}
          className={btn(editor?.isActive("orderedList"))}
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().undo().run(); }}
          disabled={!editor?.can().undo()}
          className={btn()}
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().redo().run(); }}
          disabled={!editor?.can().redo()}
          className={btn()}
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

/* ─── Availability badge ─────────────────────────────────── */
function AvailBadge({ status }: { status: string }) {
  if (status === "available")
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-farumasi-50 text-farumasi-700 border border-farumasi-200 whitespace-nowrap">
        Available
      </span>
    );
  if (status === "low_stock")
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 whitespace-nowrap">
        Low Stock
      </span>
    );
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 whitespace-nowrap">
      Out of Stock
    </span>
  );
}

/* ─── Product card (vertical, image top) ────────────────── */
function ProductCard({
  product,
  onView,
  onEdit,
}: {
  product: BackendProduct;
  onView: () => void;
  onEdit: () => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const grad    = categoryGradient(product.category);
  const catBg   = categoryBg(product.category);
  const initials = product.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "Rx";
  const desc    = parseDesc(product.description);

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-farumasi-200 transition-all duration-300 overflow-hidden flex flex-col">
      {/* Image / gradient area */}
      <div className={cn("relative h-44 overflow-hidden bg-gradient-to-br", grad)}>
        {product.image_url && !imgErr ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover"
            sizes="320px"
            onError={() => setImgErr(true)}
            unoptimized={!product.image_url.startsWith("https://images.unsplash.com")}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-xl font-black text-white">{initials}</span>
            </div>
            {product.dosage_form && (
              <span className="text-[9px] font-bold text-white/70 uppercase tracking-widest">
                {product.dosage_form}
              </span>
            )}
          </div>
        )}
        {/* Rx badge */}
        {product.prescription_required && (
          <div className="absolute top-2.5 left-2.5 bg-violet-600/90 backdrop-blur-sm text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md">
            Rx
          </div>
        )}
        {/* Category badge */}
        {product.category && (
          <div className="absolute bottom-2.5 left-2.5">
            <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-lg border bg-white/95 backdrop-blur-sm", catBg)}>
              {product.category.replace(/_/g, " ")}
            </span>
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <button
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="flex items-center gap-1.5 bg-white text-slate-800 text-xs font-bold px-3.5 py-2 rounded-xl shadow-lg hover:bg-farumasi-50 hover:text-farumasi-700 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" /> View
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="flex items-center gap-1.5 bg-farumasi-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-lg hover:bg-farumasi-700 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        </div>
      </div>

      {/* Card body */}
      <div className="px-4 pt-3.5 pb-4 flex-1 flex flex-col">
        <p className="text-[14px] font-bold text-slate-900 leading-snug line-clamp-1">{product.name}</p>
        {product.generic_name && (
          <p className="text-[11px] text-slate-400 italic mt-0.5 truncate">{product.generic_name}</p>
        )}
        {desc.short && (
          <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{desc.short}</p>
        )}
        {product.strength && (
          <span className="mt-2 self-start text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {product.strength}
          </span>
        )}
        <div className="mt-auto pt-3 flex items-end justify-between gap-2">
          {product.price_from != null && product.price_from > 0 ? (
            <p className="text-[12px] font-extrabold text-farumasi-700">
              RWF {formatPrice(product.price_from)}{product.price_to != null && product.price_to > product.price_from ? `–${formatPrice(product.price_to)}` : ""}
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 italic">No price listed</p>
          )}
          {product.listing_count != null && product.listing_count > 0 && (
            <span className="shrink-0 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap">
              {product.listing_count} {product.listing_count === 1 ? "pharmacy" : "pharmacies"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Pharmacy list modal ────────────────────────────────── */
type PharmacyModalMode = "price" | "expiry";

const SUSPEND_REASONS = [
  "Price too high",
  "Product expired",
  "Stock quality concern",
  "Regulatory violation",
  "Counterfeit risk",
  "Licence suspended",
  "Other",
] as const;

function PharmacyListModal({
  listings,
  pharmacyMap,
  mode,
  productName,
  onClose,
  onListingsChange,
}: {
  listings: BackendListing[];
  pharmacyMap: Map<string, string>;
  mode: PharmacyModalMode;
  productName: string;
  onClose: () => void;
  onListingsChange?: (updated: BackendListing[]) => void;
}) {
  const [localListings, setLocalListingsRaw] = useState(listings);
  const [actionTarget, setActionTarget] = useState<BackendListing | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>(SUSPEND_REASONS[0]);
  const [confirmAction, setConfirmAction] = useState<"suspend" | "out_of_stock" | "remove" | null>(null);
  const [working, setWorking] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  function setLocalListings(updater: BackendListing[] | ((prev: BackendListing[]) => BackendListing[])) {
    setLocalListingsRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      onListingsChange?.(next);
      return next;
    });
  }

  const sorted =
    mode === "price"
      ? [...localListings].sort((a, b) => a.price - b.price)
      : [...localListings]
          .filter((l) => l.expiry_date)
          .sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime());

  async function handleConfirm() {
    if (!actionTarget || !confirmAction) return;
    setWorking(true);
    try {
      if (confirmAction === "remove") {
        await listingsService.deleteListing(actionTarget.id);
        setLocalListings((prev) => prev.filter((l) => l.id !== actionTarget.id));
        toast.success("Listing removed");
      } else {
        const status = confirmAction === "suspend" ? "suspended" : "out_of_stock";
        const updated = await listingsService.setAvailability(actionTarget.id, status as ListingAvailability);
        setLocalListings((prev) => prev.map((l) => l.id === updated.id ? updated : l));
        toast.success(confirmAction === "suspend" ? "Listing suspended" : "Marked out of stock");
      }
    } catch {
      toast.error("Action failed — please try again");
    } finally {
      setWorking(false);
      setConfirmAction(null);
      setActionTarget(null);
    }
  }

  return (
    <>
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900">
              {mode === "price" ? "Pharmacy Prices" : "Expiry Dates by Pharmacy"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 max-w-[280px] truncate">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2" onClick={() => setOpenMenuId(null)}>
          {sorted.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No data available</p>
          ) : (
            sorted.map((l, i) => {
              const name = l.pharmacy_id
                ? (pharmacyMap.get(l.pharmacy_id) ?? "Unknown Pharmacy")
                : "Partner Wholesale";
              const isSuspended = l.availability_status === "suspended";

              return (
                <div
                  key={l.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 relative",
                    isSuspended ? "bg-red-50 border border-red-100" : "bg-slate-50",
                  )}
                >
                  {mode === "price" && (
                    <span className="text-xs font-bold text-slate-300 w-4 shrink-0">{i + 1}</span>
                  )}
                  <Building2 className={cn("w-4 h-4 shrink-0", isSuspended ? "text-red-400" : "text-slate-400")} />
                  <p className={cn("flex-1 text-sm font-medium truncate", isSuspended ? "text-red-700 line-through" : "text-slate-700")}>{name}</p>

                  {isSuspended && (
                    <span className="text-[10px] font-bold text-red-600 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full shrink-0">
                      Suspended
                    </span>
                  )}

                  {mode === "price" && !isSuspended && (
                    <>
                      <AvailBadge status={l.availability_status} />
                      <p className="text-sm font-extrabold text-farumasi-700 whitespace-nowrap ml-1">
                        RWF {l.price.toLocaleString()}
                      </p>
                    </>
                  )}

                  {mode === "expiry" && !isSuspended && (() => {
                    const expDate   = l.expiry_date ? new Date(l.expiry_date) : null;
                    const isExpired = expDate ? expDate.getTime() < Date.now() : false;
                    const daysUntil = expDate ? Math.floor((expDate.getTime() - Date.now()) / 86400000) : null;
                    const isNear    = daysUntil !== null && daysUntil < 90 && !isExpired;
                    return (
                      <>
                        <span className="text-xs text-slate-400 shrink-0">{l.stock_quantity} units</span>
                        {expDate ? (
                          <span className={cn(
                            "text-xs font-bold px-2.5 py-1 rounded-lg shrink-0",
                            isExpired ? "bg-red-50 text-red-700 border border-red-100"
                            : isNear  ? "bg-amber-50 text-amber-700 border border-amber-100"
                                      : "bg-farumasi-50 text-farumasi-700 border border-farumasi-100",
                          )}>
                            {isExpired ? "Expired" : formatDate(expDate.toISOString())}
                          </span>
                        ) : <span className="text-xs text-slate-400 italic shrink-0">No expiry set</span>}
                      </>
                    );
                  })()}

                  {/* Action menu */}
                  <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setOpenMenuId((prev) => prev === l.id ? null : l.id)}
                      className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {openMenuId === l.id && (
                      <div className="absolute right-0 top-7 z-20 bg-white rounded-2xl shadow-xl border border-slate-100 w-48 py-1.5 text-sm">
                        {!isSuspended && (
                          <button
                            onClick={() => { setActionTarget(l); setConfirmAction("suspend"); setOpenMenuId(null); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-red-50 text-red-600 font-medium transition-colors"
                          >
                            <ShieldOff className="w-4 h-4" /> Suspend Listing
                          </button>
                        )}
                        {isSuspended && (
                          <button
                            onClick={async () => {
                              setOpenMenuId(null);
                              try {
                                const updated = await listingsService.setAvailability(l.id, "available");
                                setLocalListings((prev) => prev.map((x) => x.id === updated.id ? updated : x));
                                toast.success("Listing reinstated");
                              } catch { toast.error("Failed to reinstate"); }
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-farumasi-50 text-farumasi-700 font-medium transition-colors"
                          >
                            <ShieldOff className="w-4 h-4" /> Reinstate Listing
                          </button>
                        )}
                        {!isSuspended && (
                          <button
                            onClick={() => { setActionTarget(l); setConfirmAction("out_of_stock"); setOpenMenuId(null); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-amber-50 text-amber-700 font-medium transition-colors"
                          >
                            <AlertTriangle className="w-4 h-4" /> Mark Out of Stock
                          </button>
                        )}
                        <div className="border-t border-slate-100 my-1" />
                        <button
                          onClick={() => { setActionTarget(l); setConfirmAction("remove"); setOpenMenuId(null); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-red-50 text-red-500 font-medium transition-colors"
                        >
                          <Trash2 className="w-4 h-4" /> Remove Listing
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>

    {/* Confirm action modal */}
    {confirmAction && actionTarget && (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setConfirmAction(null); setActionTarget(null); }} />
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center mx-auto",
            confirmAction === "remove" ? "bg-red-100" : confirmAction === "suspend" ? "bg-orange-100" : "bg-amber-100",
          )}>
            {confirmAction === "remove"
              ? <Trash2 className="w-6 h-6 text-red-600" />
              : confirmAction === "suspend"
              ? <ShieldOff className="w-6 h-6 text-orange-600" />
              : <AlertTriangle className="w-6 h-6 text-amber-600" />}
          </div>
          <div className="text-center">
            <h3 className="text-[15px] font-bold text-slate-900">
              {confirmAction === "remove" ? "Remove Listing" : confirmAction === "suspend" ? "Suspend Listing" : "Mark Out of Stock"}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {pharmacyMap.get(actionTarget.pharmacy_id ?? "") ?? "This pharmacy"} · {productName}
            </p>
          </div>

          {confirmAction === "suspend" && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Reason</p>
              <div className="space-y-1.5">
                {SUSPEND_REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedReason(r)}
                    className={cn(
                      "w-full text-left text-sm px-3.5 py-2 rounded-xl border transition-colors",
                      selectedReason === r
                        ? "bg-orange-50 border-orange-300 text-orange-800 font-semibold"
                        : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100",
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {confirmAction === "remove" && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 text-center">
              This permanently removes the pharmacy's listing. They can re-list later.
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { setConfirmAction(null); setActionTarget(null); }}
              className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={working}
              className={cn(
                "flex-1 h-10 rounded-xl text-white text-sm font-bold transition-colors flex items-center justify-center gap-2",
                confirmAction === "remove" ? "bg-red-600 hover:bg-red-700" : confirmAction === "suspend" ? "bg-orange-600 hover:bg-orange-700" : "bg-amber-600 hover:bg-amber-700",
                working && "opacity-70 cursor-not-allowed",
              )}
            >
              {working && <Loader2 className="w-4 h-4 animate-spin" />}
              {confirmAction === "remove" ? "Remove" : confirmAction === "suspend" ? "Suspend" : "Confirm"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

/* ─── Sales chart modal ──────────────────────────────────── */
function SalesChartModal({
  productId,
  productName,
  onClose,
}: {
  productId: string;
  productName: string;
  onClose: () => void;
}) {
  const [chartData, setChartData] = useState<{ month: string; units: number; revenue: number }[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await ordersService.getPharmacyOrders({ limit: 100 });
        if (cancelled) return;

        const now = new Date();
        const months: Record<string, { units: number; revenue: number }> = {};
        for (let i = 11; i >= 0; i--) {
          const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = d.toLocaleString("en", { month: "short", year: "2-digit" });
          months[key] = { units: 0, revenue: 0 };
        }
        for (const order of result.items) {
          for (const item of order.items) {
            if (item.product?.id === productId) {
              const key = new Date(order.created_at).toLocaleString("en", { month: "short", year: "2-digit" });
              if (key in months) {
                months[key].units   += item.quantity;
                months[key].revenue += item.total_price;
              }
            }
          }
        }
        if (!cancelled)
          setChartData(Object.entries(months).map(([month, v]) => ({ month, ...v })));
      } catch {
        if (!cancelled) toast.error("Could not load sales data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [productId]);

  const totalUnits   = chartData.reduce((s, d) => s + d.units, 0);
  const totalRevenue = chartData.reduce((s, d) => s + d.revenue, 0);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900">Sales Performance</h3>
            <p className="text-xs text-slate-400 mt-0.5 max-w-[320px] truncate">
              {productName} · Last 12 months
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-farumasi-400 animate-spin mb-3" />
            <p className="text-sm text-slate-400">Loading sales data…</p>
          </div>
        ) : (
          <div className="px-6 py-5">
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-farumasi-50 rounded-2xl px-4 py-3.5">
                <p className="text-2xl font-extrabold text-farumasi-700">{totalUnits.toLocaleString()}</p>
                <p className="text-xs font-medium text-farumasi-600 mt-0.5">Total Units Sold</p>
              </div>
              <div className="bg-slate-50 rounded-2xl px-4 py-3.5">
                <p className="text-xl font-extrabold text-slate-800">
                  RWF {Math.round(totalRevenue).toLocaleString()}
                </p>
                <p className="text-xs font-medium text-slate-500 mt-0.5">Total Revenue</p>
              </div>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#1e9e68" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1e9e68" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      fontSize: 12,
                      padding: "8px 12px",
                    }}
                    formatter={(val: number) => [val, "Units"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="units"
                    name="Units sold"
                    stroke="#1e9e68"
                    strokeWidth={2.5}
                    fill="url(#salesGrad)"
                    dot={{ fill: "#1e9e68", strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5, fill: "#1e9e68" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Product detail panel ───────────────────────────────── */
interface DetailPanelProps {
  product: BackendProduct;
  pharmacyMap: Map<string, string>;
  onClose: () => void;
  onEdit: () => void;
}

function ProductDetailPanel({ product, pharmacyMap, onClose, onEdit }: DetailPanelProps) {
  const [listings,        setListings]        = useState<BackendListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [activeModal,     setActiveModal]     = useState<null | "price" | "expiry" | "sales">(null);
  const [activeTab,       setActiveTab]       = useState<"overview" | "dosage" | "safety">("overview");

  useEffect(() => {
    let cancelled = false;
    listingsService
      .getListingsForProduct(product.id)
      .then((l) => { if (!cancelled) setListings(l); })
      .catch(() => toast.error("Could not load pharmacy data"))
      .finally(() => { if (!cancelled) setListingsLoading(false); });
    return () => { cancelled = true; };
  }, [product.id]);

  const activeListings = listings.filter((l) => l.availability_status !== "suspended");
  const prices    = activeListings.filter((l) => l.price > 0).map((l) => l.price);
  const minPrice  = prices.length ? Math.min(...prices) : null;
  const maxPrice  = prices.length ? Math.max(...prices) : null;
  const expiryTs  = activeListings.filter((l) => l.expiry_date).map((l) => new Date(l.expiry_date!).getTime());
  const nearestExp = expiryTs.length ? new Date(Math.min(...expiryTs)) : null;
  const latestExp  = expiryTs.length ? new Date(Math.max(...expiryTs)) : null;

  const grad    = categoryGradient(product.category);
  const catBg   = categoryBg(product.category);
  const initials = product.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "Rx";
  const desc    = parseDesc(product.description);

  return (
    <>
      <div className="fixed inset-0 z-50 flex" onClick={onClose}>
        <div className="flex-1 bg-black/40 backdrop-blur-[2px]" />
        <div
          className="bg-white w-full sm:w-[580px] h-full flex flex-col shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Gradient header */}
          <div className={cn("shrink-0 bg-gradient-to-br px-6 pt-5 pb-16 relative", grad)}>
            <div className="flex items-center justify-between mb-5">
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 text-white/75 hover:text-white text-xs font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit Product
              </button>
            </div>
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <span className="text-xl font-black text-white">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[18px] font-extrabold text-white leading-snug">{product.name}</h2>
                  {product.prescription_required && (
                    <span className="text-[9px] font-extrabold text-white bg-violet-600/80 px-2 py-0.5 rounded-md">
                      Rx
                    </span>
                  )}
                </div>
                {product.generic_name && (
                  <p className="text-sm text-white/70 italic mt-0.5">{product.generic_name}</p>
                )}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {product.strength && (
                    <span className="text-[10px] font-bold bg-white/20 text-white px-2.5 py-0.5 rounded-full">
                      {product.strength}
                    </span>
                  )}
                  {product.dosage_form && (
                    <span className="text-[10px] bg-white/15 text-white/80 px-2.5 py-0.5 rounded-full capitalize">
                      {product.dosage_form}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Insight cards (overlap header) */}
          <div className="px-5 -mt-8 shrink-0 z-10 relative">
            <div className="grid grid-cols-3 gap-2.5">

              {/* Pharmacies & price */}
              <button
                onClick={() => !listingsLoading && listings.length > 0 && setActiveModal("price")}
                className="bg-white rounded-2xl border border-slate-200 shadow-md p-3.5 text-left hover:shadow-lg hover:border-farumasi-200 transition-all"
              >
                <Building2 className="w-4 h-4 text-farumasi-600 mb-1.5" />
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Pharmacies</p>
                {listingsLoading ? (
                  <Loader2 className="w-3.5 h-3.5 text-slate-300 animate-spin mt-1" />
                ) : minPrice !== null ? (
                  <>
                    <p className="text-[11px] font-extrabold text-slate-900 leading-tight mt-0.5">
                      {minPrice === maxPrice ? `RWF ${minPrice!.toLocaleString()}` : `RWF ${minPrice!.toLocaleString()}–${maxPrice?.toLocaleString()}`}
                    </p>
                    <p className="text-[10px] text-farumasi-600 font-semibold mt-0.5">
                      {activeListings.length} {activeListings.length === 1 ? "pharmacy" : "pharmacies"} →
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-0.5 italic">No listings</p>
                )}
              </button>

              {/* Sales */}
              <button
                onClick={() => setActiveModal("sales")}
                className="bg-white rounded-2xl border border-slate-200 shadow-md p-3.5 text-left hover:shadow-lg hover:border-farumasi-200 transition-all"
              >
                <TrendingUp className="w-4 h-4 text-farumasi-600 mb-1.5" />
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Sales</p>
                <p className="text-[11px] font-extrabold text-slate-900 mt-0.5">View trend</p>
                <p className="text-[10px] text-farumasi-600 font-semibold mt-0.5">Last 12 months →</p>
              </button>

              {/* Expiry range */}
              <button
                onClick={() => !listingsLoading && nearestExp && setActiveModal("expiry")}
                className="bg-white rounded-2xl border border-slate-200 shadow-md p-3.5 text-left hover:shadow-lg hover:border-farumasi-200 transition-all"
              >
                <Calendar className="w-4 h-4 text-farumasi-600 mb-1.5" />
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Expiry Range</p>
                {listingsLoading ? (
                  <Loader2 className="w-3.5 h-3.5 text-slate-300 animate-spin mt-1" />
                ) : nearestExp ? (
                  <>
                    <p className="text-[11px] font-extrabold text-slate-900 leading-tight mt-0.5">
                      {formatDate(nearestExp.toISOString())}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                      → {latestExp ? formatDate(latestExp.toISOString()) : "—"}
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-0.5 italic">No expiry data</p>
                )}
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto">

            {/* Patient-facing preview */}
            {(desc.short || desc.dosage_summary) && (
              <div className="px-5 pt-5 pb-4 border-b border-slate-100">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">
                  Patient Overview
                </p>
                {desc.short && (
                  <p className="text-sm text-slate-700 leading-relaxed">{desc.short}</p>
                )}
                {desc.dosage_summary && (
                  <div className="mt-2.5 bg-farumasi-50 rounded-xl px-3.5 py-2.5 border border-farumasi-100">
                    <p className="text-[10px] font-bold text-farumasi-700 mb-0.5 uppercase tracking-wide">
                      Dosage Guide
                    </p>
                    <p className="text-sm text-farumasi-800">{desc.dosage_summary}</p>
                  </div>
                )}
              </div>
            )}

            {/* Detailed article tabs */}
            {(desc.overview || desc.dosage_details || desc.safety) && (
              <div className="px-5 pt-5 pb-4 border-b border-slate-100">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">
                  Detailed Information
                </p>
                <div className="flex gap-1.5 mb-4">
                  {(["overview", "dosage", "safety"] as const).map((tab) => {
                    const has =
                      tab === "overview" ? !!desc.overview
                      : tab === "dosage"  ? !!desc.dosage_details
                      : !!desc.safety;
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                          "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all capitalize",
                          activeTab === tab
                            ? "bg-farumasi-600 text-white shadow-sm"
                            : has
                            ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            : "bg-slate-50 text-slate-300 cursor-default",
                        )}
                      >
                        {tab === "dosage" ? "Dosage" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    );
                  })}
                </div>
                <div
                  className="rich-content"
                  dangerouslySetInnerHTML={{
                    __html:
                      activeTab === "overview"
                        ? desc.overview ||
                          "<p style='color:#94a3b8;font-style:italic;font-size:0.875rem'>No overview content yet — edit this product to add it.</p>"
                        : activeTab === "dosage"
                        ? desc.dosage_details ||
                          "<p style='color:#94a3b8;font-style:italic;font-size:0.875rem'>No dosage details yet.</p>"
                        : desc.safety ||
                          "<p style='color:#94a3b8;font-style:italic;font-size:0.875rem'>No safety information yet.</p>",
                  }}
                />
              </div>
            )}

            {/* Product metadata */}
            <div className="px-5 pt-5 pb-6">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">
                Product Details
              </p>
              <div className="space-y-2">
                {product.manufacturer && (
                  <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                    <span className="text-[11px] font-bold text-slate-400 w-24 shrink-0">Manufacturer</span>
                    <span className="flex-1 min-w-0 text-[13px] font-semibold text-slate-800 break-words">{product.manufacturer}</span>
                  </div>
                )}
                {product.category && (
                  <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                    <span className="text-[11px] font-bold text-slate-400 w-24 shrink-0">Category</span>
                    <span className={cn("min-w-0 text-[11px] font-bold px-2.5 py-0.5 rounded-full border break-words", catBg)}>
                      {product.category.replace(/_/g, " ")}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                  <span className="text-[11px] font-bold text-slate-400 w-24 shrink-0">Type</span>
                  <span className="flex-1 min-w-0 text-[13px] font-semibold text-slate-700 capitalize break-words">
                    {product.product_type.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                  <span className="text-[11px] font-bold text-slate-400 w-24 shrink-0">Prescription</span>
                  <span
                    className={cn(
                      "text-[11px] font-bold px-2.5 py-0.5 rounded-full border",
                      product.prescription_required
                        ? "bg-violet-50 text-violet-700 border-violet-200"
                        : "bg-farumasi-50 text-farumasi-700 border-farumasi-200",
                    )}
                  >
                    {product.prescription_required ? "Required (Rx)" : "Not Required (OTC)"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      {activeModal === "price" && (
        <PharmacyListModal
          listings={listings}
          pharmacyMap={pharmacyMap}
          mode="price"
          productName={product.name}
          onClose={() => setActiveModal(null)}
          onListingsChange={setListings}
        />
      )}
      {activeModal === "expiry" && (
        <PharmacyListModal
          listings={listings}
          pharmacyMap={pharmacyMap}
          mode="expiry"
          productName={product.name}
          onClose={() => setActiveModal(null)}
          onListingsChange={setListings}
        />
      )}
      {activeModal === "sales" && (
        <SalesChartModal
          productId={product.id}
          productName={product.name}
          onClose={() => setActiveModal(null)}
        />
      )}
    </>
  );
}

/* ─── Edit product drawer ────────────────────────────────── */
interface EditDrawerProps {
  product: BackendProduct;
  onClose: () => void;
  onSaved: (updated: BackendProduct) => void;
}

function EditProductDrawer({ product, onClose, onSaved }: EditDrawerProps) {
  const parsed = parseDesc(product.description);

  const [form, setForm] = useState<UpdateProductInput & { prescription_required: boolean }>({
    name:                  product.name,
    generic_name:          product.generic_name ?? "",
    strength:              product.strength ?? "",
    dosage_form:           product.dosage_form ?? "",
    manufacturer:          product.manufacturer ?? "",
    product_type:          product.product_type as CreateProductInput["product_type"],
    prescription_required: product.prescription_required,
    image_url:             product.image_url ?? "",
  });
  const [categories, setCategories] = useState<string[]>(
    () => (product.category ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  );
  const [desc,      setDesc]      = useState<ParsedDesc>(parsed);
  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);
  const [section,   setSection]   = useState<"identity" | "description">("identity");
  const imgInputRef = useRef<HTMLInputElement>(null);
  const { categories: availableCategories } = useCategoryStore();

  const setF = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [key]: val }));
  const setD = <K extends keyof ParsedDesc>(key: K, val: string) =>
    setDesc((p) => ({ ...p, [key]: val }));

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post<{ url: string }>("/uploads/image", fd);
      setF("image_url", data.url);
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) { toast.error("Product name is required"); return; }
    setSaving(true);
    try {
      const updated = await productsService.updateProduct(product.id, {
        ...form,
        name:         form.name?.trim(),
        generic_name: form.generic_name?.trim() || null,
        strength:     form.strength?.trim() || null,
        dosage_form:  form.dosage_form?.trim() || null,
        manufacturer: form.manufacturer?.trim() || null,
        category:     categories.length ? categories.join(", ") : null,
        image_url:    form.image_url?.trim() || null,
        description:  serializeDesc(desc),
      });
      onSaved(updated);
      toast.success("Product updated successfully");
    } catch {
      toast.error("Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-300 focus:border-transparent transition-all bg-white";
  const labelCls = "block text-xs font-bold text-slate-600 mb-1.5";

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 shrink-0">
        <div className="max-w-3xl mx-auto px-6 pt-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Edit Product</h3>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[340px]">{product.name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-2">
            {(
              [
                { key: "identity",    label: "Product Identity" },
                { key: "description", label: "Description"      },
              ] as const
            ).map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSection(s.key)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all",
                  section === s.key
                    ? "bg-farumasi-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-5 space-y-4">
            {section === "identity" ? (
              <>
                {/* Product Image */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Product Image</p>
                  <input
                    ref={imgInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                      e.target.value = "";
                    }}
                  />
                  {form.image_url ? (
                    <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                      <Image src={form.image_url} alt="Product image" fill className="object-contain" unoptimized />
                      <button
                        type="button"
                        onClick={() => setF("image_url", "")}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 shadow text-slate-500 hover:text-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => imgInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full h-36 rounded-xl border-2 border-dashed border-slate-200 hover:border-farumasi-300 flex flex-col items-center justify-center gap-2 transition-colors bg-slate-50 hover:bg-farumasi-50 disabled:opacity-60"
                    >
                      {uploading ? <Loader2 className="w-6 h-6 text-farumasi-400 animate-spin" /> : <ImagePlus className="w-6 h-6 text-slate-400" />}
                      <span className="text-xs font-semibold text-slate-500">
                        {uploading ? "Uploading…" : "Click to upload product image"}
                      </span>
                      <span className="text-[10px] text-slate-400">JPG, PNG, WEBP · max 10 MB</span>
                    </button>
                  )}
                  <div>
                    <label className={labelCls}>Or paste image URL</label>
                    <input
                      value={form.image_url ?? ""}
                      onChange={(e) => setF("image_url", e.target.value)}
                      placeholder="https://example.com/product.jpg"
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Basic info */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Basic Information
                  </p>
                  <div>
                    <label className={labelCls}>
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      value={form.name ?? ""}
                      onChange={(e) => setF("name", e.target.value)}
                      placeholder="e.g. Paracetamol 500mg"
                      className={inputCls}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Generic Name</label>
                      <input
                        value={form.generic_name ?? ""}
                        onChange={(e) => setF("generic_name", e.target.value)}
                        placeholder="e.g. Acetaminophen"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Strength</label>
                      <input
                        value={form.strength ?? ""}
                        onChange={(e) => setF("strength", e.target.value)}
                        placeholder="e.g. 500mg"
                        className={inputCls}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Dosage Form</label>
                      <div className="relative">
                        <select
                          value={form.dosage_form ?? ""}
                          onChange={(e) => setF("dosage_form", e.target.value)}
                          className={cn(inputCls, "pr-10 appearance-none cursor-pointer")}
                        >
                          <option value="">— Select —</option>
                          {DOSAGE_FORMS.map((f) => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Manufacturer</label>
                      <input
                        value={form.manufacturer ?? ""}
                        onChange={(e) => setF("manufacturer", e.target.value)}
                        placeholder="e.g. Cipla Ltd"
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>

                {/* Classification */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Classification
                  </p>
                  <div>
                    <label className={labelCls}>
                      Category <span className="text-slate-400 font-normal text-[10px]">(select all that apply)</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {availableCategories.map((cat) => {
                        const active = categories.includes(cat.name);
                        const CatIc = resolveIcon(cat.iconName);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() =>
                              setCategories((prev) =>
                                active ? prev.filter((x) => x !== cat.name) : [...prev, cat.name],
                              )
                            }
                            className={cn(
                              "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all",
                              active
                                ? "bg-farumasi-600 text-white border-farumasi-600 shadow-sm"
                                : "bg-white text-slate-600 border-slate-200 hover:border-farumasi-300",
                            )}
                          >
                            <CatIc className="w-3 h-3 shrink-0" />
                            {cat.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Product Type</label>
                    <div className="grid grid-cols-4 gap-2">
                      {PRODUCT_TYPES.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setF("product_type", t.value as CreateProductInput["product_type"])}
                          className={cn(
                            "py-2 rounded-xl text-xs font-semibold border transition-all",
                            form.product_type === t.value
                              ? "bg-farumasi-600 text-white border-farumasi-600 shadow-sm"
                              : "bg-white text-slate-600 border-slate-200 hover:border-farumasi-300",
                          )}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Prescription toggle */}
                  <button
                    type="button"
                    onClick={() => setF("prescription_required", !form.prescription_required)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-xl px-4 py-3.5 border cursor-pointer transition-all text-left",
                      form.prescription_required
                        ? "bg-violet-50 border-violet-200"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <div
                      className={cn(
                        "relative shrink-0 rounded-full transition-colors",
                        form.prescription_required ? "bg-violet-600" : "bg-slate-300",
                      )}
                      style={{ height: 22, width: 40 }}
                    >
                      <div
                        className={cn(
                          "absolute top-0.5 rounded-full bg-white shadow transition-transform",
                          form.prescription_required ? "translate-x-5" : "translate-x-0.5",
                        )}
                        style={{ height: 18, width: 18 }}
                      />
                    </div>
                    <div>
                      <p className={cn("text-sm font-bold", form.prescription_required ? "text-violet-800" : "text-slate-700")}>
                        Requires Prescription (Rx)
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {form.prescription_required
                          ? "Patients need a valid prescription"
                          : "Available over the counter"}
                      </p>
                    </div>
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Patient-facing content */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                      Patient Card Content
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Shown on the product card patients see in the app.
                    </p>
                  </div>
                  <div>
                    <label className={labelCls}>Short Description</label>
                    <textarea
                      value={desc.short}
                      onChange={(e) => setD("short", e.target.value)}
                      rows={3}
                      placeholder="Brief description of what this medicine treats or is used for…"
                      className={cn(inputCls, "resize-none leading-relaxed")}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Dosage Summary</label>
                    <textarea
                      value={desc.dosage_summary}
                      onChange={(e) => setD("dosage_summary", e.target.value)}
                      rows={2}
                      placeholder="e.g. Take 1–2 tablets every 4–6 hours as needed, max 8 per day."
                      className={cn(inputCls, "resize-none leading-relaxed")}
                    />
                  </div>
                </div>

                {/* Rich article sections */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                      Detailed Article
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Comprehensive information shown in the product detail view.
                    </p>
                  </div>
                  <div>
                    <label className={cn(labelCls, "flex items-center gap-2")}>
                      <span className="w-2 h-2 rounded-full bg-farumasi-500 shrink-0" /> Overview
                    </label>
                    <RichEditor
                      initialContent={desc.overview}
                      onChange={(html) => setD("overview", html)}
                      placeholder="Write an overview — what this medicine is, what it treats, how it works…"
                    />
                  </div>
                  <div>
                    <label className={cn(labelCls, "flex items-center gap-2")}>
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" /> Dosage &amp; Administration
                    </label>
                    <RichEditor
                      initialContent={desc.dosage_details}
                      onChange={(html) => setD("dosage_details", html)}
                      placeholder="Recommended dosage, administration route, timing, and missed-dose guidance…"
                    />
                  </div>
                  <div>
                    <label className={cn(labelCls, "flex items-center gap-2")}>
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" /> Safety &amp; Warnings
                    </label>
                    <RichEditor
                      initialContent={desc.safety}
                      onChange={(html) => setD("safety", html)}
                      placeholder="Contraindications, side effects, drug interactions, and special warnings…"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="bg-white border-t border-slate-100 shrink-0">
            <div className="max-w-3xl mx-auto px-6 pb-6 pt-3 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-farumasi-600 text-white text-sm font-bold hover:bg-farumasi-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
    </div>
  );
}

/* ─── Add product drawer ─────────────────────────────────── */
interface AddDrawerProps {
  onClose: () => void;
  onCreated: (product: BackendProduct) => void;
}

function AddProductDrawer({ onClose, onCreated }: AddDrawerProps) {
  const [form, setForm] = useState<CreateProductInput>({
    name: "", generic_name: "",
    product_type: "medicine", dosage_form: "", strength: "",
    manufacturer: "", prescription_required: false, image_url: "",
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [desc,      setDesc]      = useState<ParsedDesc>({ short: "", dosage_summary: "", overview: "", dosage_details: "", safety: "" });
  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);
  const [section,   setSection]   = useState<"identity" | "description">("identity");
  const imgInputRef = useRef<HTMLInputElement>(null);
  const { categories: availableCategories } = useCategoryStore();

  const set = <K extends keyof CreateProductInput>(key: K, val: CreateProductInput[K]) =>
    setForm((p) => ({ ...p, [key]: val }));
  const setD = <K extends keyof ParsedDesc>(key: K, val: string) =>
    setDesc((p) => ({ ...p, [key]: val }));

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post<{ url: string }>("/uploads/image", fd);
      set("image_url", data.url);
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Product name is required"); return; }
    setSaving(true);
    try {
      const created = await productsService.createProduct({
        ...form,
        name:         form.name.trim(),
        generic_name: form.generic_name?.trim() || null,
        category:     categories.length ? categories.join(", ") : null,
        dosage_form:  form.dosage_form?.trim() || null,
        strength:     form.strength?.trim() || null,
        manufacturer: form.manufacturer?.trim() || null,
        image_url:    form.image_url?.trim() || null,
        description:  serializeDesc(desc),
      });
      onCreated(created);
    } catch {
      toast.error("Failed to add product to catalogue");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-300 focus:border-transparent transition-all bg-white";
  const labelCls = "block text-xs font-bold text-slate-600 mb-1.5";

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 shrink-0">
        <div className="max-w-3xl mx-auto px-6 pt-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Add New Product</h3>
              <p className="text-xs text-slate-400 mt-0.5">Submit to the catalogue for partner pharmacies to stock.</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-2">
            {(
              [
                { key: "identity",    label: "Product Identity" },
                { key: "description", label: "Description"      },
              ] as const
            ).map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSection(s.key)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all",
                  section === s.key
                    ? "bg-farumasi-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-5 space-y-4">
            {section === "identity" ? (
              <>
                {/* Product Image */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Product Image</p>
                  <input
                    ref={imgInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                      e.target.value = "";
                    }}
                  />
                  {form.image_url ? (
                    <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                      <Image src={form.image_url} alt="Product image" fill className="object-contain" unoptimized />
                      <button
                        type="button"
                        onClick={() => set("image_url", "")}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 shadow text-slate-500 hover:text-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => imgInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full h-36 rounded-xl border-2 border-dashed border-slate-200 hover:border-farumasi-300 flex flex-col items-center justify-center gap-2 transition-colors bg-slate-50 hover:bg-farumasi-50 disabled:opacity-60"
                    >
                      {uploading ? <Loader2 className="w-6 h-6 text-farumasi-400 animate-spin" /> : <ImagePlus className="w-6 h-6 text-slate-400" />}
                      <span className="text-xs font-semibold text-slate-500">
                        {uploading ? "Uploading…" : "Click to upload product image"}
                      </span>
                      <span className="text-[10px] text-slate-400">JPG, PNG, WEBP · max 10 MB</span>
                    </button>
                  )}
                  <div>
                    <label className={labelCls}>Or paste image URL</label>
                    <input
                      value={form.image_url ?? ""}
                      onChange={(e) => set("image_url", e.target.value)}
                      placeholder="https://example.com/product.jpg"
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Basic info */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Basic Information
                  </p>
                  <div>
                    <label className={labelCls}>
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="e.g. Paracetamol 500mg"
                      className={inputCls}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Generic Name</label>
                      <input
                        value={form.generic_name ?? ""}
                        onChange={(e) => set("generic_name", e.target.value)}
                        placeholder="e.g. Acetaminophen"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Strength</label>
                      <input
                        value={form.strength ?? ""}
                        onChange={(e) => set("strength", e.target.value)}
                        placeholder="e.g. 500mg"
                        className={inputCls}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Dosage Form</label>
                      <div className="relative">
                        <select
                          value={form.dosage_form ?? ""}
                          onChange={(e) => set("dosage_form", e.target.value)}
                          className={cn(inputCls, "pr-10 appearance-none cursor-pointer")}
                        >
                          <option value="">— Select —</option>
                          {DOSAGE_FORMS.map((f) => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Manufacturer</label>
                      <input
                        value={form.manufacturer ?? ""}
                        onChange={(e) => set("manufacturer", e.target.value)}
                        placeholder="e.g. Cipla Ltd"
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>

                {/* Classification */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Classification
                  </p>
                  <div>
                    <label className={labelCls}>
                      Category <span className="text-slate-400 font-normal text-[10px]">(select all that apply)</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {availableCategories.map((cat) => {
                        const active = categories.includes(cat.name);
                        const CatIc = resolveIcon(cat.iconName);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() =>
                              setCategories((prev) =>
                                active ? prev.filter((x) => x !== cat.name) : [...prev, cat.name],
                              )
                            }
                            className={cn(
                              "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all",
                              active
                                ? "bg-farumasi-600 text-white border-farumasi-600 shadow-sm"
                                : "bg-white text-slate-600 border-slate-200 hover:border-farumasi-300",
                            )}
                          >
                            <CatIc className="w-3 h-3 shrink-0" />
                            {cat.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Product Type</label>
                    <div className="grid grid-cols-4 gap-2">
                      {PRODUCT_TYPES.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => set("product_type", t.value as CreateProductInput["product_type"])}
                          className={cn(
                            "py-2 rounded-xl text-xs font-semibold border transition-all",
                            form.product_type === t.value
                              ? "bg-farumasi-600 text-white border-farumasi-600 shadow-sm"
                              : "bg-white text-slate-600 border-slate-200 hover:border-farumasi-300",
                          )}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => set("prescription_required", !form.prescription_required)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-xl px-4 py-3.5 border cursor-pointer transition-all text-left",
                      form.prescription_required
                        ? "bg-violet-50 border-violet-200"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <div
                      className={cn(
                        "relative shrink-0 rounded-full transition-colors",
                        form.prescription_required ? "bg-violet-600" : "bg-slate-300",
                      )}
                      style={{ height: 22, width: 40 }}
                    >
                      <div
                        className={cn(
                          "absolute top-0.5 rounded-full bg-white shadow transition-transform",
                          form.prescription_required ? "translate-x-5" : "translate-x-0.5",
                        )}
                        style={{ height: 18, width: 18 }}
                      />
                    </div>
                    <div>
                      <p className={cn("text-sm font-bold", form.prescription_required ? "text-violet-800" : "text-slate-700")}>
                        Requires Prescription (Rx)
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {form.prescription_required
                          ? "Patients need a valid prescription"
                          : "Available over the counter"}
                      </p>
                    </div>
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Patient-facing content */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                      Patient Card Content
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Shown on the product card patients see in the app.
                    </p>
                  </div>
                  <div>
                    <label className={labelCls}>Short Description</label>
                    <textarea
                      value={desc.short ?? ""}
                      onChange={(e) => setD("short", e.target.value)}
                      rows={3}
                      placeholder="Brief description of what this medicine treats or is used for…"
                      className={cn(inputCls, "resize-none leading-relaxed")}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Dosage Summary</label>
                    <textarea
                      value={desc.dosage_summary ?? ""}
                      onChange={(e) => setD("dosage_summary", e.target.value)}
                      rows={2}
                      placeholder="e.g. Take 1–2 tablets every 4–6 hours as needed, max 8 per day."
                      className={cn(inputCls, "resize-none leading-relaxed")}
                    />
                  </div>
                </div>

                {/* Rich article sections */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                      Detailed Article
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Comprehensive information shown in the product detail view.
                    </p>
                  </div>
                  <div>
                    <label className={cn(labelCls, "flex items-center gap-2")}>
                      <span className="w-2 h-2 rounded-full bg-farumasi-500 shrink-0" /> Overview
                    </label>
                    <RichEditor
                      initialContent={desc.overview}
                      onChange={(html) => setD("overview", html)}
                      placeholder="Write an overview — what this medicine is, what it treats, how it works…"
                    />
                  </div>
                  <div>
                    <label className={cn(labelCls, "flex items-center gap-2")}>
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" /> Dosage &amp; Administration
                    </label>
                    <RichEditor
                      initialContent={desc.dosage_details}
                      onChange={(html) => setD("dosage_details", html)}
                      placeholder="Recommended dosage, administration route, timing, and missed-dose guidance…"
                    />
                  </div>
                  <div>
                    <label className={cn(labelCls, "flex items-center gap-2")}>
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" /> Safety &amp; Warnings
                    </label>
                    <RichEditor
                      initialContent={desc.safety}
                      onChange={(html) => setD("safety", html)}
                      placeholder="Contraindications, side effects, drug interactions, and special warnings…"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="bg-white border-t border-slate-100 shrink-0">
            <div className="max-w-3xl mx-auto px-6 pb-6 pt-3 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-farumasi-600 text-white text-sm font-bold hover:bg-farumasi-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? "Adding…" : "Add to Catalogue"}
              </button>
            </div>
          </div>
        </form>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function InventoryPage() {
  const [products,      setProducts]      = useState<BackendProduct[]>([]);
  const [pharmacyMap,   setPharmacyMap]   = useState<Map<string, string>>(new Map());
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [category,      setCategory]      = useState("All");
  const [showAdd,        setShowAdd]        = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const router = useRouter();
  const { categories: storedCategories } = useCategoryStore();

  const chipRef = useRef<HTMLDivElement>(null);

  const scrollChips = (dir: "l" | "r") =>
    chipRef.current?.scrollBy({ left: dir === "l" ? -160 : 160, behavior: "smooth" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [prodResult, pharmResult] = await Promise.all([
          productsService.searchProducts({ limit: 100 }),
          pharmaciesService.listAll(),
        ]);
        if (cancelled) return;
        setProducts(prodResult.items);
        setPharmacyMap(new Map(pharmResult.items.map((p: BackendPharmacy) => [p.id, p.name])));
      } catch {
        if (!cancelled) toast.error("Could not load products");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let list = [...products];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category ?? "").toLowerCase().includes(q) ||
          (p.generic_name ?? "").toLowerCase().includes(q) ||
          (p.manufacturer ?? "").toLowerCase().includes(q),
      );
    }
    if (category !== "All")
      list = list.filter((p) =>
        (p.category ?? "").toLowerCase().includes(category.toLowerCase()),
      );
    return list;
  }, [products, search, category]);

  if (showAdd) {
    return (
      <AddProductDrawer
        onClose={() => setShowAdd(false)}
        onCreated={(p) => {
          setProducts((prev) => [p, ...prev]);
          setShowAdd(false);
          toast.success(`"${p.name}" added to catalogue`);
        }}
      />
    );
  }

  if (showCategories) {
    return (
      <CategoryManagerPage onClose={() => setShowCategories(false)} />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex flex-col gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search medicines, generics, manufacturers…"
              className="w-full h-10 pl-10 pr-9 rounded-xl bg-slate-100 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-200 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-farumasi-600 hover:bg-farumasi-700 text-white text-sm font-bold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
          <button
            onClick={() => setShowCategories(true)}
            className="shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-farumasi-300 hover:text-farumasi-700 text-slate-600 text-sm font-bold transition-colors"
          >
            <Layers className="w-4 h-4" /> Categories
          </button>
        </div>

        {/* Category chips */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => scrollChips("l")}
            className="shrink-0 p-1 text-farumasi-600 hover:bg-farumasi-50 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div ref={chipRef} className="flex gap-2 overflow-x-auto scrollbar-hide flex-1">
            {["All", ...storedCategories.map((c) => c.name)].map((catName, i) => {
              const catObj = i === 0 ? null : storedCategories[i - 1];
              const Ic = catObj ? resolveIcon(catObj.iconName) : null;
              return (
                <button
                  key={catName}
                  onClick={() => setCategory(catName)}
                  className={cn(
                    "shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap",
                    category === catName
                      ? "bg-farumasi-600 text-white border-farumasi-600 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:border-farumasi-300 hover:text-farumasi-700",
                  )}
                >
                  {Ic && <Ic className="w-3 h-3 shrink-0" />}
                  {catName}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => scrollChips("r")}
            className="shrink-0 p-1 text-farumasi-600 hover:bg-farumasi-50 rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Count bar */}
      {!loading && (
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-2 shrink-0">
          <p className="text-xs text-slate-500">
            Showing{" "}
            <span className="font-bold text-slate-700">{filtered.length}</span> of{" "}
            <span className="font-bold text-slate-700">{products.length}</span> products
            {category !== "All" && (
              <span className="text-farumasi-600 font-semibold"> · {category}</span>
            )}
          </p>
        </div>
      )}

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="py-24 flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-farumasi-400 animate-spin mb-3" />
            <p className="text-slate-500 text-sm">Loading catalogue…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 flex flex-col items-center text-center">
            <Package className="w-14 h-14 text-slate-200 mb-3" />
            <p className="text-slate-700 font-bold text-base">
              {products.length === 0
                ? "No products in catalogue yet"
                : "No products match your search"}
            </p>
            {products.length === 0 && (
              <button
                onClick={() => setShowAdd(true)}
                className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-farumasi-600 text-white text-sm font-bold hover:bg-farumasi-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add First Product
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onView={() => router.push(`/inventory/${product.id}`)}
                onEdit={() => router.push(`/inventory/${product.id}?edit=1`)}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

