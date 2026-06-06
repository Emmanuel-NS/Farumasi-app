import api from "@/lib/api";
import type { RevenueRecord } from "@/types";

export interface BackendRevenueRecord {
  id: string;
  order_id: string;
  order_code?: string | null;
  order_status?: string | null;
  partner_type: string;
  pharmacy_id?: string | null;
  partner_company_id?: string | null;
  gross_amount: number;
  platform_commission: number;
  net_amount: number;
  status: string;
  created_at: string;
}

export interface RevenueSummary {
  total_gross: number;
  total_commission: number;
  total_net: number;
  gross_revenue?: number;
  platform_commission?: number;
  net_revenue?: number;
  available_balance?: number;
  pending_balance?: number;
  withdrawn_total?: number;
  pending_withdrawals?: number;
  paid_withdrawals?: number;
  total_orders?: number;
  completed_orders?: number;
  pending_settlement_count?: number;
  available_settlement_count?: number;
  withdrawn_settlement_count?: number;
}

function normalizeSummary(data: RevenueSummary): RevenueSummary {
  return {
    ...data,
    total_gross: data.total_gross ?? data.gross_revenue ?? 0,
    total_commission: data.total_commission ?? data.platform_commission ?? 0,
    total_net: data.total_net ?? data.net_revenue ?? 0,
    pending_settlement_count: data.pending_settlement_count ?? 0,
    available_settlement_count: data.available_settlement_count ?? 0,
    withdrawn_settlement_count: data.withdrawn_settlement_count ?? 0,
    pending_withdrawals: data.pending_withdrawals ?? 0,
    paid_withdrawals: data.paid_withdrawals ?? 0,
  };
}

function statusLabel(status: string): RevenueRecord["status"] {
  const s = status.toLowerCase();
  if (s === "available" || s === "withdrawn") return "Settled";
  if (s === "reversed" || s === "disputed") return "Disputed";
  return "Pending";
}

function sourceLabel(r: BackendRevenueRecord): string {
  if (r.order_code) return r.order_code;
  if (r.order_id) return `Order ${r.order_id.slice(0, 8).toUpperCase()}`;
  return r.partner_type === "pharmacy" ? "Pharmacy revenue" : "Partner revenue";
}

function adapt(r: BackendRevenueRecord): RevenueRecord {
  return {
    id: r.id,
    source: sourceLabel(r),
    sourceType: "Order",
    amount: r.gross_amount,
    commission: r.platform_commission,
    date: r.created_at,
    status: statusLabel(r.status),
  };
}

export const revenueService = {
  async getRevenue(params?: { offset?: number; limit?: number }): Promise<RevenueRecord[]> {
    const { data } = await api.get<BackendRevenueRecord[]>("/revenue/", { params: { limit: 100, ...params } });
    return data.map(adapt);
  },

  async getSummary(): Promise<RevenueSummary> {
    const { data } = await api.get<RevenueSummary>("/revenue/summary");
    return normalizeSummary(data);
  },
};
