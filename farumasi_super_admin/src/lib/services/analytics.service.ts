import api from "@/lib/api";

export interface AdminSummary {
  total_users: number;
  total_patients: number;
  total_doctors: number;
  total_pharmacies: number;
  total_riders: number;
  total_orders: number;
  completed_orders: number;
  total_prescriptions: number;
  available_revenue_net: number;
  pending_withdrawals: number;
}

export const analyticsService = {
  async getAdminSummary(): Promise<AdminSummary> {
    const { data } = await api.get<AdminSummary>("/analytics/admin");
    return data;
  },
};
