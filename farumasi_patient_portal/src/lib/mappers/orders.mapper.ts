import type { Order, OrderStatus, OrderPaymentStatus, OrderSellerContact } from "@/types";
import { formatDateLocal } from "@/lib/datetime";

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
  dispatch_batch_number?: string | null;
  dispatch_expiry_date?: string | null;
  dispatch_manufacturer?: string | null;
  dispatch_dosage?: string | null;
  dispatch_notes?: string | null;
  dispatch_country_of_origin?: string | null;
  dispatch_confirmed_at?: string | null;
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
  defer_delivery_fee?: boolean;
  amount_paid_order?: number;
  payment_reference?: string | null;
  patient_access_code?: string | null;
  notes?: string | null;
  pharmacy_assigned_at?: string | null;
  pharmacy_confirmed_at?: string | null;
  partner_response_due_at?: string | null;
  amount_paid_snapshot?: number | null;
  can_reassign_pharmacy?: boolean;
  dispatch_confirmed_at?: string | null;
  items: BackendOrderItem[];
  // Nested objects populated by backend since Phase 11
  pharmacy?: {
    id: string;
    name: string;
    address?: string | null;
    district?: string | null;
    phone?: string | null;
    email?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  partner_company?: {
    id: string;
    name: string;
    address?: string | null;
    district?: string | null;
    phone?: string | null;
    email?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    description?: string | null;
  } | null;
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

function sellerContactFromBackend(o: BackendOrder): OrderSellerContact | undefined {
  if (o.pharmacy) {
    return {
      type: "pharmacy",
      name: o.pharmacy.name,
      address: o.pharmacy.address ?? undefined,
      district: o.pharmacy.district ?? undefined,
      phone: o.pharmacy.phone ?? undefined,
      email: o.pharmacy.email ?? undefined,
      latitude: o.pharmacy.latitude ?? undefined,
      longitude: o.pharmacy.longitude ?? undefined,
    };
  }
  if (o.partner_company) {
    return {
      type: "partner",
      name: o.partner_company.name,
      address: o.partner_company.address ?? undefined,
      district: o.partner_company.district ?? undefined,
      phone: o.partner_company.phone ?? undefined,
      email: o.partner_company.email ?? undefined,
      description: o.partner_company.description ?? undefined,
      latitude: o.partner_company.latitude ?? undefined,
      longitude: o.partner_company.longitude ?? undefined,
    };
  }
  return undefined;
}

export function adaptOrder(o: BackendOrder): Order {
  const itemNames = o.items && o.items.length > 0
    ? o.items.map((i) => `${i.product_name} ×${i.quantity}`).join(", ")
    : `Order ${o.order_code}`;

  return {
    id: o.id,
    status: (STATUS_MAP[o.order_status] ?? "pending_review") as OrderStatus,
    items: itemNames,
    total: `RWF ${o.total_amount.toLocaleString()}`,
    createdAt: o.created_at,
    date: formatDateLocal(o.created_at),
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
    deferDeliveryFee: o.defer_delivery_fee ?? false,
    amountPaidOrder: o.amount_paid_order ?? o.amount_paid_snapshot ?? 0,
    sellerContact: sellerContactFromBackend(o),
    canReassignPharmacy: o.can_reassign_pharmacy ?? false,
    partnerResponseDueAt: o.partner_response_due_at ?? undefined,
    amountPaidSnapshot: o.amount_paid_snapshot ?? undefined,
    dispatchConfirmedAt: o.dispatch_confirmed_at ?? undefined,
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
      dispatchBatchNumber: it.dispatch_batch_number ?? undefined,
      dispatchExpiryDate: it.dispatch_expiry_date ?? undefined,
      dispatchManufacturer: it.dispatch_manufacturer ?? undefined,
      dispatchDosage: it.dispatch_dosage ?? undefined,
      dispatchNotes: it.dispatch_notes ?? undefined,
      dispatchCountryOfOrigin: it.dispatch_country_of_origin ?? undefined,
    })),
  };
}
