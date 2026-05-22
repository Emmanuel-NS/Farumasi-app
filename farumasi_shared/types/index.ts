// ═══════════════════════════════════════════════════════════════════════════════
// FARUMASI SHARED TYPE SYSTEM
// Canonical models used across all portals. Each portal imports from here.
// All IDs, status enums, and entity shapes are authoritative in this file.
// ═══════════════════════════════════════════════════════════════════════════════

// ── Roles ─────────────────────────────────────────────────────────────────────
export type UserRole =
  | "patient"
  | "doctor"
  | "hospital_admin"
  | "pharmacist"
  | "pharmacy_admin"
  | "partner_admin"
  | "rider"
  | "super_admin";

export type UserStatus = "active" | "inactive" | "suspended" | "pending_verification" | "restricted";

// ── Insurance ─────────────────────────────────────────────────────────────────
export type InsuranceProvider =
  | "RSSB"
  | "MMI"
  | "RAMA"
  | "Radiant"
  | "Britam"
  | "UAP"
  | "NONE";

// ── Core User ─────────────────────────────────────────────────────────────────
export interface User {
  id: string;           // u-xxx
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  district?: string;
  province?: string;
  createdAt: string;    // ISO
  lastActive?: string;  // ISO
}

// ── Patient ───────────────────────────────────────────────────────────────────
export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "Unknown";

export interface Patient extends User {
  role: "patient";
  dateOfBirth: string;
  gender: "Male" | "Female" | "Other";
  nationalId: string;
  bloodGroup: BloodGroup;
  weight?: number;           // kg
  height?: number;           // cm
  insurance: InsuranceProvider;
  insuranceMemberId?: string;
  allergies: string[];       // e.g. ["Penicillin", "Sulfa"]
  chronicConditions: string[];
  address: string;
}

// ── Doctor ────────────────────────────────────────────────────────────────────
export interface Doctor extends User {
  role: "doctor";
  title: string;             // "Dr."
  specialty: string;
  subSpecialty?: string;
  licenseNumber: string;
  hospitalId: string;        // h-xxx
  hospitalName: string;
  department: string;
  isVerified: boolean;
}

// ── Hospital ──────────────────────────────────────────────────────────────────
export interface Hospital {
  id: string;                // h-xxx
  name: string;
  type: "Public" | "Private" | "Mission" | "Clinic";
  address: string;
  district: string;
  province: string;
  phone: string;
  email?: string;
  adminId: string;           // u-xxx with role hospital_admin
  departmentCount: number;
  doctorCount: number;
  isVerified: boolean;
  status: "active" | "suspended" | "pending";
  createdAt: string;
}

// ── Department ────────────────────────────────────────────────────────────────
export interface Department {
  id: string;                // dept-xxx
  hospitalId: string;
  name: string;
  headDoctorId?: string;
  doctorCount: number;
  status: "active" | "inactive";
}

// ── Pharmacist ────────────────────────────────────────────────────────────────
export interface Pharmacist extends User {
  role: "pharmacist";
  licenseNumber: string;
  isVerified: boolean;
}

// ── Pharmacy (Business) ───────────────────────────────────────────────────────
export type PharmacyType = "standalone" | "hospital_attached" | "chain_branch" | "clinic";
export type CompanyType =
  | "pharmacy"
  | "supplier"
  | "device_company"
  | "distributor"
  | "wellness"
  | "importer"
  | "specialized";

export interface Pharmacy {
  id: string;                // pha-xxx
  name: string;
  type: PharmacyType;
  companyType: CompanyType;
  address: string;
  district: string;
  province: string;
  lat: number;
  lng: number;
  phone: string;
  email?: string;
  openHours: string;
  isOpen24h: boolean;
  acceptedInsurance: InsuranceProvider[];
  reliabilityScore: number;  // 0-100
  fulfillmentRate: number;   // 0-100 percent
  avgFulfillmentTimeHours: number;
  totalCompletedOrders: number;
  cancellationRate: number;  // 0-100 percent
  isVerified: boolean;
  status: "active" | "suspended" | "pending";
  adminId: string;           // u-xxx with role pharmacy_admin or partner_admin
  createdAt: string;
}

// ── Medicine / Product Catalogue ──────────────────────────────────────────────
export type MedicineCategory =
  | "Analgesic"
  | "Antibiotic"
  | "Antimalarial"
  | "Antidiabetic"
  | "Antihypertensive"
  | "Antiparasitic"
  | "Antifungal"
  | "Antiretroviral"
  | "Vitamin/Supplement"
  | "GI/Gastro"
  | "Respiratory"
  | "Cardiovascular"
  | "Neurological"
  | "Ophthalmology"
  | "Dermatology"
  | "Medical Device"
  | "Diagnostics"
  | "Wellness"
  | "Other";

