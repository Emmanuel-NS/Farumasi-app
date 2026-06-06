// ═══════════════════════════════════════════════════════
// FARUMASI SUPER ADMIN — TYPE SYSTEM
// ═══════════════════════════════════════════════════════

// ─── Enums ──────────────────────────────────────────────
export type UserRole =
  | "Patient" | "Doctor" | "Hospital Admin" | "Pharmacy Admin"
  | "Pharmacist" | "Supplier" | "Rider" | "Admin" | "Super Admin";

export type UserStatus = "Active" | "Pending Verification" | "Restricted" | "Suspended" | "Archived";

export type ProductStatus = "Active" | "Inactive" | "Pending Approval" | "Rejected" | "Suspended";

export type ProductRequestStatus =
  | "Draft" | "Submitted" | "Under Review" | "Requires More Information"
  | "Approved" | "Rejected" | "Suspended";

export type OrderStatus =
  | "Pending" | "Confirmed" | "Processing" | "Ready"
  | "Out for Delivery" | "Delivered" | "Cancelled" | "Failed";

export type FulfillmentStatus = "Pending" | "Fulfilled" | "Partially Fulfilled" | "Failed" | "Cancelled";

export type DeliveryStatus = "Pending" | "Assigned" | "Picked Up" | "In Transit" | "Delivered" | "Failed" | "Returned";

export type WithdrawalStatus = "Pending" | "Under Review" | "Approved" | "Processing" | "Rejected" | "Paid";

export type InsightSeverity = "Critical" | "High" | "Medium" | "Low" | "Info";

export type InsightCategory =
  | "Shortage" | "Fulfillment" | "Performance" | "Compliance"
  | "Security" | "Financial" | "Demand" | "Accessibility";

export type VerificationStatus = "Pending" | "In Review" | "Approved" | "Rejected" | "Suspended";

export type ComplianceStatus = "Compliant" | "Non-Compliant" | "Pending" | "Expired";

export type AuditAction =
  | "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "REJECT"
  | "RESTRICT" | "SUSPEND" | "VERIFY" | "WITHDRAW" | "PAYOUT" | "LOGIN" | "LOGOUT";

export type SecurityEventType =
  | "Failed Login" | "Suspicious Activity" | "Permission Escalation"
  | "API Abuse" | "Data Export" | "Unusual Access" | "Session Anomaly";

export type SecurityEventStatus = "Open" | "Investigating" | "Resolved" | "Dismissed";

export type AdminRole =
  | "Super Admin" | "Operations Admin" | "Finance Admin" | "Compliance Admin"
  | "Pharmacy Admin" | "Hospital Admin" | "Support Admin" | "Analytics Admin";

export type FeatureFlagEnv = "production" | "staging" | "development";

// ─── Platform KPIs ─────────────────────────────────────
export interface PlatformKPIs {
  totalUsers: number;
  activeHospitals: number;
  activePharmacies: number;
  activeSuppliers: number;
  activeDoctors: number;
  totalPrescriptions: number;
  fulfillmentRate: number;
  failedFulfillment: number;
  medicineShortages: number;
  lowStockAlerts: number;
  totalRevenue: number;
  pendingCommissions: number;
  pendingPayouts: number;
  platformHealthScore: number;
  aiRiskScore: number;
  monthlyGrowth: number;
  activeRiders: number;
  pendingVerifications: number;
  openComplaints: number;
}

// ─── Ecosystem Metric ──────────────────────────────────
export interface EcosystemMetric {
  id: string;
  metric: string;
  value: number;
  change: number;
  changeType: "increase" | "decrease" | "neutral";
  period: string;
}

// ─── User ──────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  location?: string;
  district?: string;
  lastActive: string;
  createdAt: string;
  verifiedAt?: string;
}

// ─── Admin User ────────────────────────────────────────
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  permissions: string[];
  status: "Active" | "Inactive";
  lastLogin: string;
  createdAt: string;
}

// ─── Hospital ──────────────────────────────────────────
export interface Hospital {
  id: string;
  name: string;
  shortName: string;
  code: string;
  type: "Public" | "Private" | "Mission" | "Military";
  location: string;
  district: string;
  province: string;
  status: VerificationStatus;
  totalDoctors: number;
  activePrescriptions: number;
  fulfillmentRate: number;
  totalBeds: number;
  adminName: string;
  adminEmail: string;
  phone: string;
  createdAt: string;
  verifiedAt?: string;
}

// ─── Pharmacy ──────────────────────────────────────────
export interface Pharmacy {
  id: string;
  name: string;
  code: string;
  location: string;
  district: string;
  province: string;
  status: VerificationStatus;
  stockLevel: "Good" | "Low" | "Critical";
  fulfillmentRate: number;
  totalFulfillments: number;
  balance: number;
  lastActivity: string;
  adminName: string;
  adminEmail: string;
  phone: string;
  isEmbedded: boolean;
  createdAt: string;
  verifiedAt?: string;
}

