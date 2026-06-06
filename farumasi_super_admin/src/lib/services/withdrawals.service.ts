import api from "@/lib/api";

import type { WithdrawalRequest } from "@/types";

export interface BackendWithdrawal {
  id: string;
  requester_user_id: string;
  pharmacy_id?: string | null;
  partner_company_id?: string | null;
  amount: number;
  payout_method: string;
  payout_details?: Record<string, unknown> | null;
  status: string;
  admin_notes?: string | null;
  processed_by_user_id?: string | null;
  created_at: string;
  processed_at?: string | null;
  payment_reference?: string | null;
  payment_proof_url?: string | null;
  requester_name?: string | null;
  requester_email?: string | null;
  seller_name?: string | null;
  seller_kind?: string | null;
  payout_account?: string | null;
  payout_account_name?: string | null;
}

const STATUS_MAP: Record<string, WithdrawalRequest["status"]> = {
  pending: "Pending",
  under_review: "Under Review",
  approved: "Approved",
  processing: "Processing",
  rejected: "Rejected",
  paid: "Paid",
  completed: "Paid",
};

function payoutLabel(method: string): WithdrawalRequest["method"] {
  if (method === "mobile_money") return "Mobile Money";
  if (method === "airtel_money") return "Airtel Money";
  if (method === "momo_code") return "MoMo Code";
  return "Bank Transfer";
}

function adapt(w: BackendWithdrawal): WithdrawalRequest {
  const isPartner = w.seller_kind === "partner_company" || Boolean(w.partner_company_id);
  const entityId = w.partner_company_id ?? w.pharmacy_id ?? w.requester_user_id;
  const entityName =
    w.seller_name
    ?? (isPartner && w.partner_company_id
      ? `Company ${w.partner_company_id.slice(0, 8)}…`
      : w.pharmacy_id
        ? `Pharmacy ${w.pharmacy_id.slice(0, 8)}…`
        : "Unknown seller");

  const payoutAccount =
    w.payout_account
    ?? (w.payout_details as { account?: string } | null)?.account
    ?? undefined;

  return {
    id: w.id,
    entityId,
    entityType: isPartner ? "Partner Company" : "Pharmacy",
    entityName,
    amount: w.amount,
    status: STATUS_MAP[w.status] ?? "Pending",
    requestedAt: w.created_at,
    processedAt: w.processed_at ?? undefined,
    processedBy: w.processed_by_user_id ?? undefined,
    notes: w.admin_notes ?? undefined,
    paymentReference: w.payment_reference ?? undefined,
    paymentProofUrl: w.payment_proof_url ?? undefined,
    method: payoutLabel(w.payout_method),
    payoutAccount,
    payoutAccountName: w.payout_account_name ?? undefined,
    requesterName: w.requester_name ?? undefined,
    requesterEmail: w.requester_email ?? undefined,
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

  async markPaid(
    id: string,
    payload?: { payment_reference?: string; payment_proof_url?: string; notes?: string },
  ): Promise<WithdrawalRequest> {
    const { data } = await api.patch<BackendWithdrawal>(`/withdrawals/${id}/mark-paid`, payload ?? {});
    return adapt(data);
  },
};
