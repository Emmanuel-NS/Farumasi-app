import api from "@/lib/api";
import type { Order } from "@/types";
import {
  adaptOrder,
  type BackendOrder,
  type BackendOrderItem,
  type PaginatedOrders,
} from "@/lib/mappers/orders.mapper";

// Re-exported so existing imports of `adaptOrder` from this module keep working.
export { adaptOrder };
export type { BackendOrder, BackendOrderItem, PaginatedOrders };

export interface CreateOrderPayload {
  prescription_id?: string;
  selected_recommendation_id?: string;
  pharmacy_id?: string;
  partner_company_id?: string;
  delivery_method: "delivery" | "pickup";
  delivery_address?: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  notes?: string;
  items?: { product_listing_id?: string; product_name?: string; quantity: number; unit_price?: number }[];
}

export interface CreateOrderFromRecommendationInput {
  prescriptionId: string;
  recommendationId: string;
  deliveryMethod?: "delivery" | "pickup";
  deliveryAddress?: string;
}

export const ordersService = {
  /**
   * List the current patient's orders.
   * Phase 11.3: use the patient-scoped endpoint per backend contract.
   */
  async getMyOrders(offset = 0, limit = 20): Promise<PaginatedOrders> {
    const { data } = await api.get<PaginatedOrders>("/patients/me/orders", {
      params: { offset, limit },
    });
    return data;
  },

  async getOrderById(id: string): Promise<Order> {
    const { data } = await api.get<BackendOrder>(`/orders/${id}`);
    return adaptOrder(data);
  },

  async createOrder(payload: CreateOrderPayload): Promise<BackendOrder> {
    const { data } = await api.post<BackendOrder>("/patients/me/orders", payload);
    return data;
  },

  /**
   * Create an order from a previously fetched recommendation row.
   * Backend: POST /api/v1/patients/me/orders with the recommendation path
   *   { prescription_id, selected_recommendation_id, delivery_method, delivery_address? }
   */
  async createFromRecommendation(
    { prescriptionId, recommendationId, deliveryMethod = "delivery", deliveryAddress }: CreateOrderFromRecommendationInput,
  ): Promise<BackendOrder> {
    return this.createOrder({
      prescription_id: prescriptionId,
      selected_recommendation_id: recommendationId,
      delivery_method: deliveryMethod,
      delivery_address: deliveryAddress,
    });
  },
};
