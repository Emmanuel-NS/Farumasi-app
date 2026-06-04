import type { Order, OrderStatus, OrderPaymentStatus } from "@/types";

export interface BackendOrderItem {
  id: string;
  order_id?: string;
  product_listing_id: string | null;
  product_id: string | null;
  product_name: string;
  product_image_url?: string | null;
  quantity: number;
  sell_mode?: string | null;
  unit_price: number;
  total_price: number;
  created_at?: string;
}

export interface BackendOrder {
  id: string;
  order_code: string;
  patient_id: string;
  prescription_id: string | null;
  pharmacy_id: string | null;
  partner_company_id: string | null;
  selected_recommendation_id?: string | null;
  order_status: string;
  /** Alias for order_status used by some service layers */
  status?: string;
  pharmacy_name?: string;
  payment_status: string;
  delivery_method: string | null;
  delivery_address: string | null;
  subtotal: number;
  delivery_fee: number;
  platform_commission: number;
  total_amount: number;
  net_partner_amount: number;
  payment_reference?: string | null;
  patient_access_code?: string | null;
  notes?: string | null;
  items: BackendOrderItem[];
  // Nested objects populated by backend since Phase 11
  pharmacy?: { id: string; name: string } | null;
  partner_company?: { id: string; name: string } | null;
  delivery?: {
    id: string;
    status: string;
    rider?: {
      id: string;
      user?: { id: string; full_name?: string | null; phone?: string | null } | null;
    } | null;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedOrders {
  items: BackendOrder[];
  total: number;
  offset: number;
  limit: number;
}

// Map backend order_status values → frontend OrderStatus type
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
  const itemNames = o.items && o.items.length > 0
    ? o.items.map((i) => `${i.product_name} ×${i.quantity}`).join(", ")
    : `Order ${o.order_code}`;

  return {
    id: o.id,
    status: (STATUS_MAP[o.order_status] ?? "pending_review") as OrderStatus,
    items: itemNames,
    total: `RWF ${o.total_amount.toLocaleString()}`,
    date: new Date(o.created_at).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    }),
    pharmacy:
      o.pharmacy?.name
      ?? o.partner_company?.name
      ?? (o.pharmacy_id ? `Pharmacy #${o.pharmacy_id.slice(0, 6)}` : o.partner_company_id ? "Partner" : "FARUMASI"),
    pharmacyPrice: o.subtotal,
    deliveryFee: o.delivery_fee,
    prescriptionImageUrl: undefined,
    orderCode: o.order_code,
    paymentStatus: o.payment_status as OrderPaymentStatus,
    deliveryMethod: o.delivery_method ?? undefined,
    prescriptionId: o.prescription_id ?? undefined,
    selectedRecommendationId: o.selected_recommendation_id ?? undefined,
    pharmacyId: o.pharmacy_id ?? undefined,
    partnerCompanyId: o.partner_company_id ?? undefined,
    assignedDriverName: o.delivery?.rider?.user?.full_name ?? undefined,
    assignedDriverPhone: o.delivery?.rider?.user?.phone ?? undefined,
    notes: o.notes ?? undefined,
    patientAccessCode: o.patient_access_code ?? undefined,
    deliveryAddress: o.delivery_address ?? undefined,
    subtotal: o.subtotal,
    itemList: (o.items ?? []).map((it) => ({
      id: it.id,
      productId: it.product_id,
      productListingId: it.product_listing_id,
      name: it.product_name,
      quantity: it.quantity,
      sellMode: (it.sell_mode ?? "pack") as "pack" | "partial",
      unitPrice: it.unit_price,
      totalPrice: it.total_price,
      imageUrl: it.product_image_url ?? null,
    })),
  };
}
