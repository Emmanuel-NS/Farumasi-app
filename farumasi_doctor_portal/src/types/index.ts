// ─────────────────────────────────────────────────────────────────────────────
// FARUMASI Doctor Portal — Core TypeScript Data Models
// ─────────────────────────────────────────────────────────────────────────────

// ── Doctor ───────────────────────────────────────────────────────────────────
export interface Doctor {
  id: string;
  name: string;
  title: string; // "Dr."
  specialty: string;
  subSpecialty?: string;
  licenseNumber: string;
  facility: string;
  department: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  isVerified: boolean;
  createdAt: string;
}

// ── Patient ───────────────────────────────────────────────────────────────────
export type InsuranceProvider =
  | "RSSB"
  | "MMI"
  | "RAMA"
  | "Radiant"
  | "Britam"
  | "UAP"
  | "NONE";

export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "Unknown";

export interface Patient {
  id: string;
  fullName: string;
  dateOfBirth: string; // ISO
  gender: "Male" | "Female" | "Other";
  nationalId: string;
  phone: string;
  email?: string;
  address: string;
  district: string;
  province: string;
  bloodGroup: BloodGroup;
  weight?: number; // kg
  height?: number; // cm
  insurance: InsuranceProvider;
  insuranceMemberId?: string;
  allergies: string[]; // allergy class labels e.g. "Penicillin", "Sulfa"
  chronicConditions: string[];
  lastVisit?: string; // ISO date
  prescriptionCount: number;
  status: "Active" | "Inactive";
  createdAt: string;
}

// ── Medicine ──────────────────────────────────────────────────────────────────
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
  | "Patch";

export interface Medicine {
  id: string;
  genericName: string;
  brandNames: string[];
  category: MedicineCategory;
  dosageForm: DosageForm;
  strength: string; // e.g. "500mg", "25mg/5ml"
  allergyClass: string[]; // e.g. ["Penicillin", "Beta-lactam"]
  controlledSubstance: boolean;
  requiresPrescription: boolean;
  contraindications: string[];
  commonSideEffects: string[];
  insuranceCovered: InsuranceProvider[];
  priceRange: { min: number; max: number }; // RWF
  availability: MedicineAvailability[];
  alternatives: string[]; // medicine IDs
  isEssentialMedicine: boolean; // WHO/Rwanda essential medicine list
  storageConditions: string;
}

// ── Medicine Availability ─────────────────────────────────────────────────────
export interface MedicineAvailability {
  pharmacyId: string;
  pharmacyName: string;
  inStock: boolean;
  stockLevel: "High" | "Medium" | "Low" | "Out";
  stockPercent: number; // 0-100
  price: number; // RWF
  lastUpdated: string; // ISO
  distanceKm: number;
}

// ── Pharmacy ──────────────────────────────────────────────────────────────────
export type PharmacyTier = "Hospital" | "Chain" | "Independent" | "Clinic";

export interface Pharmacy {
  id: string;
  name: string;
  tier: PharmacyTier;
  address: string;
  district: string;
  phone: string;
  email?: string;
  openHours: string;
  isOpen24h: boolean;
  acceptedInsurance: InsuranceProvider[];
  reliabilityScore: number; // 0-100
  fulfillmentRate: number; // 0-100
  avgFulfillmentTimeHours: number;
  distanceKm: number;
  lat?: number;
  lng?: number;
}

// ── Pharmacy Recommendation ───────────────────────────────────────────────────
export interface PharmacyRecommendation {
  pharmacy: Pharmacy;
  completenessScore: number; // % of prescription items in stock
  totalScore: number; // composite score
  availableItems: string[]; // medicine IDs available
  unavailableItems: string[]; // medicine IDs NOT available
  estimatedCost: number; // RWF
  insuranceSaving: number; // RWF
  notes: string[];
}

