import api from "@/lib/api";

export interface SellerEntityBrief {
  id: string;
  name: string;
  kind: "pharmacy" | "partner_company";
  is_open: boolean;
}

export interface SellerOpenStatus {
  is_open: boolean;
  entities: SellerEntityBrief[];
}

export const sellerService = {
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
