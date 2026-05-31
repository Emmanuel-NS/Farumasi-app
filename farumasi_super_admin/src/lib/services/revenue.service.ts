import api from "@/lib/api";
import type { RevenueRecord } from "@/types";

export interface BackendRevenueRecord {
  id: string;
  order_id?: string | null;
  pharmacy_id?: string | null;
  gross_amount: number;
  platform_commission: number;
  net_amount: number;
  status: string;
  recorded_at: string;
}

export interface RevenueSummary {
  total_gross: number;
  total_commission: number;
  total_net: number;
  settled_count: number;
  pending_count: number;
}

function adapt(r: BackendRevenueRecord): RevenueRecord {
  return {
    id: r.id,
    source: r.order_id ?? r.pharmacy_id ?? "Platform",
    sourceType: "Order",
    amount: r.gross_amount,
    commission: r.platform_commission,
    date: r.recorded_at,
    status: r.status === "settled" ? "Settled" : r.status === "disputed" ? "Disputed" : "Pending",
  };
}

export const revenueService = {
  async getRevenue(params?: { offset?: number; limit?: number }): Promise<RevenueRecord[]> {
    const { data } = await api.get<BackendRevenueRecord[]>("/revenue/", { params: { limit: 50, ...params } });
    return data.map(adapt);
  },

  async getSummary(): Promise<RevenueSummary> {
    const { data } = await api.get<RevenueSummary>("/revenue/summary");
    return data;
  },
};