export type DosageForm =
  | "Tablet"
  | "Capsule"
  | "Syrup"
  | "Injection"
  | "Suppository"
  | "Cream"
  | "Drops"
  | "Inhaler"
  | "Powder"
  | "Patch"
  | "Device"
  | "Kit";

export type ProductStatus = "approved" | "pending_review" | "rejected" | "suspended" | "withdrawn";

/** Master catalogue entry — controlled by pharmacist/super admin, RFDA-approved */
export interface CatalogueProduct {
  id: string;                // cat-xxx
  genericName: string;
  brandNames: string[];
  category: MedicineCategory;
  dosageForm: DosageForm;
  strength: string;          // e.g. "500mg", "25mg/5ml"
  manufacturer: string;
  rfidaApprovalNo?: string;
  allergyClass: string[];    // e.g. ["Penicillin", "Beta-lactam"]
  controlledSubstance: boolean;
  requiresPrescription: boolean;
  contraindications: string[];
  commonSideEffects: string[];
  insuranceCovered: InsuranceProvider[];
  isEssentialMedicine: boolean;
  storageConditions: string;
  description: string;
  status: ProductStatus;
  imageUrl?: string;
  createdAt: string;
  approvedBy?: string;       // pharmacist user id
}

/** Pharmacy/partner listing of an approved catalogue product */
export interface ProductListing {
  id: string;                // lst-xxx
  catalogueProductId: string; // cat-xxx
  pharmacyId: string;        // pha-xxx
  price: number;             // RWF
  comparePrice?: number;
  stockQty: number;
  reorderThreshold: number;
  maxStock: number;
  isAvailable: boolean;
  deliveryAvailable: boolean;
  pickupAvailable: boolean;
  acceptedInsurance: InsuranceProvider[];
  batchNumber?: string;
  expiryDate?: string;       // ISO date
  daysUntilExpiry?: number;
  lastRestocked?: string;    // ISO date
  updatedAt: string;
}

/** Pharmacy's request to add a new product to the catalogue */
export type ProductRequestStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "requires_info"
  | "approved"
  | "rejected";

export interface ProductRequest {
  id: string;                // preq-xxx
  pharmacyId: string;
  pharmacyName: string;
  requestedBy: string;       // user id
  productName: string;
  genericName?: string;
  manufacturer: string;
  category: MedicineCategory;
  dosageForm?: DosageForm;
  strength?: string;
  reason: string;
  supportingDocUrl?: string;
  status: ProductRequestStatus;
  reviewNotes?: string;
  reviewedBy?: string;       // pharmacist user id
  submittedAt: string;
  reviewedAt?: string;
  resolvedAt?: string;
}

// ── Prescription ──────────────────────────────────────────────────────────────
export type PrescriptionStatus =
  | "draft"
  | "active"
  | "sent_to_patient"
  | "patient_viewing"
  | "order_placed"
  | "partially_fulfilled"
  | "fulfilled"
  | "expired"
  | "cancelled";

export type PrescriptionSource = "doctor_digital" | "patient_upload" | "walk_in";

export interface PrescriptionItem {
  id: string;
  catalogueProductId: string;  // cat-xxx
  medicineName: string;
  genericName: string;
  dosageForm: DosageForm;
  strength: string;
  dose: string;                // e.g. "1 tablet"
  frequency: string;           // e.g. "Twice daily"
  duration: string;            // e.g. "7 days"
  quantity: number;
  instructions: string;
  substitutionAllowed: boolean;
  insuranceCovered: boolean;
  estimatedCostRWF: number;
}

export interface Prescription {
  id: string;                  // rx-xxx
  source: PrescriptionSource;
  patientId: string;           // u-xxx
  patientName: string;
  doctorId?: string;           // u-xxx (null for uploaded prescriptions)
  doctorName?: string;
  hospitalId?: string;
  hospitalName?: string;
  items: PrescriptionItem[];
  diagnosis?: string;
  notes?: string;
  status: PrescriptionStatus;
  uploadedImageUrl?: string;   // for uploaded prescriptions
  qrCode?: string;
  issuedAt: string;            // ISO
  expiresAt: string;           // ISO (typically 30 days)
  sentToPatientAt?: string;
  fulfilledAt?: string;
  selectedPharmacyId?: string; // pha-xxx — chosen by patient
}

