// ─── Hospital ─────────────────────────────────────────────────────────────────
export interface Hospital {
  id: string;
  name: string;
  shortName: string;
  type: "General" | "Specialized" | "Teaching" | "District" | "Referral";
  location: string;
  district: string;
  province: string;
  phone: string;
  email: string;
  status: "Active" | "Suspended" | "Pending";
  adminName: string;
  adminEmail: string;
  totalBeds: number;
  totalDoctors: number;
  totalDepartments: number;
  createdAt: string;
}

// ─── Department ───────────────────────────────────────────────────────────────
export interface Department {
  id: string;
  name: string;
  code: string;
  headId: string;
  headName: string;
  totalDoctors: number;
  activePrescriptions: number;
  totalPrescriptions: number;
  fulfillmentRate: number;
  status: "Active" | "Inactive";
  floor: string;
  extension: string;
  createdAt: string;
}

// ─── Doctor ───────────────────────────────────────────────────────────────────
export type DoctorStatus = "Active" | "Pending Verification" | "Restricted" | "Suspended" | "Archived";

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  departmentId: string;
  departmentName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  nationalId: string;
  qualification: string;
  status: DoctorStatus;
  totalPrescriptions: number;
  fulfillmentRate: number;
  avgResponseTime: number; // minutes
  joinedAt: string;
  lastActive: string;
  notes?: string;
}

// ─── Staff ────────────────────────────────────────────────────────────────────
export type StaffRole =
  | "Super Hospital Admin"
  | "Hospital Admin"
  | "Department Head"
  | "Doctor"
  | "Pharmacist"
  | "Operations Staff"
  | "Finance Staff"
  | "Support Staff";

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  departmentId?: string;
  departmentName?: string;
  email: string;
  phone: string;
  status: "Active" | "Inactive" | "Suspended";
  lastLogin: string;
  createdAt: string;
  permissions: string[];
}

// ─── Permission & Role ────────────────────────────────────────────────────────
export interface Permission {
  id: string;
  name: string;
  description: string;
  category: "Clinical" | "Administrative" | "Financial" | "System";
}

export interface Role {
  id: string;
  name: StaffRole;
  description: string;
  permissions: string[];
  totalMembers: number;
  isSystem: boolean;
}

// ─── Patient ──────────────────────────────────────────────────────────────────
export type PatientStatus = "Active" | "Discharged" | "Referred" | "Deceased";

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: "Male" | "Female";
  nationalId: string;
  phone: string;
  district: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  primaryDoctorId: string;
  primaryDoctorName: string;
  departmentId: string;
  departmentName: string;
  status: PatientStatus;
  diagnosis: string;
  admittedAt: string;
  lastVisit: string;
}

// ─── Prescription ─────────────────────────────────────────────────────────────
export type PrescriptionStatus = "Pending" | "Sent" | "Partially Fulfilled" | "Fulfilled" | "Failed" | "Expired";

export interface PrescriptionItem {
  medicineId: string;
  medicineName: string;
  genericName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  unit: string;
  available: boolean;
  notes?: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  doctorId: string;
  doctorName: string;
  departmentId: string;
  departmentName: string;
  items: PrescriptionItem[];
  status: PrescriptionStatus;
  priority: "Urgent" | "High" | "Normal" | "Low";
  insuranceCovered: boolean;
  insuranceProvider?: string;
  diagnosis: string;
  notes?: string;
  createdAt: string;
  sentAt?: string;
  fulfilledAt?: string;
  expiresAt: string;
}

// ─── Fulfillment ──────────────────────────────────────────────────────────────
export type FulfillmentStatus = "Fulfilled" | "Partially Fulfilled" | "Failed" | "Pending" | "Cancelled";

export interface FulfillmentRecord {
  id: string;
  prescriptionId: string;
  patientName: string;
  doctorName: string;
  pharmacyId: string;
  pharmacyName: string;
  status: FulfillmentStatus;
  itemsTotal: number;
  itemsFulfilled: number;
  failureReason?: string;
  failureCategory?: "Stock" | "Insurance" | "Expired" | "Partial" | "System";
  processingTime: number; // minutes
  createdAt: string;
  completedAt?: string;
}

// ─── Medicine ─────────────────────────────────────────────────────────────────
export type MedicineCategory =
  | "Antimalarial"
  | "Antibiotic"
  | "Antidiabetic"
  | "Antihypertensive"
  | "Analgesic"
  | "Antiparasitic"
  | "Nutritional"
  | "Gastrointestinal"
  | "Antiviral"
  | "Psychiatric"
  | "Cardiovascular"
  | "Respiratory"
  | "Other";

