// ──────────────────────────────────────────────
// FARUMASI Patient Portal — Type Definitions
// ──────────────────────────────────────────────

// ── Auth ──────────────────────────────────────
export type UserRole = "patient" | "pharmacist" | "rider" | "doctor" | "hospital_admin" | "pharmacy_admin" | "super_admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  twoFactorEnabled?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
}

// ── Medicine / Products ───────────────────────
export type StockStatus = "available" | "low_stock" | "unavailable";

export interface AgeRange {
  range: string;     // e.g. "Child (2–12)", "Adult (18+)"
  instructions: string;
}

export interface MarketingPharmacy {
  pharmacyName: string;
  stockStatus: StockStatus;
  price: number;
}

export interface Medicine {
  id: string;
  name: string;
  description: string;
  /** Short one-liner shown on product cards */
  shortDescription?: string;
  /** Overview paragraph for the product detail / quickview */
  overviewDescription?: string;
  /** Short plain-text dosage summary (shown in Read more overlay) */
  dosageSummary?: string;
  /** Full dosage details — may be rich text (shown on detail page only) */
  dosageDetails?: string;
  /** Safety / warnings text for quickview */
  safetyInfo?: string;
  price: number;
  maxPrice?: number;
  imageUrl: string;
  category: string;
  subCategory?: string;
  additionalCategories: string[];
  additionalSubCategories: string[];
  requiresPrescription: boolean;
  rating: number;
  isPopular: boolean;
  dosage: string;
  doseMorning?: string;
  doseAfternoon?: string;
  doseEvening?: string;
  doseTimeInterval?: string;
  sideEffects: string;
  manufacturer: string;
  keywords: string[];
  expiryDate?: string;
  ageDosages: AgeRange[];
  marketingPharmacies: MarketingPharmacy[];
  warnings?: string;
  storage?: string;
  composition?: string;
  interactions?: string;
}

// ── Cart ──────────────────────────────────────
export interface CartItem {
  medicine: Medicine;
  quantity: number;
}

// ── Orders ────────────────────────────────────
export type OrderStatus =
  | "pending_review"
  | "finding_pharmacy"
  | "pharmacy_accepted"
  | "payment_pending"
  | "ready_for_pickup"
  | "driver_assigned"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type OrderPaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "refunded"
  | string;

export interface Order {
  id: string;
  status: OrderStatus;
  items: string;           // comma-separated names
  total: string;
  date: string;
  pharmacy: string;
  patientName?: string;
  prescriptionImageUrl?: string;
  pharmacyPrice?: number;
  deliveryFee?: number;
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  insuranceProvider?: string;
  reviewedAt?: string;
  paidAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  // Phase 11.3 — backend-derived fields used in detail page
  orderCode?: string;
  paymentStatus?: OrderPaymentStatus;
  deliveryMethod?: "delivery" | "pickup" | string;
  prescriptionId?: string;
  selectedRecommendationId?: string;
  pharmacyId?: string;
  partnerCompanyId?: string;
}

// ── Delivery QR ───────────────────────────────
export interface DeliveryQR {
  deliveryId: string;
  orderId: string;
  status: string;
  qrToken?: string;
  qrCode?: string; // base64/data URL image when backend renders the code
}

// ── Recommendations ───────────────────────────
export type RecommendationProviderType = "pharmacy" | "partner";

export interface Recommendation {
  id?: string;
  rank: number;
  providerType: RecommendationProviderType;
  providerId: string;
  providerName: string;
  totalScore: number;
  availabilityScore: number;
  insuranceScore: number;
  priceScore: number;
  locationScore: number;
  deliveryScore: number;
  reliabilityScore: number;
  expirySafetyScore: number;
  estimatedTotalPrice?: number | null;
  estimatedDistanceKm?: number | null;
  canFulfillCompletePrescription: boolean;
  availableItemsCount: number;
  totalItemsCount: number;
  reasons: string[];
  warnings: string[];
}

export interface RecommendationResponse {
  prescriptionId?: string;
  topRecommendations: Recommendation[];
  totalCandidatesEvaluated: number;
}

// ── Prescriptions ─────────────────────────────
export interface UploadedPrescription {
  id: string;
  fileName: string;
  fileType: "image" | "pdf";
  uploadedAt: string;
  status: "pending" | "reviewed" | "fulfilled" | "rejected";
  orderId?: string;
}

export type DigitalPrescriptionStatus =
  | "draft"
  | "active"
  | "sent_to_patient"
  | "patient_viewing"
  | "order_placed"
  | "partially_fulfilled"
  | "fulfilled"
  | "expired"
  | "cancelled";

export interface DigitalPrescriptionItem {
  id: string;
  medicineName: string;
  strength: string;
  dose: string;
  frequency: string;
  duration: string;
  quantity: number;
}

export interface DigitalPrescription {
  id: string;
  patientId: string;
  doctorName: string;
  hospitalName?: string;
  diagnosis?: string;
  items: DigitalPrescriptionItem[];
  status: DigitalPrescriptionStatus;
  issuedAt: string;
  expiresAt: string;
  qrCode?: string;
  selectedPharmacyId?: string;
  orderId?: string;
}

// ── Pharmacists ───────────────────────────────
export type PharmacistStatus = "available" | "busy" | "offline";

export interface Pharmacist {
  id: string;
  name: string;
  specialty: string;
  imageUrl: string;
  organization?: string;
  status: PharmacistStatus;
  yearsExperience?: number;
  rating?: number;
  bio?: string;
  email?: string;
  phone?: string;
}

export interface PharmacistBooking {
  id: string;
  pharmacistId: string;
  pharmacistName: string;
  type: string;
  date: string;
  time: string;
  notes: string;
  status: "Confirmed" | "Pending" | "Completed" | "Cancelled";
}

// ── Chat ──────────────────────────────────────
export interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  isMe: boolean;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: "image" | "file";
  attachmentSize?: number;
}

// ── Health / Articles ─────────────────────────
// Categories are free-form strings coming from the backend.
// The list page maps them into a small set of UI tabs.
export type ArticleCategory = string;

export interface HealthArticle {
  id: string;
  slug?: string;            // Phase 11.3 — backend slug for /articles/slug/{slug}
  title: string;
  subtitle: string;
  summary: string;
  fullContent: string;
  imageUrl: string;
  videoUrl?: string;        // optional YouTube/video URL — shown as embedded player in detail view
  source: string;
  category: ArticleCategory;
  readTimeMin: number;
  publishedAt?: Date;
}

// ── Notifications ─────────────────────────────
export type NotificationCategory = "order" | "order_shipped" | "health_tip" | "promo" | "reminder" | "general";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  category: NotificationCategory;
  isRead: boolean;
}

// ── Pharmacy ──────────────────────────────────
export interface Pharmacy {
  id: string;
  name: string;
  locationName: string;
  coordinates: [number, number];
  supportedInsurances: string[];
  isOpen: boolean;
  imageUrl: string;
  province: string;
  district: string;
}

// ── Address ───────────────────────────────────
export interface Address {
  id: string;
  label: string;    // "Home", "Work", etc.
  fullAddress: string;
  sector: string;
  district: string;
  province: string;
  isDefault: boolean;
}

// ── Generic API shapes ────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
