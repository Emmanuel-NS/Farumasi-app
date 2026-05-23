import { getClient } from "./client";
import type {
  OrderOut,
  PaginatedResponse,
  PartnerCompanyOut,
  ProductListingOut,
  RevenueRecordOut,
  RevenueSummary,
  WithdrawalOut,
} from "./types";

export const partnersApi = {
  list: (params?: { page?: number; page_size?: number }) =>
    getClient().get<PaginatedResponse<PartnerCompanyOut>>("/partners/", { params }),
  getById: (id: string) => getClient().get<PartnerCompanyOut>(`/partners/${id}`),

  me: () => getClient().get<PartnerCompanyOut>("/partners/me"),
  updateMe: (payload: Partial<PartnerCompanyOut>) =>
    getClient().patch<PartnerCompanyOut>("/partners/me", payload),
  create: (payload: Partial<PartnerCompanyOut>) =>
    getClient().post<PartnerCompanyOut>("/partners/", payload),

  listListings: (params?: { page?: number; page_size?: number }) =>
    getClient().get<PaginatedResponse<ProductListingOut>>("/partners/me/listings", { params }),
  createListing: (payload: Partial<ProductListingOut>) =>
    getClient().post<ProductListingOut>("/partners/me/listings", payload),

  listOrders: (params?: { page?: number; page_size?: number; status?: string }) =>
    getClient().get<PaginatedResponse<OrderOut>>("/partners/me/orders", { params }),
  updateOrderStatus: (orderId: string, status: string) =>
    getClient().patch<OrderOut>(`/partners/me/orders/${orderId}/status`, { status }),

  listRevenue: () => getClient().get<RevenueRecordOut[]>("/partners/me/revenue"),
  revenueSummary: () => getClient().get<RevenueSummary>("/partners/me/revenue/summary"),

  listWithdrawals: () => getClient().get<WithdrawalOut[]>("/partners/me/withdrawals"),
  requestWithdrawal: (payload: {
    amount: number;
    payout_method?: string;
    payout_details?: Record<string, unknown>;
  }) => getClient().post<WithdrawalOut>("/partners/me/withdrawals", payload),
};
