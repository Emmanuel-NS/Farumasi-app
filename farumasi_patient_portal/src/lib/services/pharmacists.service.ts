import api from "@/lib/api";
import type { Pharmacist, PharmacistStatus } from "@/types";

interface BackendPharmacistUser {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  profile_image_url?: string;
  last_login_at?: string | null;
}

interface BackendPharmacist {
  id: string;
  user_id: string;
  specialization?: string;
  years_of_experience?: number;
  bio?: string;
  status: string;
  availability_status?: string;
  user: BackendPharmacistUser;
}

interface PaginatedPharmacists {
  items: BackendPharmacist[];
  total: number;
  offset: number;
  limit: number;
}

/**
 * Real presence = pharmacist's declared availability gated by recent activity.
 * If they set themselves "available" or "busy" but the backend hasn't seen
 * them in PRESENCE_TTL_MS, they're treated as offline (stale).
 */
const PRESENCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function derivePresence(
  availability: string | undefined,
  lastLoginAt: string | null | undefined,
): PharmacistStatus {
  const declared = (availability ?? "offline").toLowerCase();
  if (declared !== "available" && declared !== "busy") return "offline";
  if (!lastLoginAt) return "offline";
  const last = Date.parse(lastLoginAt);
  if (Number.isNaN(last)) return "offline";
  if (Date.now() - last > PRESENCE_TTL_MS) return "offline";
  return declared as PharmacistStatus;
}

function adapt(p: BackendPharmacist): Pharmacist {
  return {
    // Use the user_id so this matches Consultation.pharmacist_id (FK to User.id).
    id: p.user_id,
    name: p.user.full_name,
    specialty: p.specialization ?? "General Pharmacy",
    imageUrl: p.user.profile_image_url ?? "",
    organization: undefined,
    status: derivePresence(p.availability_status, p.user.last_login_at),
    yearsExperience: p.years_of_experience ?? undefined,
    rating: undefined,
    bio: p.bio ?? undefined,
    email: p.user.email ?? undefined,
    phone: p.user.phone ?? undefined,
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