// ── Pharmacy Recommendation ───────────────────────────────────────────────────
export interface PharmacyRecommendationReason {
  code:
    | "accepts_insurance"
    | "has_all_medicines"
    | "partial_stock"
    | "closest_option"
    | "lowest_cost"
    | "fastest_delivery"
    | "best_overall"
    | "high_reliability"
    | "delivery_available";
  label: string;
}

export interface PharmacyRecommendationWarning {
  code:
    | "incomplete_stock"
    | "expiry_soon"
    | "no_delivery"
    | "insurance_not_covered"
    | "high_price"
    | "low_reliability";
  label: string;
}

export interface PharmacyRecommendation {
  pharmacyId: string;
  pharmacyName: string;
  pharmacyAddress: string;
  pharmacyPhone: string;
  totalScore: number;          // 0-100
  availabilityScore: number;
  insuranceScore: number;
  priceScore: number;
  locationScore: number;
  deliveryScore: number;
  reliabilityScore: number;
  expirySafetyScore: number;
  reasons: PharmacyRecommendationReason[];
  warnings: PharmacyRecommendationWarning[];
  estimatedTotalPrice: number; // RWF
  estimatedDistance: number;   // km
  estimatedDeliveryMinutes: number;
  canFulfillCompletePrescription: boolean;
  availableItemCount: number;
  totalItemCount: number;
  insuranceSaving: number;     // RWF
  rank: 1 | 2 | 3;
}

// ── Order ─────────────────────────────────────────────────────────────────────
export type OrderStatus =
  | "pending_review"
  | "finding_pharmacy"
  | "pharmacy_accepted"
  | "payment_pending"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "rider_assigned"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "failed";

export type PaymentMethod = "mobile_money" | "card" | "cash" | "insurance" | "wallet";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "partial";
export type FulfillmentType = "delivery" | "pickup";

export interface OrderItem {
  id: string;
  catalogueProductId: string;
  productName: string;
  genericName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  requiresPrescription: boolean;
  prescriptionItemId?: string;
}

