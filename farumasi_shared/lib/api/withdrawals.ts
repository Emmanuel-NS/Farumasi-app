import { getClient } from "./client";
import type { WithdrawalOut } from "./types";

export const withdrawalsApi = {
  /** Finance admin: list all withdrawals. */
  listAll: (params?: { status?: string }) =>
    getClient().get<WithdrawalOut[]>("/withdrawals/", { params }),
  getById: (id: string) => getClient().get<WithdrawalOut>(`/withdrawals/${id}`),
  approve: (id: string) => getClient().patch<WithdrawalOut>(`/withdrawals/${id}/approve`),
  reject: (id: string, reason?: string) =>
    getClient().patch<WithdrawalOut>(`/withdrawals/${id}/reject`, { reason }),
  markPaid: (id: string, payload?: { transaction_reference?: string }) =>
    getClient().patch<WithdrawalOut>(`/withdrawals/${id}/mark-paid`, payload),
};
