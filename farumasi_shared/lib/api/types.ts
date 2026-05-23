/**
 * FARUMASI Shared API Client — types
 *
 * Mirrors the Pydantic schemas exposed by farumasi_api. Field names use snake_case
 * to match the backend wire format exactly.
 *
 * Source of truth: `GET /api/v1/openapi.json`.
 */

// ── Enums ────────────────────────────────────────────────────────────────────
export type UserRole =
  | "SUPER_ADMIN"
  | "OPERATIONS_ADMIN"
  | "FINANCE_ADMIN"
  | "COMPLIANCE_ADMIN"
  | "PATIENT"
  | "DOCTOR"
  | "HOSPITAL_ADMIN"
  | "PHARMACIST"
  | "PHARMACY_ADMIN"
  | "PARTNER_COMPANY_ADMIN"
  | "RIDER";

export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION";
export type EntityStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type VerificationStatus = "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";

export type ProductApprovalStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
export type ListingAvailability = "AVAILABLE" | "OUT_OF_STOCK" | "DISCONTINUED";
export type PrescriptionStatus =
  | "DRAFT"
  | "ACTIVE"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "FULFILLED"
  | "EXPIRED";
export type PrescriptionType = "DOCTOR_CREATED" | "PATIENT_UPLOADED";

export type OrderStatus =
  | "PENDING"
  | "ACCEPTED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "OUT_FOR_DELIVERY"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED";

export type PaymentStatus = "UNPAID" | "PROCESSING" | "PAID" | "FAILED" | "REFUNDED";

export type DeliveryStatus =
  | "PENDING_ASSIGNMENT"
  | "ASSIGNED"
  | "ACCEPTED"
  | "REJECTED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";

export type WithdrawalStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID";
export type ArticleStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type NotificationStatus = "UNREAD" | "READ";

// ── Common shapes ────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface ApiErrorBody {
  detail: string | Array<{ loc?: (string | number)[]; msg: string; type?: string }>;
}

