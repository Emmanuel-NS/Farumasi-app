import api from "@/lib/api";
import { getSellerMeBase } from "@/lib/seller-api";

export interface SellerEntityBrief {
  id: string;
  name: string;
  kind: "pharmacy" | "partner_company";
  is_open: boolean;
}

export interface SellerProfileBrief {
  name: string;
  kind: "pharmacy" | "partner_company";
}

export interface SellerOpenStatus {
  is_open: boolean;
  entities: SellerEntityBrief[];
}

export const sellerService = {
  async getProfileBrief(): Promise<SellerProfileBrief | null> {
    try {
      const base = getSellerMeBase();
      const { data } = await api.get<{ name: string }>(base);
      if (!data?.name) return null;
      return {
        name: data.name,
        kind: base === "/pharmacies/me" ? "pharmacy" : "partner_company",
      };
    } catch {
      return null;
    }
  },

  async getOpenStatus(): Promise<SellerOpenStatus> {
    const { data } = await api.get<SellerOpenStatus>("/sellers/me/open-status");
    return data;
  },

  async setOpen(isOpen: boolean): Promise<SellerOpenStatus> {
    const { data } = await api.patch<SellerOpenStatus>("/sellers/me/open-status", {
      is_open: isOpen,
    });
    return data;
  },
};
