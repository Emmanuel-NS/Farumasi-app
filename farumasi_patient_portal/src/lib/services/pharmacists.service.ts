import api from "@/lib/api";
import type { Pharmacist, PharmacistStatus } from "@/types";

interface BackendPharmacistUser {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  profile_image_url?: string;
}

interface BackendPharmacist {
  id: string;
  user_id: string;
  specialization?: string;
  years_of_experience?: number;
  bio?: string;
  status: string;
  user: BackendPharmacistUser;
}

interface PaginatedPharmacists {
  items: BackendPharmacist[];
  total: number;
  offset: number;
  limit: number;
}

/** Map backend status → frontend PharmacistStatus */
function mapStatus(s: string): PharmacistStatus {
  if (s === "active" || s === "available") return "available";
  if (s === "busy") return "busy";
  return "offline";
}

function adapt(p: BackendPharmacist): Pharmacist {
  return {
    id: p.id,
    name: p.user.full_name,
    specialty: p.specialization ?? "General Pharmacy",
    imageUrl: p.user.profile_image_url ?? "",
    organization: "FARUMASI",
    status: mapStatus(p.status),
    yearsExperience: p.years_of_experience ?? 1,
    rating: 4.5,
  };
}

export const pharmacistsService = {
  async list(limit = 20): Promise<Pharmacist[]> {
    try {
      const { data } = await api.get<PaginatedPharmacists>("/pharmacists/", {
        params: { limit },
      });
      return (data.items ?? []).map(adapt);
    } catch {
      return [];
    }
  },
};