// ── Users / profiles ─────────────────────────────────────────────────────────
export interface UserOut {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  phone?: string | null;
  profile_image_url?: string | null;
  created_at?: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  phone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// ── Patient ──────────────────────────────────────────────────────────────────
export interface AddressOut {
  id: string;
  label: string;
  line1: string;
  line2?: string | null;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_default: boolean;
}

export interface PatientProfileOut {
  id: string;
  user_id: string;
  date_of_birth?: string | null;
  gender?: string | null;
  insurance_provider_id?: string | null;
  default_address_id?: string | null;
}

// ── Doctor ───────────────────────────────────────────────────────────────────
export interface DoctorProfileOut {
  id: string;
  user_id: string;
  hospital_id?: string | null;
  specialty?: string | null;
  license_number?: string | null;
  status: EntityStatus;
}

// ── Pharmacist / Pharmacy / Partner / Rider / Hospital ───────────────────────
export interface PharmacistProfileOut {
  id: string;
  user_id: string;
  license_number?: string | null;
  specialization?: string | null;
  bio?: string | null;
  years_of_experience?: number | null;
  status: EntityStatus;
  verification_status: VerificationStatus;
}

export interface PharmacyOut {
  id: string;
  owner_user_id: string;
  name: string;
  address: string;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  email?: string | null;
  is_open: boolean;
  accepts_delivery: boolean;
  status: EntityStatus;
  verification_status: VerificationStatus;
}

export interface PartnerCompanyOut {
  id: string;
  owner_user_id: string;
  name: string;
  business_registration_number?: string | null;
  address: string;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  email?: string | null;
  status: EntityStatus;
}

export interface RiderProfileOut {
  id: string;
  user_id: string;
  vehicle_type?: string | null;
  is_available: boolean;
  status: EntityStatus;
}

export interface HospitalOut {
  id: string;
  name: string;
  address: string;
  district?: string | null;
  phone?: string | null;
  email?: string | null;
  status: EntityStatus;
}

// ── Catalogue / listings / insurance ─────────────────────────────────────────
export interface ProductOut {
  id: string;
  name: string;
  generic_name?: string | null;
  brand?: string | null;
  manufacturer?: string | null;
  category?: string | null;
  dosage_form?: string | null;
  strength?: string | null;
  description?: string | null;
  prescription_required: boolean;
  approval_status: ProductApprovalStatus;
  image_url?: string | null;
}

export interface ProductListingOut {
  id: string;
  pharmacy_id?: string | null;
  partner_id?: string | null;
  product_id: string;
  price: number;
  stock_quantity: number;
  expiry_date?: string | null;
  availability_status: ListingAvailability;
  status: EntityStatus;
}

export interface InsuranceProviderOut {
  id: string;
  name: string;
  short_code?: string | null;
  is_active: boolean;
}

// ── Prescriptions ────────────────────────────────────────────────────────────
export interface PrescriptionItemOut {
  id: string;
  prescription_id: string;
  medicine_name: string;
  product_id?: string | null;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  quantity?: number | null;
  instructions?: string | null;
}

export interface PrescriptionOut {
  id: string;
  patient_id: string;
  doctor_id?: string | null;
  hospital_id?: string | null;
  prescription_type: PrescriptionType;
  status: PrescriptionStatus;
  diagnosis_notes?: string | null;
  notes?: string | null;
  uploaded_file_url?: string | null;
  items: PrescriptionItemOut[];
  created_at: string;
}

// ── Recommendations ──────────────────────────────────────────────────────────
export interface RecommendationItem {
  pharmacy: PharmacyOut & { distance_km?: number; rating?: number };
  score: number;
  score_breakdown: Record<string, number>;
  available_items: Array<{
    product_id: string;
    medicine_name: string;
    available: boolean;
    price?: number;
  }>;
}

export interface RecommendationResponse {
  recommendations: RecommendationItem[];
}

// ── Orders / deliveries ──────────────────────────────────────────────────────
export interface OrderItemOut {
  id: string;
  order_id: string;
  product_id: string;
  medicine_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface OrderOut {
  id: string;
  patient_id: string;
  pharmacy_id?: string | null;
  partner_id?: string | null;
  prescription_id?: string | null;
  delivery_address_id?: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method?: string | null;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  items: OrderItemOut[];
  created_at: string;
}

export interface DeliveryOut {
  id: string;
  order_id: string;
  rider_id?: string | null;
  status: DeliveryStatus;
  pickup_at?: string | null;
  delivered_at?: string | null;
  qr_code?: string | null;
}

export interface DeliveryTimerOut {
  delivery_id: string;
  expected_pickup_at?: string | null;
  expected_delivery_at?: string | null;
  remaining_seconds?: number | null;
}

// ── Revenue / withdrawals / earnings ─────────────────────────────────────────
export interface RevenueRecordOut {
  id: string;
  pharmacy_id?: string | null;
  partner_id?: string | null;
  order_id: string;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  recorded_at: string;
}

export interface RevenueSummary {
  total_gross: number;
  total_commission: number;
  total_net: number;
  available_balance: number;
  pending_withdrawal: number;
  order_count: number;
}

export interface WithdrawalOut {
  id: string;
  owner_user_id: string;
  pharmacy_id?: string | null;
  partner_id?: string | null;
  amount: number;
  status: WithdrawalStatus;
  payout_method?: string | null;
  payout_details?: Record<string, unknown> | null;
  created_at: string;
}

export interface RiderEarningsOut {
  total_deliveries: number;
  total_earnings: number;
  pending_payout: number;
}

// ── Notifications / audit / articles ─────────────────────────────────────────
export interface NotificationOut {
  id: string;
  user_id: string;
  category: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  status: NotificationStatus;
  created_at: string;
}

export interface NotificationUnreadCount {
  unread: number;
}

export interface AuditLogOut {
  id: string;
  actor_user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  changes?: Record<string, unknown> | null;
  created_at: string;
}

export interface ArticleOut {
  id: string;
  author_pharmacist_id?: string | null;
  title: string;
  slug: string;
  summary?: string | null;
  content?: string | null;
  category?: string | null;
  image_url?: string | null;
  status: ArticleStatus;
  published_at?: string | null;
  created_at: string;
}

export interface ArticlePublicOut {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  content?: string | null;
  category?: string | null;
  image_url?: string | null;
  author_pharmacist_id?: string | null;
  published_at?: string | null;
}

// ── Admin / analytics ────────────────────────────────────────────────────────
export interface AdminSummaryOut {
  total_users: number;
  total_orders: number;
  total_revenue: number;
  total_pharmacies: number;
  total_patients: number;
  total_doctors: number;
}
