import type { DeliveryQR } from "@/types";

export interface BackendDeliveryQR {
  delivery_id: string;
  order_id: string;
  status: string;
  qr_token?: string | null;
  qr_code?: string | null;
}

export function adaptDeliveryQR(d: BackendDeliveryQR): DeliveryQR {
  return {
    deliveryId: d.delivery_id,
    orderId: d.order_id,
    status: d.status,
    qrToken: d.qr_token ?? undefined,
    qrCode: d.qr_code ?? undefined,
  };
}
