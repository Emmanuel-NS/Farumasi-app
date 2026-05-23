import { getClient } from "./client";
import type { DeliveryOut, DeliveryTimerOut } from "./types";

export const deliveriesApi = {
  list: () => getClient().get<DeliveryOut[]>("/deliveries/"),
  getById: (id: string) => getClient().get<DeliveryOut>(`/deliveries/${id}`),
  assign: (payload: { order_id: string; rider_id: string }) =>
    getClient().post<DeliveryOut>("/deliveries/assign", payload),
  reassign: (deliveryId: string, payload: { rider_id: string }) =>
    getClient().patch<DeliveryOut>(`/deliveries/${deliveryId}/assign`, payload),
  setStatus: (deliveryId: string, status: string) =>
    getClient().patch<DeliveryOut>(`/deliveries/${deliveryId}/status`, { status }),
  confirmQr: (deliveryId: string, qr_code: string) =>
    getClient().post<DeliveryOut>(`/deliveries/${deliveryId}/confirm-qr`, { qr_code }),
  timer: (deliveryId: string) =>
    getClient().get<DeliveryTimerOut>(`/deliveries/${deliveryId}/timer`),
};