// ── Insurance & Accessibility ─────────────────────────────────────────────────
export interface InsuranceCoverage {
  provider: InsuranceProvider;
  coveragePercent: number; // e.g. 85
  requiresPreAuth: boolean;
  coveredCategories: MedicineCategory[];
  formularyUrl?: string;
  annualLimit?: number; // RWF
}

export interface AccessibilityScore {
  patientId: string;
  prescriptionId?: string;
  financialScore: number; // 0-100 (100 = fully affordable)
  insuranceScore: number; // 0-100 (100 = all items covered)
  availabilityScore: number; // 0-100 (100 = all items in stock nearby)
  overallScore: number;
  affordableAlternativeExists: boolean;
  notes: string[];
}

// ── Prescription ──────────────────────────────────────────────────────────────
export type PrescriptionStatus =
  | "Draft"
  | "Pending"
  | "Sent"
  | "PartiallyFulfilled"
  | "Fulfilled"
  | "Expired"
  | "Cancelled";

export interface PrescriptionItem {
  id: string;
  medicineId: string;
  medicineName: string;
  genericName: string;
  dosageForm: DosageForm;
  strength: string;
  dose: string; // e.g. "1 tablet"
  frequency: string; // e.g. "Twice daily"
  duration: string; // e.g. "7 days"
  quantity: number;
  instructions: string; // "Take with food", "Avoid sunlight", etc.
  substitutionAllowed: boolean;
  insuranceCovered: boolean;
  estimatedCostRWF: number;
  aiWarnings: string[];
}

export interface Prescription {
  id: string;
  prescriptionNumber: string; // e.g. "RX-2025-00147"
  doctorId: string;
  doctorName: string;
  patientId: string;
  patientName: string;
  facilityName: string;
  diagnosis: string;
  icdCode?: string; // ICD-10
  chiefComplaint: string;
  items: PrescriptionItem[];
  status: PrescriptionStatus;
  pharmacyId?: string;
  pharmacyName?: string;
  qrCode?: string;
  validUntil: string; // ISO
  notes?: string;
  createdAt: string;
  updatedAt: string;
  fulfilledAt?: string;
}

// ── Fulfillment Tracking ──────────────────────────────────────────────────────
export type FulfillmentStatus =
  | "Pending"
  | "Dispatched"
  | "PartiallyFulfilled"
  | "Fulfilled"
  | "Failed"
  | "Substituted";

export interface FulfillmentTracking {
  id: string;
  prescriptionId: string;
  prescriptionNumber: string;
  patientName: string;
  pharmacyName: string;
  status: FulfillmentStatus;
  itemsFulfilled: number;
  itemsTotal: number;
  substitutions: { original: string; substituted: string; reason: string }[];
  failureReason?: string;
  dispatchedAt?: string;
  fulfilledAt?: string;
  patientNotified: boolean;
  createdAt: string;
}

// ── Clinical Note ─────────────────────────────────────────────────────────────
export type NoteType =
  | "SOAP"
  | "Progress"
  | "ConsultNote"
  | "Referral"
  | "LabResult"
  | "Discharge";

