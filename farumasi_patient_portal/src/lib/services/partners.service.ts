import api from "@/lib/api";

import type { BackendPharmacy } from "@/lib/services/pharmacies.service";



export interface PublicPartner {

  id: string;

  name: string;

  company_type?: string | null;

  district?: string | null;

  logo_url?: string | null;

  description?: string | null;

  is_open: boolean;

  latitude?: number | null;

  longitude?: number | null;

}



export interface ListingPartnerBrief {

  id: string;

  name: string;

  company_type?: string | null;

  district?: string | null;

  logo_url?: string | null;

  description?: string | null;

  is_open: boolean;

}



/** Map public partner company to pharmacy-card shape for the store carousel. */

export function partnerAsStoreSeller(p: PublicPartner): BackendPharmacy {

  return {

    id: p.id,

    name: p.name,

    address: p.description?.slice(0, 120) ?? "",

    district: p.district ?? "Rwanda",

    latitude: p.latitude ?? null,

    longitude: p.longitude ?? null,

    phone: null,

    email: null,

    license_number: null,

    is_open: p.is_open,

    accepts_delivery: false,

    created_at: "",

    image_url: p.logo_url ?? null,

    sellerKind: "partner",

  };

}



type PartnerRow = {

  id: string;

  name: string;

  company_type?: string | null;

  district?: string | null;

  logo_url?: string | null;

  description?: string | null;

  address?: string | null;

  is_open?: boolean;

  latitude?: number | null;

  longitude?: number | null;

  status?: string;

};



function toPublicPartner(p: PartnerRow): PublicPartner {

  return {

    id: p.id,

    name: p.name,

    company_type: p.company_type ?? null,

    district: p.district ?? null,

    logo_url: p.logo_url ?? null,

    description: p.description ?? p.address ?? null,

    is_open: p.is_open !== false,

    latitude: p.latitude ?? null,

    longitude: p.longitude ?? null,

  };

}



export const partnersService = {

  async listPublic(offset = 0, limit = 100): Promise<PublicPartner[]> {

    try {

      const { data } = await api.get<{ items: PublicPartner[]; total: number }>("/partners/public/", {

        params: { offset, limit },

      });

      return data.items;

    } catch {

      const { data } = await api.get<{ items: PartnerRow[]; total: number }>("/partners/", {

        params: { offset, limit },

      });

      return data.items

        .filter((p) => p.status === "active")

        .map(toPublicPartner);

    }

  },

};

