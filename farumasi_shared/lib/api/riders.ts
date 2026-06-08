import { getClient } from "./client";
import type { DeliveryOut, RiderEarningsOut, RiderProfileOut } from "./types";

export const ridersApi = {
  me: () => getClient().get<RiderProfileOut>("/riders/me"),
  updateMe: (payload: Partial<RiderProfileOut>) =>
    getClient().put<RiderProfileOut>("/riders/me", payload),

  setAvailability: (availability_status: string) =>
    getClient().patch<RiderProfileOut>("/riders/me/availability", {
      availability_status,
    }),

  listDeliveries: () => getClient().get<DeliveryOut[]>("/riders/me/deliveries"),
  listActiveDeliveries: () => getClient().get<DeliveryOut[]>("/riders/me/deliveries/active"),

  accept: (deliveryId: string) =>
    getClient().patch<DeliveryOut>(`/riders/me/deliveries/${deliveryId}/accept`),
  reject: (deliveryId: string, reason?: string) =>
    getClient().patch<DeliveryOut>(`/riders/me/deliveries/${deliveryId}/reject`, { reason }),
  setStatus: (deliveryId: string, status: string) =>
    getClient().patch<DeliveryOut>(`/riders/me/deliveries/${deliveryId}/status`, { status }),
  confirmQr: (deliveryId: string, qr_token: string) =>
    getClient().post<DeliveryOut>(`/riders/me/deliveries/${deliveryId}/confirm-qr`, {
      qr_token,
    }),

  earnings: () => getClient().get<RiderEarningsOut>("/riders/me/earnings"),
};
