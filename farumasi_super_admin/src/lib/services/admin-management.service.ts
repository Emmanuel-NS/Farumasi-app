import api from "@/lib/api";
import type { UserOut } from "./users.service";

export interface AdminCreateUserPayload {
  full_name: string;
  email: string;
  phone?: string;
  role: string;
  temporary_password?: string;
}

export interface AdminCreateUserResult {
  user: UserOut;
  temporary_password: string;
}

export interface OnboardPharmacyPayload {
  owner_full_name: string;
  owner_email: string;
  owner_phone?: string;
  temporary_password?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  license_number?: string;
  commission_rate_percent: number;
  logo_url?: string;
  accepts_delivery?: boolean;
}

export interface OnboardPartnerPayload {
  owner_full_name: string;
  owner_email: string;
  owner_phone?: string;
  temporary_password?: string;
  name: string;
  company_type?: string;
  email?: string;
  phone?: string;
  address?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  business_registration_number?: string;
  commission_rate_percent: number;
  logo_url?: string;
  description?: string;
}

export interface OnboardSellerResult {
  owner: UserOut;
  temporary_password: string;
  pharmacy_id?: string;
  partner_company_id?: string;
}

export interface SellerFinanceSummary {
  seller_type: string;
  seller_id: string;
  seller_name: string;
  commission_rate_percent?: number | null;
  owner?: UserOut | null;
  revenue: {
    gross_revenue: number;
    platform_commission: number;
    net_revenue: number;
    available_balance: number;
    pending_balance: number;
    withdrawn_amount: number;
    pending_withdrawals: number;
    paid_withdrawals: number;
    total_orders: number;
    completed_orders: number;
  };
  recent_withdrawals: Array<{
    id: string;
    amount: number;
    status: string;
    payout_method: string;
    created_at: string;
    processed_at?: string | null;
    payment_reference?: string | null;
    payment_proof_url?: string | null;
  }>;
  recent_revenue_records?: Array<{
    id: string;
    order_id: string;
    order_code?: string | null;
    gross_amount: number;
    platform_commission: number;
    net_amount: number;
    status: string;
    created_at: string;
  }>;
  pending_change_requests?: SellerChangeRequest[];
  wallet_scope?: string;
  wallet_scope_note?: string | null;
  created_at?: string;
  verification_status?: string | null;
  seller_account_status?: string | null;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  business_registration_number?: string | null;
  regulatory_authority?: string | null;
  regulatory_license_number?: string | null;
  regulatory_license_document_url?: string | null;
}

export interface SellerChangeRequest {
  id: string;
  seller_type: string;
  pharmacy_id?: string | null;
  partner_company_id?: string | null;
  seller_name?: string | null;
  field_name: string;
  field_label: string;
  current_value?: string | null;
  proposed_value: string;
  status: string;
  admin_note?: string | null;
  partner_note?: string | null;
  created_at: string;
  resolved_at?: string | null;
}

export interface ProposeSellerChangePayload {
  field_name?: string;
  proposed_value: string;
  admin_note?: string;
}

export interface PrescriptionAdminSummary {
  total: number;
  by_status: Array<{ status: string; label: string; count: number }>;
  with_cart_items: number;
  without_cart_items: number;
  total_cart_items: number;
  types: Array<{ status: string; label: string; count: number }>;
  new_requests: number;
  under_review: number;
  cart_sent: number;
  fulfilled: number;
  cancelled_expired: number;
}

export interface OrderAdminSummary {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  prescription_orders: number;
  partner_orders: number;
  prescription_pending: number;
  prescription_in_progress: number;
  prescription_completed: number;
  prescription_cancelled: number;
  completed_revenue: number;
}

export interface ProductTypeInsight {
  product_type: string;
  label: string;
  total: number;
  prescription_required: number;
  over_the_counter: number;
}

export interface PatientCatalogInsights {
  total_listings: number;
  by_type: ProductTypeInsight[];
}

export const adminManagementService = {
  async createUser(payload: AdminCreateUserPayload): Promise<AdminCreateUserResult> {
    const { data } = await api.post<AdminCreateUserResult>("/admin/users", payload);
    return data;
  },

  async onboardPharmacy(payload: OnboardPharmacyPayload): Promise<OnboardSellerResult> {
    const { data } = await api.post<OnboardSellerResult>("/admin/onboard/pharmacy", payload);
    return data;
  },

  async onboardPartner(payload: OnboardPartnerPayload): Promise<OnboardSellerResult> {
    const { data } = await api.post<OnboardSellerResult>("/admin/onboard/partner", payload);
    return data;
  },

  async getPharmacyFinance(pharmacyId: string): Promise<SellerFinanceSummary> {
    const { data } = await api.get<SellerFinanceSummary>(`/admin/sellers/pharmacy/${pharmacyId}/finance`);
    return data;
  },

  async getPartnerFinance(partnerId: string): Promise<SellerFinanceSummary> {
    const { data } = await api.get<SellerFinanceSummary>(`/admin/sellers/partner/${partnerId}/finance`);
    return data;
  },

  async proposePharmacyChange(
    pharmacyId: string,
    payload: ProposeSellerChangePayload,
  ): Promise<SellerChangeRequest> {
    const { data } = await api.post<SellerChangeRequest>(
      `/admin/sellers/pharmacy/${pharmacyId}/change-requests`,
      payload,
    );
    return data;
  },

  async proposePartnerChange(
    partnerId: string,
    payload: ProposeSellerChangePayload,
  ): Promise<SellerChangeRequest> {
    const { data } = await api.post<SellerChangeRequest>(
      `/admin/sellers/partner/${partnerId}/change-requests`,
      payload,
    );
    return data;
  },

  async getPrescriptionSummary(): Promise<PrescriptionAdminSummary> {
    const { data } = await api.get<PrescriptionAdminSummary>("/analytics/prescriptions/summary");
    return data;
  },

  async getOrderSummary(): Promise<OrderAdminSummary> {
    const { data } = await api.get<OrderAdminSummary>("/analytics/orders/summary");
    return data;
  },

  async getPatientCatalogInsights(): Promise<PatientCatalogInsights> {
    const { data } = await api.get<PatientCatalogInsights>("/analytics/products/patient-catalog");
    return data;
  },
};