export interface Order {
  id: string;                  // ord-xxx
  prescriptionId?: string;     // rx-xxx (null for OTC orders)
  patientId: string;           // u-xxx
  patientName: string;
  patientPhone: string;
  pharmacyId: string;          // pha-xxx
  pharmacyName: string;
  items: OrderItem[];
  subtotal: number;            // RWF
  deliveryFee: number;         // RWF
  insuranceDiscount: number;   // RWF
  commissionAmount: number;    // RWF (platform fee)
  totalAmount: number;         // RWF
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  fulfillmentType: FulfillmentType;
  deliveryAddress?: string;
  status: OrderStatus;
  riderId?: string;            // u-xxx
  riderName?: string;
  riderPhone?: string;
  deliveryId?: string;         // del-xxx
  qrCode?: string;
  notes?: string;
  placedAt: string;            // ISO
  confirmedAt?: string;
  readyAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

// ── Delivery ──────────────────────────────────────────────────────────────────
export type DeliveryStatus =
  | "pending_assignment"
  | "assigned"
  | "rider_en_route_pickup"
  | "picked_up"
  | "out_for_delivery"
  | "delivered"
  | "failed"
  | "returned";

export type RiderPaymentModel = "per_trip" | "weekly" | "monthly";
export type VehicleType = "motorcycle" | "bicycle" | "car" | "walking";

export interface Delivery {
  id: string;                  // del-xxx
  orderId: string;             // ord-xxx
  riderId?: string;            // u-xxx
  riderName?: string;
  riderPhone?: string;
  pharmacyId: string;
  pharmacyName: string;
  pickupAddress: string;
  deliveryAddress: string;
  patientName: string;
  patientPhone: string;
  status: DeliveryStatus;
  rejectionReason?: string;
  qrCode: string;
  qrConfirmedAt?: string;
  estimatedMinutes: number;
  actualMinutes?: number;
  distanceKm: number;
  tripFee: number;             // RWF
  assignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  notes?: string;
}

// ── Rider ─────────────────────────────────────────────────────────────────────
export interface Rider extends User {
  role: "rider";
  vehicleType: VehicleType;
  vehiclePlate?: string;
  paymentModel: RiderPaymentModel;
  riderStatus: "available" | "on_delivery" | "off_duty";
  totalDeliveries: number;
  completionRate: number;      // 0-100 percent
  avgRating: number;           // 1-5
  currentOrderId?: string;
  monthlyEarnings: number;     // RWF
  weeklyEarnings: number;      // RWF
  perTripRate?: number;        // RWF (for per_trip model)
  weeklyRate?: number;         // RWF (for weekly model)
  monthlyRate?: number;        // RWF (for monthly model)
  zone?: string;
}

// ── Revenue & Finance ─────────────────────────────────────────────────────────
export type CommissionStatus = "pending" | "settled" | "disputed" | "waived";

export interface RevenueRecord {
  id: string;                  // rev-xxx
  orderId: string;
  pharmacyId: string;
  pharmacyName: string;
  orderAmount: number;         // RWF gross
  commissionRate: number;      // percent e.g. 5.0
  commissionAmount: number;    // RWF
  deliveryFee: number;         // RWF
  netToPharmacy: number;       // RWF
  status: CommissionStatus;
  recordedAt: string;
  settledAt?: string;
}

export interface WithdrawalRequest {
  id: string;                  // wdl-xxx
  pharmacyId: string;
  pharmacyName: string;
  amount: number;              // RWF
  bankName?: string;
  accountNumber?: string;
  mobileMoneyNumber?: string;
  status: "pending" | "approved" | "processed" | "rejected";
  requestedAt: string;
  processedAt?: string;
  notes?: string;
}

// ── Health Article ────────────────────────────────────────────────────────────
export type ArticleStatus = "draft" | "published" | "archived";
export type ArticleCategory =
  | "General Health"
  | "Maternal Health"
  | "Child Health"
  | "Nutrition"
  | "Mental Health"
  | "Medication Guide"
  | "Disease Prevention"
  | "Chronic Conditions"
  | "First Aid"
  | "Sexual Health";

export interface HealthArticle {
  id: string;                  // art-xxx
  title: string;
  summary: string;
  content: string;             // HTML or markdown
  category: ArticleCategory;
  tags: string[];
  imageUrl?: string;
  authorId: string;            // pharmacist user id
  authorName: string;
  status: ArticleStatus;
  viewCount: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Notification ──────────────────────────────────────────────────────────────
export type NotificationCategory =
  | "prescription"
  | "order"
  | "delivery"
  | "product"
  | "system"
  | "recommendation"
  | "compliance"
  | "finance";

export interface AppNotification {
  id: string;                  // notif-xxx
  recipientId: string;         // u-xxx
  recipientRole: UserRole;
  category: NotificationCategory;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  relatedEntityId?: string;    // orderId, prescriptionId, etc.
  createdAt: string;
}

// ── Audit Log ─────────────────────────────────────────────────────────────────
export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "APPROVE"
  | "REJECT"
  | "SUSPEND"
  | "VERIFY"
  | "LOGIN"
  | "LOGOUT"
  | "ORDER_PLACED"
  | "ORDER_STATUS_CHANGED"
  | "PRESCRIPTION_ISSUED"
  | "DELIVERY_ASSIGNED"
  | "DELIVERY_COMPLETED"
  | "WITHDRAWAL_REQUESTED"
  | "PAYOUT_PROCESSED";

export interface AuditLog {
  id: string;                  // aud-xxx
  action: AuditAction;
  entityType: string;          // "prescription", "order", "product", etc.
  entityId: string;
  description: string;
  performedBy: string;         // user id
  performedByName: string;
  performedByRole: UserRole;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;           // ISO
}

// ── Platform Analytics ────────────────────────────────────────────────────────
export interface PlatformKPI {
  label: string;
  value: number;
  change: number;              // percent change vs previous period
  changeType: "increase" | "decrease" | "neutral";
  period: string;
}

export interface AIInsight {
  id: string;                  // insight-xxx
  severity: "critical" | "high" | "medium" | "low" | "info";
  category:
    | "shortage"
    | "fulfillment"
    | "compliance"
    | "financial"
    | "demand"
    | "accessibility"
    | "performance";
  title: string;
  description: string;
  affectedEntities: string[];
  suggestedAction?: string;
  isResolved: boolean;
  resolvedBy?: string;
  createdAt: string;
  resolvedAt?: string;
}

// ── Medicine Availability (cross-portal) ─────────────────────────────────────
/** Used by doctor and patient portals to check where a medicine is stocked */
export interface MedicineAvailabilityRecord {
  catalogueProductId: string;  // cat-xxx
  medicineName: string;
  pharmacyId: string;          // pha-xxx
  pharmacyName: string;
  pharmacyDistrict: string;
  pharmacyLat: number;
  pharmacyLng: number;
  isAvailable: boolean;
  stockLevel: "High" | "Medium" | "Low" | "Out";
  stockPercent: number;        // 0-100
  price: number;               // RWF
  expiryDate?: string;
  daysUntilExpiry?: number;
  deliveryAvailable: boolean;
  acceptedInsurance: InsuranceProvider[];
  lastUpdated: string;
}
