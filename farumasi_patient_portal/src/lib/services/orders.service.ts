import api from "@/lib/api";
import { isMockMode } from "@/lib/env";
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
  patient_access_code?: string;
  defer_delivery_fee?: boolean;
  items?: {
    product_listing_id?: string;
    product_name?: string;
    quantity: number;
    sell_mode?: "pack" | "partial";
    unit_price?: number;
  }[];
}

export interface CreateOrderFromRecommendationInput {
  prescriptionId: string;
  recommendationId: string;
  deliveryMethod?: "delivery" | "pickup";
  deliveryAddress?: string;
}

export const ordersService = {
  async getMyOrders(offset = 0, limit = 20): Promise<PaginatedOrders> {
    if (isMockMode()) {
      const mock = [
        { id: "ORD-001", order_code: "ORD-001", status: "delivered", payment_status: "paid", total_amount: 12500, pharmacy_name: "FARUMASI Kigali Central", delivery_method: "delivery", created_at: new Date(Date.now() - 86400000 * 2).toISOString(), updated_at: new Date().toISOString(), items: [{ id: "i1", product_listing_id: null, product_id: null, product_name: "Amoxicillin 500mg", quantity: 2, unit_price: 3500, total_price: 7000 }, { id: "i2", product_listing_id: null, product_id: null, product_name: "Paracetamol 1g", quantity: 2, unit_price: 2750, total_price: 5500 }] },
        { id: "ORD-002", order_code: "ORD-002", status: "in_transit", payment_status: "paid", total_amount: 8000, pharmacy_name: "MedPlus Kicukiro", delivery_method: "delivery", created_at: new Date(Date.now() - 3600000).toISOString(), updated_at: new Date().toISOString(), items: [{ id: "i3", product_listing_id: null, product_id: null, product_name: "Metformin 850mg", quantity: 1, unit_price: 8000, total_price: 8000 }] },
        { id: "ORD-003", order_code: "ORD-003", status: "pending", payment_status: "pending", total_amount: 5500, pharmacy_name: "HealthPlus Nyamirambo", delivery_method: "pickup", created_at: new Date(Date.now() - 1800000).toISOString(), updated_at: new Date().toISOString(), items: [{ id: "i4", product_listing_id: null, product_id: null, product_name: "Vitamin C 1000mg", quantity: 2, unit_price: 2750, total_price: 5500 }] },
      ] as unknown as BackendOrder[];
      return { items: mock, total: mock.length, offset: 0, limit: 20 };
    }
    const { data } = await api.get<PaginatedOrders>("/patients/me/orders", {
      params: { offset, limit },
    });
    return data;
  },

  async getOrderById(id: string): Promise<Order> {
    if (isMockMode()) {
      const mock = { id, order_code: id, status: "in_transit", payment_status: "paid", total_amount: 8000, pharmacy_name: "MedPlus Kicukiro", delivery_method: "delivery", created_at: new Date(Date.now() - 3600000).toISOString(), updated_at: new Date().toISOString(), items: [{ id: "i3", product_listing_id: null, product_id: null, product_name: "Metformin 850mg", quantity: 1, unit_price: 8000, total_price: 8000 }] } as unknown as BackendOrder;
      return adaptOrder(mock);
    }
    const { data } = await api.get<BackendOrder>(`/orders/${id}`);
    return adaptOrder(data);
  },

  async createOrder(payload: CreateOrderPayload): Promise<BackendOrder> {
    const { data } = await api.post<BackendOrder>("/patients/me/orders", payload, {
      timeout: 60_000,
    });
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

  /**
   * @deprecated Patients can no longer cancel orders from the app — contact support instead.
   * Kept for internal/admin tooling if needed.
   */
  async cancelOrder(id: string): Promise<BackendOrder> {
    const { data } = await api.patch<BackendOrder>(`/orders/${id}/status`, {
      order_status: "cancelled",
    });
    return data;
  },

  async getReassignmentOptions(
    orderId: string,
    includeBelowPaidWithoutChange = false,
  ) {
    const { data } = await api.get<{
      order_id: string;
      amount_paid: number;
      can_reassign: boolean;
      switch_enabled?: boolean;
      partner_response_due_at?: string | null;
      below_paid_count?: number;
      options: Array<{
        pharmacy_id?: string | null;
        partner_company_id?: string | null;
        provider_name: string;
        estimated_subtotal: number;
        delivery_fee: number;
        estimated_total: number;
        amount_paid: number;
        requires_refund?: boolean;
        refund_amount?: number;
        price_category?: "within_paid" | "below_paid" | "above_paid";
        can_switch?: boolean;
        requires_no_change_ack?: boolean;
        forfeit_amount?: number;
        extra_payment_required?: number;
        ai_rank?: number | null;
        ai_score?: number | null;
        ai_reasons?: string[];
      }>;
    }>(`/patients/me/orders/${orderId}/reassignment-options`, {
      params: { include_below_paid_without_change: includeBelowPaidWithoutChange },
    });
    return data;
  },

  async reassignPharmacy(
    orderId: string,
    payload: {
      pharmacy_id?: string;
      partner_company_id?: string;
      accept_refund_for_difference?: boolean;
      accept_no_change?: boolean;
    },
  ): Promise<BackendOrder> {
    const { data } = await api.post<BackendOrder>(
      `/patients/me/orders/${orderId}/reassign-pharmacy`,
      payload,
    );
    return data;
  },
};