// ─── Pharmacist ────────────────────────────────────────
export interface Pharmacist {
  id: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  pharmacyId?: string;
  pharmacyName?: string;
  status: UserStatus;
  verifiedAt?: string;
  createdAt: string;
  lastActive: string;
}

// ─── Doctor ────────────────────────────────────────────
export interface Doctor {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  licenseNumber: string;
  hospitalId?: string;
  hospitalName?: string;
  departmentName?: string;
  status: "Active" | "Pending Verification" | "Restricted" | "Suspended" | "Archived";
  totalPrescriptions: number;
  fulfillmentRate: number;
  lastActive: string;
  createdAt: string;
  verifiedAt?: string;
}

// ─── Supplier ──────────────────────────────────────────
export interface Supplier {
  id: string;
  name: string;
  type: "Manufacturer" | "Distributor" | "Importer" | "Medical Devices";
  location: string;
  district: string;
  status: VerificationStatus;
  totalProducts: number;
  totalRevenue: number;
  balance: number;
  adminName: string;
  adminEmail: string;
  phone: string;
  createdAt: string;
  verifiedAt?: string;
}

// ─── Rider ─────────────────────────────────────────────
export interface Rider {
  id: string;
  name: string;
  email: string;
  phone: string;
  district: string;
  status: UserStatus;
  paymentModel: "Monthly" | "Per Order";
  monthlySalary?: number;
  totalDeliveries: number;
  successRate: number;
  activeDeliveries: number;
  balance: number;
  lastActive: string;
  createdAt: string;
}

// ─── Department ────────────────────────────────────────
export interface Department {
  id: string;
  name: string;
  code: string;
  hospitalId: string;
  hospitalName: string;
  headDoctor?: string;
  activeDoctors: number;
  activePrescriptions: number;
  fulfillmentRate: number;
}

// ─── Product ───────────────────────────────────────────
export interface Product {
  id: string;
  name: string;
  genericName?: string;
  category: string;
  manufacturer: string;
  supplierId: string;
  supplierName: string;
  price: number;
  unit: string;
  status: ProductStatus;
  prescriptionRequired: boolean;
  stockCount: number;
  demand: "High" | "Medium" | "Low";
  approvedAt?: string;
  createdAt: string;
}

// ─── Product Request ───────────────────────────────────
export interface ProductRequest {
  id: string;
  productName: string;
  genericName?: string;
  category: string;
  requestedById: string;
  requestedByName: string;
  requestedByType: "Pharmacy" | "Supplier" | "Hospital";
  status: ProductRequestStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
  rejectionReason?: string;
  documents: string[];
  priority: "Urgent" | "High" | "Normal" | "Low";
}

// ─── Marketplace Listing ───────────────────────────────
export interface MarketplaceListing {
  id: string;
  productId: string;
  productName: string;
  pharmacyId: string;
  pharmacyName: string;
  price: number;
  stockQuantity: number;
  status: "Active" | "Out of Stock" | "Suspended" | "Pending";
  sales30d: number;
  views30d: number;
  lastUpdated: string;
}

// ─── Order ─────────────────────────────────────────────
export interface Order {
  id: string;
  patientName: string;
  pharmacyId: string;
  pharmacyName: string;
  prescriptionId?: string;
  status: OrderStatus;
  items: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  deliveryType: "Pickup" | "Delivery";
}

// ─── Fulfillment Record ────────────────────────────────
export interface FulfillmentRecord {
  id: string;
  orderId: string;
  prescriptionId?: string;
  pharmacyId: string;
  pharmacyName: string;
  status: FulfillmentStatus;
  itemsTotal: number;
  itemsFulfilled: number;
  processingTime: number;
  completedAt?: string;
  createdAt: string;
}

