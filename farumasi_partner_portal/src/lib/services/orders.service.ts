import api from "@/lib/api";
import { getSellerMeBase } from "@/lib/seller-api";

export interface BackendOrderItem {
  id: string;
  product_id?: string;
  product_listing_id?: string;
  product_name?: string;
  product_image_url?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sell_mode?: string;
  dispatch_batch_number?: string | null;
  dispatch_expiry_date?: string | null;
  dispatch_manufacturer?: string | null;
  dispatch_dosage?: string | null;
  dispatch_notes?: string | null;
  dispatch_country_of_origin?: string | null;
  dispatch_confirmed_at?: string | null;
  product?: {
    id: string;
    name: string;
    image_url?: string;
    prescription_required?: boolean;
  };
}

export interface BackendOrder {
  id: string;
  order_status: string;
  status: string;
  order_code?: string | null;
  payment_status?: string;
  payment_method?: string;
  total_amount: number;
  subtotal?: number;
  delivery_fee?: number;
  commission?: number;
  platform_commission?: number;
  net_amount?: number;
  net_partner_amount?: number;
  delivery_address?: string;
  delivery_method?: string;
  is_delivery?: boolean;
  notes?: string;
  prescription_id?: string | null;
  prescription_url?: string | null;
  rider_access_code?: string | null;
  patient_access_code?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  items: BackendOrderItem[];
  patient?: {
    id: string;
    user?: { id: string; full_name: string; email: string; phone?: string };
  };
  pharmacy?: { id: string; name: string };
  delivery?: {
    id: string;
    rider?: { id: string; user?: { id: string; full_name: string } };
  };
  rider?: { id: string; user?: { id: string; full_name: string } };
  partner_response_due_at?: string | null;
  pharmacy_confirmed_at?: string | null;
  pharmacy_assigned_at?: string | null;
  dispatch_confirmed_at?: string | null;
  partner_fulfilled_at?: string | null;
  partner_fulfilment_complete?: boolean;
  requires_physical_prescription?: boolean;
  platform_fulfilment_complete?: boolean;
  physical_prescription_collected_at?: string | null;
  reassignment_count?: number;
  amount_paid_snapshot?: number | null;
}

export interface OrderActivityEntry {
  id: string;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  created_at: string;
  actor_user_id?: string | null;
  actor_name?: string | null;
  actor_role?: string | null;
}

export interface OrderPartnerAssignment {
  id: string;
  order_id: string;
  pharmacy_id?: string | null;
  partner_company_id?: string | null;
  provider_name: string;
  subtotal: number;
  net_partner_amount: number;
  assigned_at: string;
  ended_at?: string | null;
  end_reason?: string | null;
  is_current: boolean;
}

export interface PaginatedOrders {
  items: BackendOrder[];
  total: number;
  offset: number;
  limit: number;
}

const LEGACY_ORDER_STATUS: Record<string, string> = {
  processing: "preparing",
  confirmed: "accepted",
  pharmacy_accepted: "accepted",
  in_transit: "out_for_delivery",
};

function normalizeOrderStatus(status: string): string {
  return LEGACY_ORDER_STATUS[status] ?? status;
}

function normItem(raw: BackendOrderItem): BackendOrderItem {
  const name = raw.product_name ?? raw.product?.name ?? "Item";
  const image = raw.product_image_url ?? raw.product?.image_url;
  const productId = raw.product_id ?? raw.product?.id;
  return {
    ...raw,
    product_name: name,
    product_image_url: image,
    product: raw.product ?? (productId
      ? { id: productId, name, image_url: image }
      : { id: productId ?? raw.id, name, image_url: image }),
  };
}

function norm(o: BackendOrder): BackendOrder {
  const raw = o.order_status ?? o.status ?? "";
  const status = normalizeOrderStatus(raw);
  const is_delivery = o.is_delivery !== undefined ? o.is_delivery : o.delivery_method === "delivery";
  return {
    ...o,
    status,
    order_status: status,
    is_delivery,
    commission: o.commission ?? o.platform_commission,
    net_amount: o.net_amount ?? o.net_partner_amount ?? o.total_amount,
    subtotal: o.subtotal ?? o.total_amount,
    items: (o.items ?? []).map(normItem),
  };
}

export const ordersService = {
  async listPartnerOrders(params?: {
    offset?: number;
    limit?: number;
    status?: string;
    from_date?: string;
  }): Promise<PaginatedOrders> {
    const { data } = await api.get<PaginatedOrders>(`${getSellerMeBase()}/orders`, { params });
    return { ...data, items: data.items.map(norm) };
  },

  async getOrder(id: string): Promise<BackendOrder> {
    const { data } = await api.get<BackendOrder>(`/orders/${id}`);
    return norm(data);
  },

  async updateOrderStatus(id: string, status: string): Promise<BackendOrder> {
    const { data } = await api.patch<BackendOrder>(`${getSellerMeBase()}/orders/${id}/status`, { order_status: status });
    return norm(data);
  },

  async verifyAccessCode(
    orderId: string,
    accessCode: string,
    physicalPrescriptionPresent = false,
  ): Promise<BackendOrder> {
    const { data } = await api.post<BackendOrder>(`/orders/${orderId}/verify-access-code`, {
      access_code: accessCode,
      physical_prescription_present: physicalPrescriptionPresent,
    });
    return norm(data);
  },

  async confirmRiderHandover(
    orderId: string,
    payload: { rider_access_code: string; patient_access_code: string },
  ): Promise<BackendOrder> {
    const { data } = await api.post<BackendOrder>(
      `/orders/${orderId}/confirm-rider-handover`,
      payload,
    );
    return norm(data);
  },

  async confirmDispatch(
    orderId: string,
    payload: {
      items: Array<{
        order_item_id: string;
        batch_number: string;
        expiry_date: string;
        manufacturer: string;
        country_of_origin: string;
        dosage?: string;
        notes?: string;
      }>;
    },
  ): Promise<BackendOrder> {
    const { data } = await api.post<BackendOrder>(`/orders/${orderId}/confirm-dispatch`, payload);
    return norm(data);
  },

  async getOrderActivity(orderId: string): Promise<OrderActivityEntry[]> {
    try {
      const { data } = await api.get<OrderActivityEntry[]>(`/orders/${orderId}/activity`);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async getPartnerAssignments(orderId: string): Promise<OrderPartnerAssignment[]> {
    try {
      const { data } = await api.get<OrderPartnerAssignment[]>(
        `/orders/${orderId}/partner-assignments`,
      );
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },
};
