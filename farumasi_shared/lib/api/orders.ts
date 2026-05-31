import { getClient } from "./client";
import type { OrderOut, PaginatedResponse } from "./types";

export const ordersApi = {
  create: (payload: unknown) => getClient().post<OrderOut>("/orders/", payload),
  listAll: (params?: { page?: number; page_size?: number; status?: string }) =>
    getClient().get<PaginatedResponse<OrderOut>>("/orders/", { params }),
  listMine: (params?: { page?: number; page_size?: number }) =>
    getClient().get<PaginatedResponse<OrderOut>>("/orders/my", { params }),
  listForPharmacy: (params?: { page?: number; page_size?: number; status?: string }) =>
    getClient().get<PaginatedResponse<OrderOut>>("/orders/pharmacy/all", { params }),
  getById: (id: string) => getClient().get<OrderOut>(`/orders/${id}`),
  setStatus: (id: string, order_status: string, notes?: string) =>
    getClient().patch<OrderOut>(`/orders/${id}/status`, { order_status, ...(notes ? { notes } : {}) }),
  setPaymentStatus: (id: string, payment_status: string) =>
    getClient().patch<OrderOut>(`/orders/${id}/payment-status`, { payment_status }),
  pay: (id: string, payload: unknown) =>
    getClient().patch<OrderOut>(`/orders/${id}/payment`, payload),
  getDelivery: (orderId: string) =>
    getClient().get(`/orders/${orderId}/delivery`),
  assignDelivery: (deliveryId: string, riderId: string) =>
    getClient().patch(`/deliveries/${deliveryId}/assign`, { rider_id: riderId }),
  acceptDelivery: (deliveryId: string) =>
    getClient().patch(`/deliveries/${deliveryId}/accept`),
  updateDeliveryStatus: (deliveryId: string, status: string) =>
    getClient().patch(`/deliveries/${deliveryId}/status`, { status }),
  confirmDeliveryQR: (deliveryId: string, qr_token: string) =>
    getClient().post(`/deliveries/${deliveryId}/confirm-qr`, { qr_token }),
};
