import api from "@/lib/api";
import type { Order, OrderStatus } from "@/types";

export interface BackendOrderItem {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface BackendOrder {
  id: string;
  order_code: string;
  patient_id: string;
  prescription_id: string | null;
  pharmacy_id: string | null;
  partner_company_id: string | null;
  order_status: string;
  payment_status: string;
  delivery_method: string | null;
  delivery_address: string | null;
  subtotal: number;
  delivery_fee: number;
  platform_commission: number;
  total_amount: number;
  net_partner_amount: number;
  notes: string | null;
  items: BackendOrderItem[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedOrders {
  items: BackendOrder[];
  total: number;
  offset: number;
  limit: number;
}

// Map actual backend order_status values → frontend OrderStatus type
const STATUS_MAP: Record<string, OrderStatus> = {
  pending:             "pending_review",
  accepted:            "pharmacy_accepted",
  rejected:            "cancelled",
  preparing:           "pharmacy_accepted",
  ready_for_pickup:    "ready_for_pickup",
  out_for_delivery:    "out_for_delivery",
  delivered:           "delivered",
  completed:           "delivered",
  cancelled:           "cancelled",
  failed:              "cancelled",
};

export function adaptOrder(o: BackendOrder): Order {
  const itemNames = o.items.length > 0
    ? o.items.map((i) => `${i.product_name} ×${i.quantity}`).join(", ")
    : (o.notes ?? `Order ${o.order_code}`);

  return {
    id: o.id,
    status: (STATUS_MAP[o.order_status] ?? "pending_review") as OrderStatus,
    items: itemNames,
    total: `RWF ${o.total_amount.toLocaleString()}`,
    date: new Date(o.created_at).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    }),
    pharmacy: o.pharmacy_id ? `Pharmacy #${o.pharmacy_id.slice(0, 6)}` : "FARUMASI Partner",
    pharmacyPrice: o.subtotal,
    deliveryFee: o.delivery_fee,
    prescriptionImageUrl: undefined,
  };
}

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
  async getMyOrders(offset = 0, limit = 20): Promise<PaginatedOrders> {
    const { data } = await api.get<PaginatedOrders>("/orders/my", {
      params: { offset, limit },
    });
    return data;
  },

  async getOrderById(id: string): Promise<Order> {
    const { data } = await api.get<BackendOrder>(`/orders/${id}`);
    return adaptOrder(data);
  },

  async createOrder(payload: CreateOrderPayload): Promise<BackendOrder> {
    // Phase 11.2: use the patient-scoped shortcut. Backend accepts the same
    // OrderCreate schema (recommendation path, listing path, or legacy path).
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
