import api from "@/lib/api";
import { isMockMode } from "@/lib/env";
import type { DeliveryQR } from "@/types";
import { adaptDeliveryQR, type BackendDeliveryQR } from "@/lib/mappers/delivery.mapper";

export const deliveryService = {
  /**
   * Fetch the patient-side delivery QR for an order.
   * Returns null when the delivery has not been assigned yet (404/403/etc.).
   * Backend: GET /api/v1/patients/me/orders/{order_id}/delivery-qr
   */
  async getQrForOrder(orderId: string): Promise<DeliveryQR | null> {
    if (isMockMode()) return null;
    try {
      const { data } = await api.get<BackendDeliveryQR>(
        `/patients/me/orders/${orderId}/delivery-qr`,
      );
      return adaptDeliveryQR(data);
    } catch {
      return null;
    }
  },
};
