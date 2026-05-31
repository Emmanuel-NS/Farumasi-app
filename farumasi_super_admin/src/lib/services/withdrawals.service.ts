import api from "@/lib/api";
import type { WithdrawalRequest } from "@/types";

export interface BackendWithdrawal {
  id: string;
  requested_by?: string | null;
  amount: number;
  status: string;
  payment_method?: string | null;
  notes?: string | null;
  created_at: string;
  processed_at?: string | null;
  processed_by?: string | null;
  pharmacy?: { id: string; name: string } | null;
}

const STATUS_MAP: Record<string, WithdrawalRequest["status"]> = {
  pending: "Pending", under_review: "Under Review", approved: "Approved",
  rejected: "Rejected", paid: "Processed",
};

function adapt(w: BackendWithdrawal): WithdrawalRequest {
  return {
    id: w.id,
    entityId: w.pharmacy?.id ?? w.requested_by ?? "",
    entityType: "Pharmacy",
    entityName: w.pharmacy?.name ?? "Unknown",
    amount: w.amount,
    status: STATUS_MAP[w.status] ?? "Pending",
    requestedAt: w.created_at,
    processedAt: w.processed_at ?? undefined,
    processedBy: w.processed_by ?? undefined,
    notes: w.notes ?? undefined,
    method: (w.payment_method === "mobile_money" ? "Mobile Money"
           : w.payment_method === "airtel_money" ? "Airtel Money"
           : "Bank Transfer") as WithdrawalRequest["method"],
  };
}

export const withdrawalsService = {
  async getWithdrawals(): Promise<WithdrawalRequest[]> {
    const { data } = await api.get<BackendWithdrawal[]>("/withdrawals/");
    return data.map(adapt);
  },

  async approve(id: string, notes?: string): Promise<WithdrawalRequest> {
    const { data } = await api.patch<BackendWithdrawal>(`/withdrawals/${id}/approve`, { notes });
    return adapt(data);
  },

  async reject(id: string, notes?: string): Promise<WithdrawalRequest> {
    const { data } = await api.patch<BackendWithdrawal>(`/withdrawals/${id}/reject`, { notes });
    return adapt(data);
  },

  async markPaid(id: string): Promise<WithdrawalRequest> {
    const { data } = await api.patch<BackendWithdrawal>(`/withdrawals/${id}/mark-paid`);
    return adapt(data);
  },
};
