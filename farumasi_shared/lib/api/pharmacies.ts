import { getClient } from "./client";
import type {
  OrderOut,
  PaginatedResponse,
  PharmacyOut,
  ProductListingOut,
  RevenueRecordOut,
  RevenueSummary,
  WithdrawalOut,
} from "./types";

export const pharmaciesApi = {
  // Public discovery
  list: (params?: { page?: number; page_size?: number }) =>
    getClient().get<PaginatedResponse<PharmacyOut>>("/pharmacies/", { params }),
  getById: (id: string) => getClient().get<PharmacyOut>(`/pharmacies/${id}`),

  // Owner self
  me: () => getClient().get<PharmacyOut>("/pharmacies/me"),
  updateMe: (payload: Partial<PharmacyOut>) =>
    getClient().patch<PharmacyOut>("/pharmacies/me", payload),
  create: (payload: Partial<PharmacyOut>) =>
    getClient().post<PharmacyOut>("/pharmacies/", payload),

  // Listings
  listListings: (params?: { page?: number; page_size?: number }) =>
    getClient().get<PaginatedResponse<ProductListingOut>>("/pharmacies/me/listings", { params }),
  createListing: (payload: Partial<ProductListingOut>) =>
    getClient().post<ProductListingOut>("/pharmacies/me/listings", payload),

  // Orders
  listOrders: (params?: { page?: number; page_size?: number; status?: string }) =>
    getClient().get<PaginatedResponse<OrderOut>>("/pharmacies/me/orders", { params }),
  updateOrderStatus: (orderId: string, status: string) =>
    getClient().patch<OrderOut>(`/pharmacies/me/orders/${orderId}/status`, { status }),

  // Revenue
  listRevenue: () => getClient().get<RevenueRecordOut[]>("/pharmacies/me/revenue"),
  revenueSummary: () => getClient().get<RevenueSummary>("/pharmacies/me/revenue/summary"),

  // Withdrawals
  listWithdrawals: () => getClient().get<WithdrawalOut[]>("/pharmacies/me/withdrawals"),
  requestWithdrawal: (payload: {
    amount: number;
    payout_method?: string;
    payout_details?: Record<string, unknown>;
  }) => getClient().post<WithdrawalOut>("/pharmacies/me/withdrawals", payload),
};