export interface ClinicalNote {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  noteType: NoteType;
  title: string;
  // SOAP fields (optional)
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  // Or free text
  content?: string;
  vitals?: {
    bp?: string;
    temp?: string;
    pulse?: number;
    spo2?: number;
    weight?: number;
    glucose?: number;
  };
  linkedPrescriptionId?: string;
  isConfidential: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Medicine Alternative ──────────────────────────────────────────────────────
export type AlternativeReason =
  | "Generic"
  | "TherapeuticEquivalent"
  | "StockSubstitution"
  | "CostOptimization"
  | "InsuranceCoverage";

export interface MedicineAlternative {
  originalMedicineId: string;
  alternativeMedicineId: string;
  alternativeMedicineName: string;
  reason: AlternativeReason;
  equivalenceLevel: "Exact" | "Equivalent" | "Similar";
  costDifference: number; // RWF, negative = cheaper
  availabilityDifference: number; // -100 to +100
  insuranceDifference: "Better" | "Same" | "Worse";
  notes: string;
}

// ── AI / Smart Recommendation ─────────────────────────────────────────────────
export interface SmartRecommendation {
  id: string;
  type:
    | "DrugInteraction"
    | "AllergyAlert"
    | "DosageCheck"
    | "StockAlert"
    | "InsuranceOptimization"
    | "CostReduction";
  severity: "Critical" | "Warning" | "Info" | "Suggestion";
  title: string;
  description: string;
  actionLabel?: string;
  affectedMedicineIds: string[];
  isResolved: boolean;
  resolvedBy?: string;
  createdAt: string;
}

// ── Treatment History ─────────────────────────────────────────────────────────
export interface TreatmentHistory {
  id: string;
  patientId: string;
  prescriptionId: string;
  diagnosis: string;
  medicines: string[];
  outcome: "Improved" | "Resolved" | "Ongoing" | "Worsened" | "Unknown";
  adherenceRate?: number; // 0-100%
  sideEffectsReported: string[];
  visitDate: string;
  followUpDate?: string;
  doctorName: string;
}

// ── Notification ──────────────────────────────────────────────────────────────
export type NotificationType =
  | "FulfillmentUpdate"
  | "StockAlert"
  | "DrugInteractionAlert"
  | "PatientAdmission"
  | "PrescriptionExpiry"
  | "SystemAlert"
  | "ReferralUpdate";

export interface Notification {
  id: string;
  type: NotificationType;
  severity: "Critical" | "Warning" | "Info";
  title: string;
  message: string;
  patientName?: string;
  prescriptionId?: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

// ── Operational Insight ───────────────────────────────────────────────────────
export interface OperationalInsight {
  id: string;
  category:
    | "ShortageAlert"
    | "AdherenceTrend"
    | "FulfillmentRate"
    | "CostTrend"
    | "DiseasePattern";
  title: string;
  summary: string;
  impact: "High" | "Medium" | "Low";
  dataPoints: { label: string; value: number; unit?: string }[];
  recommendation: string;
  affectedMedicines?: string[];
  affectedPharmacies?: string[];
  validUntil: string;
  createdAt: string;
}

// ── Referral ──────────────────────────────────────────────────────────────────
export interface Referral {
  id: string;
  referralNumber: string;
  fromDoctorId: string;
  fromDoctorName: string;
  toDoctorName?: string;
  toFacility: string;
  toSpecialty: string;
  patientId: string;
  patientName: string;
  urgency: "Routine" | "Urgent" | "Emergency";
  reason: string;
  clinicalSummary: string;
  status: "Pending" | "Accepted" | "Declined" | "Completed";
  createdAt: string;
}

// ── Audit Log ─────────────────────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action:
    | "ViewPatient"
    | "CreatePrescription"
    | "UpdatePrescription"
    | "CancelPrescription"
    | "ViewClinicalNote"
    | "CreateClinicalNote"
    | "Login"
    | "Logout"
    | "ExportData";
  resourceType: string;
  resourceId: string;
  resourceLabel: string;
  ipAddress: string;
  userAgent?: string;
  timestamp: string;
}

// ── Dashboard KPI ─────────────────────────────────────────────────────────────
export interface DashboardKPI {
  label: string;
  value: string | number;
  change?: number; // % change
  changeLabel?: string;
  trend: "up" | "down" | "neutral";
  icon?: string;
  color?: "green" | "blue" | "amber" | "red" | "purple";
  subtitle?: string;
}

// ── Utility / AI Scoring ──────────────────────────────────────────────────────
export interface MedicineIntelligence {
  medicineId: string;
  safetyScore: number; // 0-100 for this patient
  affordabilityScore: number; // 0-100
  availabilityScore: number; // 0-100
  insuranceScore: number; // 0-100
  overallScore: number;
  warnings: SmartRecommendation[];
  recommendedPharmacies: PharmacyRecommendation[];
  alternatives: MedicineAlternative[];
}