export type ShortageLevel = "Critical" | "High" | "Medium" | "Low";

export interface MedicineShortage {
  id: string;
  medicineName: string;
  genericName: string;
  category: MedicineCategory;
  affectedPharmacies: number;
  totalPharmacies: number;
  severity: ShortageLevel;
  alternativeAvailable: boolean;
  alternativeName?: string;
  impactedPrescriptions: number;
  estimatedRestock?: string;
  reportedAt: string;
}

// ─── Operational Insight ──────────────────────────────────────────────────────
export type InsightCategory = "Shortage" | "Fulfillment" | "Performance" | "Compliance" | "Coordination" | "Financial";
export type InsightImpact = "High" | "Medium" | "Low";

export interface OperationalInsight {
  id: string;
  title: string;
  summary: string;
  category: InsightCategory;
  impact: InsightImpact;
  actionable: boolean;
  suggestedAction?: string;
  relatedEntityId?: string;
  relatedEntityType?: "Doctor" | "Department" | "Pharmacy" | "Medicine";
  createdAt: string;
}

// ─── Pharmacy Partner ─────────────────────────────────────────────────────────
export interface PharmacyPartner {
  id: string;
  name: string;
  location: string;
  district: string;
  phone: string;
  email: string;
  status: "Active" | "Inactive" | "Suspended";
  fulfillmentRate: number;
  totalFulfillments: number;
  avgProcessingTime: number; // minutes
  acceptedInsurance: string[];
  stockLevel: "Good" | "Low" | "Critical";
  lastActivity: string;
  joinedAt: string;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────
export type AuditSeverity = "Info" | "Warning" | "Critical";

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  resourceLabel: string;
  severity: AuditSeverity;
  ipAddress: string;
  metadata?: Record<string, string>;
  createdAt: string;
}

// ─── Compliance ───────────────────────────────────────────────────────────────
export type ComplianceStatus = "Compliant" | "Pending" | "Non-Compliant" | "Expired";

export interface ComplianceRecord {
  id: string;
  entityId: string;
  entityName: string;
  entityType: "Doctor" | "Department" | "Hospital" | "Staff";
  checkType: string;
  status: ComplianceStatus;
  dueDate: string;
  completedAt?: string;
  verifiedBy?: string;
  notes?: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────
export type NotificationType = "Alert" | "Info" | "Warning" | "Success";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  severity: "Critical" | "High" | "Medium" | "Low";
  isRead: boolean;
  relatedEntityId?: string;
  relatedEntityType?: string;
  createdAt: string;
}

// ─── Referral ─────────────────────────────────────────────────────────────────
export type ReferralStatus = "Pending" | "Accepted" | "Completed" | "Cancelled" | "Rejected";
export type ReferralPriority = "Urgent" | "High" | "Normal" | "Low";

export interface Referral {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  fromDoctorId: string;
  fromDoctorName: string;
  fromDepartmentId: string;
  fromDepartmentName: string;
  toSpecialty: string;
  toDoctorId?: string;
  toDoctorName?: string;
  status: ReferralStatus;
  priority: ReferralPriority;
  clinicalSummary: string;
  diagnosis: string;
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
}

// ─── Insurance ────────────────────────────────────────────────────────────────
export interface InsuranceClaim {
  id: string;
  prescriptionId: string;
  patientName: string;
  provider: string;
  amount: number;
  status: "Approved" | "Pending" | "Rejected" | "Under Review";
  submittedAt: string;
  processedAt?: string;
  rejectionReason?: string;
}

// ─── Analytics Record ─────────────────────────────────────────────────────────
export interface AnalyticsRecord {
  date: string;
  prescriptions: number;
  fulfillments: number;
  failures: number;
  fulfillmentRate: number;
  avgProcessingTime: number;
  insuranceClaims: number;
}

// ─── Dashboard KPIs ───────────────────────────────────────────────────────────
export interface DashboardKPIs {
  totalDoctors: number;
  activeDoctors: number;
  pendingDoctors: number;
  restrictedDoctors: number;
  totalPrescriptionsToday: number;
  fulfilledToday: number;
  failedToday: number;
  fulfillmentRate: number;
  medicineShortages: number;
  criticalShortages: number;
  insuranceFailures: number;
  activePatients: number;
  pendingReferrals: number;
  openComplaints: number;
  complianceScore: number;
}