// ─── Delivery ──────────────────────────────────────────
export interface Delivery {
  id: string;
  orderId: string;
  riderId?: string;
  riderName?: string;
  patientName: string;
  district: string;
  status: DeliveryStatus;
  assignedAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

// ─── Prescription (Admin view) ─────────────────────────
export interface PrescriptionRecord {
  id: string;
  patientName: string;
  doctorName: string;
  hospitalName?: string;
  pharmacyName?: string;
  status: "Pending" | "Sent" | "Partially Fulfilled" | "Fulfilled" | "Failed" | "Expired";
  priority: "Urgent" | "High" | "Normal";
  items: number;
  createdAt: string;
  fulfilledAt?: string;
}

// ─── Revenue Record ────────────────────────────────────
export interface RevenueRecord {
  id: string;
  source: string;
  sourceType: "Order" | "Commission" | "Subscription" | "Service Fee" | "Delivery Fee";
  amount: number;
  commission: number;
  date: string;
  status: "Settled" | "Pending" | "Disputed";
}

// ─── Commission Record ─────────────────────────────────
export interface CommissionRecord {
  id: string;
  entityId: string;
  entityType: "Pharmacy" | "Supplier" | "Rider";
  entityName: string;
  transactionId: string;
  amount: number;
  rate: number;
  status: "Pending" | "Settled" | "Disputed";
  createdAt: string;
}

// ─── Withdrawal Request ────────────────────────────────
export interface WithdrawalRequest {
  id: string;
  entityId: string;
  entityType: "Pharmacy" | "Partner Company" | "Supplier" | "Rider" | "Admin";
  entityName: string;
  amount: number;
  status: WithdrawalStatus;
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  notes?: string;
  paymentReference?: string;
  paymentProofUrl?: string;
  method: "Mobile Money" | "Bank Transfer" | "Airtel Money" | "MoMo Code";
  payoutAccount?: string;
  payoutAccountName?: string;
  requesterName?: string;
  requesterEmail?: string;
}

// ─── AI Insight ────────────────────────────────────────
export interface AIInsight {
  id: string;
  title: string;
  summary: string;
  category: InsightCategory;
  severity: InsightSeverity;
  recommendation: string;
  affectedEntities: string[];
  confidence: number;
  status: "Active" | "Acknowledged" | "Resolved";
  createdAt: string;
}

// ─── Demand Forecast ──────────────────────────────────
export interface DemandForecast {
  id: string;
  productName: string;
  category: string;
  currentDemand: number;
  forecastedDemand: number;
  change: number;
  region: string;
  period: string;
  confidence: number;
}

// ─── Shortage Alert ───────────────────────────────────
export interface ShortageAlert {
  id: string;
  productName: string;
  category: string;
  severity: InsightSeverity;
  affectedPharmacies: number;
  affectedDistricts: string[];
  currentStock: number;
  estimatedRestock: string;
  riskScore: number;
  createdAt: string;
}

// ─── Verification Request ──────────────────────────────
export interface VerificationRequest {
  id: string;
  entityId: string;
  entityType: "Hospital" | "Pharmacy" | "Supplier" | "Doctor" | "Pharmacist";
  entityName: string;
  status: VerificationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewer?: string;
  documents: string[];
  notes?: string;
  priority: "Urgent" | "High" | "Normal";
}

// ─── Compliance Record ────────────────────────────────
export interface ComplianceRecord {
  id: string;
  entityId: string;
  entityType: "Hospital" | "Pharmacy" | "Supplier" | "Doctor";
  entityName: string;
  checkType: string;
  dueDate: string;
  status: ComplianceStatus;
  completedAt?: string;
  verifiedBy?: string;
  notes?: string;
}

// ─── Audit Log ────────────────────────────────────────
export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: AdminRole;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  resourceLabel: string;
  details?: string;
  ipAddress: string;
  createdAt: string;
}

// ─── Security Event ───────────────────────────────────
export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: InsightSeverity;
  description: string;
  ipAddress: string;
  userId?: string;
  userName?: string;
  status: SecurityEventStatus;
  createdAt: string;
}

// ─── System Notification ──────────────────────────────
export interface SystemNotification {
  id: string;
  type: "Alert" | "Warning" | "Info" | "Success" | "Critical";
  title: string;
  message: string;
  isRead: boolean;
  category: string;
  createdAt: string;
  link?: string;
}

// ─── Feature Flag ─────────────────────────────────────
export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  environments: FeatureFlagEnv[];
  updatedAt: string;
}

// ─── Integration ─────────────────────────────────────
export interface Integration {
  id: string;
  name: string;
  type: "Payment" | "SMS" | "Email" | "EHR" | "Insurance" | "Logistics" | "Analytics";
  provider: string;
  status: "Connected" | "Disconnected" | "Error" | "Pending";
  lastSync?: string;
  description: string;
}

// ─── Availability Data ───────────────────────────────
export interface AvailabilityRecord {
  id: string;
  productName: string;
  category: string;
  totalListings: number;
  availablePharmacies: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  coveragePercent: number;
  stockStatus: "Adequate" | "Low" | "Critical" | "Out of Stock";
}

// ─── Analytics Time-Series ───────────────────────────
export interface AnalyticsSeries {
  date: string;
  prescriptions: number;
  fulfillments: number;
  failures: number;
  revenue: number;
  newUsers: number;
  orders: number;
}

// ─── Finance Summary ─────────────────────────────────
export interface FinanceSummary {
  totalRevenue: number;
  revenueGrowth: number;
  commissionEarned: number;
  pendingPayouts: number;
  processedPayouts: number;
  disputedAmount: number;
}
