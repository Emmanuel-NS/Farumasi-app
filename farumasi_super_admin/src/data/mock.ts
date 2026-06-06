import type {
  PlatformKPIs, EcosystemMetric, User, Hospital, Pharmacy, Pharmacist, Doctor,
  Supplier, Rider, Department, Product, ProductRequest, MarketplaceListing, Order,
  FulfillmentRecord, Delivery, PrescriptionRecord, RevenueRecord, CommissionRecord,
  WithdrawalRequest, AIInsight, DemandForecast, ShortageAlert, VerificationRequest,
  ComplianceRecord, AuditLog, SecurityEvent, SystemNotification, FeatureFlag,
  Integration, AvailabilityRecord, AnalyticsSeries, FinanceSummary, AdminUser,
  VerificationStatus,
} from "@/types";

// ─── Platform KPIs ────────────────────────────────────────────────────────────
export const mockKPIs: PlatformKPIs = {
  totalUsers: 14830,
  activeHospitals: 47,
  activePharmacies: 312,
  activeSuppliers: 84,
  activeDoctors: 1923,
  totalPrescriptions: 68420,
  fulfillmentRate: 87.4,
  failedFulfillment: 3201,
  medicineShortages: 23,
  lowStockAlerts: 87,
  totalRevenue: 284500000,
  pendingCommissions: 12300000,
  pendingPayouts: 9800000,
  platformHealthScore: 84,
  aiRiskScore: 32,
  monthlyGrowth: 12.4,
  activeRiders: 218,
  pendingVerifications: 34,
  openComplaints: 12,
};

// ─── Ecosystem Metrics ────────────────────────────────────────────────────────
export const mockEcosystemMetrics: EcosystemMetric[] = [
  { id: "em1", metric: "New Users (30d)", value: 1840, change: 14.2, changeType: "increase", period: "vs last 30d" },
  { id: "em2", metric: "Active Sessions", value: 4230, change: 8.1, changeType: "increase", period: "today" },
  { id: "em3", metric: "Prescriptions Today", value: 1247, change: 5.3, changeType: "increase", period: "vs yesterday" },
  { id: "em4", metric: "Fulfillment Rate", value: 87.4, change: 1.8, changeType: "increase", period: "vs last week" },
  { id: "em5", metric: "Failed Fulfillments", value: 89, change: 3.2, changeType: "decrease", period: "today" },
  { id: "em6", metric: "Revenue Today", value: 3840000, change: 22.1, changeType: "increase", period: "vs yesterday" },
  { id: "em7", metric: "Pending Verifications", value: 34, change: 6, changeType: "increase", period: "this week" },
  { id: "em8", metric: "Medicine Shortages", value: 23, change: 2, changeType: "decrease", period: "vs last week" },
];

// ─── Analytics Time-Series ────────────────────────────────────────────────────
function makeDate(daysAgo: number): string {
  const d = new Date(); d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}
export const mockAnalyticsSeries: AnalyticsSeries[] = Array.from({ length: 30 }, (_, i) => ({
  date: makeDate(29 - i),
  prescriptions: 900 + Math.floor(Math.random() * 600),
  fulfillments: 750 + Math.floor(Math.random() * 500),
  failures: 30 + Math.floor(Math.random() * 80),
  revenue: 2000000 + Math.floor(Math.random() * 3000000),
  newUsers: 40 + Math.floor(Math.random() * 80),
  orders: 200 + Math.floor(Math.random() * 300),
}));

// ─── Finance Summary ─────────────────────────────────────────────────────────
export const mockFinanceSummary: FinanceSummary = {
  totalRevenue: 284500000,
  revenueGrowth: 18.3,
  commissionEarned: 42600000,
  pendingPayouts: 9800000,
  processedPayouts: 168000000,
  disputedAmount: 1200000,
};

// ─── Users ────────────────────────────────────────────────────────────────────
const userNames = ["Amina Uwase", "Jean-Claude Ndayisaba", "Grace Mukamana", "Patrick Habimana", "Solange Umubyeyi", "Eric Nzeyimana", "Diane Mukamwiza", "Claude Bizimana", "Esperance Nyiraneza", "Ivan Hakizimana", "Marie Ingabire", "Pacifique Nsabimana", "Alice Uwimana", "Robert Gakuru", "Vestine Uwingabire", "Alexis Mugisha", "Christine Uwimana", "Daniel Nshimiyimana", "Francoise Muhimpundu", "Gilbert Ndagijimana"];
const districts = ["Gasabo", "Kicukiro", "Nyarugenge", "Musanze", "Huye", "Rubavu", "Kayonza", "Rwamagana"];

export const mockUsers: User[] = Array.from({ length: 40 }, (_, i) => ({
  id: `u${i + 1}`,
  name: userNames[i % userNames.length],
  email: `user${i + 1}@farumasi.rw`,
  phone: `+25078${String(1000000 + i * 37).slice(0, 7)}`,
  role: (["Patient", "Doctor", "Pharmacy Admin", "Pharmacist", "Supplier", "Rider"] as const)[i % 6],
  status: (["Active", "Active", "Active", "Pending Verification", "Restricted", "Suspended"] as const)[i % 6] as User["status"],
  location: districts[i % districts.length],
  district: districts[i % districts.length],
  lastActive: makeDate(i % 14),
  createdAt: makeDate(30 + i * 5),
}));

// ─── Hospitals ───────────────────────────────────────────────────────────────
const hospitalData = [
  { name: "King Faisal Hospital", short: "KFH", code: "KFH-001", type: "Private" as const, location: "Kigali", district: "Gasabo", province: "Kigali", doctors: 187, beds: 450 },
  { name: "CHUK University Hospital", short: "CHUK", code: "CHUK-001", type: "Public" as const, location: "Kigali", district: "Nyarugenge", province: "Kigali", doctors: 312, beds: 600 },
  { name: "Kigali University Teaching Hospital", short: "KUTH", code: "KUTH-001", type: "Public" as const, location: "Kigali", district: "Kicukiro", province: "Kigali", doctors: 245, beds: 520 },
  { name: "Ruhengeri Referral Hospital", short: "RRH", code: "RRH-001", type: "Public" as const, location: "Musanze", district: "Musanze", province: "Northern", doctors: 89, beds: 280 },
  { name: "Butare University Teaching Hospital", short: "CHUB", code: "CHUB-001", type: "Public" as const, location: "Huye", district: "Huye", province: "Southern", doctors: 156, beds: 420 },
  { name: "Gisenyi District Hospital", short: "GDH", code: "GDH-001", type: "Public" as const, location: "Rubavu", district: "Rubavu", province: "Western", doctors: 45, beds: 180 },
  { name: "La Croix du Sud Hospital", short: "LCS", code: "LCS-001", type: "Mission" as const, location: "Kigali", district: "Kicukiro", province: "Kigali", doctors: 62, beds: 160 },
  { name: "Military Hospital Kanombe", short: "MHK", code: "MHK-001", type: "Military" as const, location: "Kigali", district: "Kicukiro", province: "Kigali", doctors: 78, beds: 220 },
];

export const mockHospitals: Hospital[] = hospitalData.map((h, i) => ({
  id: `hosp${i + 1}`,
  name: h.name,
  shortName: h.short,
  code: h.code,
  type: h.type,
  location: h.location,
  district: h.district,
  province: h.province,
  status: (["Approved", "Approved", "Approved", "In Review", "Pending"] as const)[i % 5] as Hospital["status"],
  totalDoctors: h.doctors,
  activePrescriptions: 80 + i * 23,
  fulfillmentRate: 78 + (i * 3) % 20,
  totalBeds: h.beds,
  adminName: userNames[i % userNames.length],
  adminEmail: `admin.${h.short.toLowerCase()}@health.rw`,
  phone: `+25025${String(100000 + i * 1234).slice(0, 6)}`,
  createdAt: makeDate(200 + i * 20),
  verifiedAt: i < 5 ? makeDate(180 + i * 20) : undefined,
}));

// ─── Pharmacies ──────────────────────────────────────────────────────────────
const pharmacyNames = [
  "Pharmacie Centrale Kigali", "MedPlus Pharmacy Remera", "LifeCare Pharmacy Nyamirambo",
  "Centenary Pharmacy Kicukiro", "Green Cross Pharmacy Gasabo", "City Pharmacy Musanze",
  "Hope Pharmacy Huye", "Sunrise Pharmacy Rubavu", "Premier Pharmacy Rwamagana",
  "Health First Pharmacy Kayonza", "Quick Med Pharmacy Gikondo", "Alpha Pharmacy Kimironko",
];

export const mockPharmacies: Pharmacy[] = pharmacyNames.map((name, i) => ({
  id: `ph${i + 1}`,
  name,
  code: `PH-${String(1000 + i).padStart(4, "0")}`,
  location: districts[i % districts.length] + " Sector",
  district: districts[i % districts.length],
  province: i < 4 ? "Kigali" : "Other",
  status: (["Approved", "Approved", "Approved", "In Review", "Pending", "Rejected"] as const)[i % 6] as Pharmacy["status"],
  stockLevel: (["Good", "Good", "Low", "Critical"] as const)[i % 4],
  fulfillmentRate: 72 + (i * 4) % 25,
  totalFulfillments: 1200 + i * 340,
  balance: 500000 + i * 120000,
  lastActivity: makeDate(i % 5),
  adminName: userNames[(i + 2) % userNames.length],
  adminEmail: `admin.ph${i + 1}@farumasi.rw`,
  phone: `+25078${String(2000000 + i * 47).slice(0, 7)}`,
  isEmbedded: i % 3 === 0,
  createdAt: makeDate(90 + i * 12),
  verifiedAt: i < 8 ? makeDate(80 + i * 12) : undefined,
}));

// ─── Pharmacists ─────────────────────────────────────────────────────────────
export const mockPharmacists: Pharmacist[] = Array.from({ length: 16 }, (_, i) => ({
  id: `phm${i + 1}`,
  name: userNames[(i + 4) % userNames.length],
  email: `pharmacist${i + 1}@farumasi.rw`,
  phone: `+25078${String(3000000 + i * 53).slice(0, 7)}`,
  licenseNumber: `RPB-${String(10000 + i * 137)}`,
  pharmacyId: i < 10 ? `ph${(i % 12) + 1}` : undefined,
  pharmacyName: i < 10 ? pharmacyNames[i % 12] : undefined,
  status: (["Active", "Active", "Active", "Pending Verification", "Suspended"] as const)[i % 5] as Pharmacist["status"],
  verifiedAt: i < 12 ? makeDate(60 + i * 7) : undefined,
  createdAt: makeDate(80 + i * 8),
  lastActive: makeDate(i % 6),
}));

// ─── Doctors ─────────────────────────────────────────────────────────────────
const specialties = ["General Medicine", "Pediatrics", "Surgery", "Obstetrics", "Cardiology", "Neurology", "Oncology", "Radiology"];

export const mockDoctors: Doctor[] = Array.from({ length: 30 }, (_, i) => ({
  id: `doc${i + 1}`,
  name: userNames[(i + 1) % userNames.length],
  email: `doctor${i + 1}@farumasi.rw`,
  phone: `+25072${String(4000000 + i * 61).slice(0, 7)}`,
  specialty: specialties[i % specialties.length],
  licenseNumber: `RMDCB-${String(20000 + i * 97)}`,
  hospitalId: `hosp${(i % 8) + 1}`,
  hospitalName: hospitalData[i % 8].name,
  departmentName: specialties[i % specialties.length],
  status: (["Active", "Active", "Active", "Pending Verification", "Restricted"] as const)[i % 5] as Doctor["status"],
  totalPrescriptions: 120 + i * 34,
  fulfillmentRate: 75 + (i * 4) % 22,
  lastActive: makeDate(i % 7),
  createdAt: makeDate(120 + i * 9),
  verifiedAt: i < 22 ? makeDate(100 + i * 9) : undefined,
}));

// ─── Suppliers ───────────────────────────────────────────────────────────────
const supplierNames = [
  "Inyange Pharmaceuticals Ltd", "MedAfrica Distributors", "Kigali Medical Supplies",
  "Rwanda Healthcare Products", "AfriMed International", "Continental Pharma RW",
  "PharmaSource East Africa", "HealthBridge Rwanda",
];

export const mockSuppliers: Supplier[] = supplierNames.map((name, i) => ({
  id: `sup${i + 1}`,
  name,
  type: (["Manufacturer", "Distributor", "Importer", "Medical Devices"] as const)[i % 4],
  location: districts[i % districts.length],
  district: districts[i % districts.length],
  status: (["Approved", "Approved", "In Review", "Pending"] as const)[i % 4] as Supplier["status"],
  totalProducts: 40 + i * 15,
  totalRevenue: 8000000 + i * 3500000,
  balance: 1200000 + i * 450000,
  adminName: userNames[(i + 6) % userNames.length],
  adminEmail: `admin.sup${i + 1}@farumasi.rw`,
  phone: `+25025${String(200000 + i * 2137).slice(0, 6)}`,
  createdAt: makeDate(150 + i * 18),
  verifiedAt: i < 5 ? makeDate(130 + i * 18) : undefined,
}));

// ─── Riders ──────────────────────────────────────────────────────────────────
export const mockRiders: Rider[] = Array.from({ length: 20 }, (_, i) => {
  const isMonthly = i % 3 !== 2; // 2/3 are monthly, 1/3 per-order
  return {
    id: `rid${i + 1}`,
    name: userNames[(i + 8) % userNames.length],
    email: `rider${i + 1}@farumasi.rw`,
    phone: `+25079${String(5000000 + i * 71).slice(0, 7)}`,
    district: districts[i % districts.length],
    status: (["Active", "Active", "Active", "Pending Verification", "Suspended"] as const)[i % 5] as Rider["status"],
    paymentModel: isMonthly ? "Monthly" : "Per Order",
    ...(isMonthly ? { monthlySalary: 80000 + (i % 5) * 20000 } : {}),
    totalDeliveries: 80 + i * 23,
    successRate: 88 + (i * 2) % 10,
    activeDeliveries: i % 4,
    balance: 45000 + i * 12000,
    lastActive: makeDate(i % 3),
    createdAt: makeDate(60 + i * 6),
  };
});

// ─── Departments ──────────────────────────────────────────────────────────────
export const mockDepartments: Department[] = specialties.flatMap((spec, si) =>
  hospitalData.slice(0, 4).map((h, hi) => ({
    id: `dept${si * 4 + hi + 1}`,
    name: spec,
    code: spec.substring(0, 3).toUpperCase() + `-${String(si * 4 + hi + 1).padStart(3, "0")}`,
    hospitalId: `hosp${hi + 1}`,
    hospitalName: h.name,
    headDoctor: userNames[(si + hi) % userNames.length],
    activeDoctors: 5 + (si + hi) * 3,
    activePrescriptions: 20 + (si + hi) * 8,
    fulfillmentRate: 76 + (si * 3 + hi * 5) % 20,
  }))
);

// ─── Products ────────────────────────────────────────────────────────────────
const productNames = [
  "Amoxicillin 500mg", "Metformin 850mg", "Lisinopril 10mg", "Atorvastatin 40mg",
  "Azithromycin 250mg", "Omeprazole 20mg", "Paracetamol 500mg", "Ibuprofen 400mg",
  "Artemether/Lumefantrine 80/480mg", "Cotrimoxazole 480mg", "Rifampicin 150mg",
  "Isoniazid 100mg", "Amlodipine 5mg", "Furosemide 40mg", "Hydrochlorothiazide 25mg",
  "Salbutamol Inhaler", "Insulin Glargine 100U/mL", "Metronidazole 400mg",
  "Ciprofloxacin 500mg", "Diclofenac 50mg",
];
const categories = ["Antibiotics", "Diabetes", "Cardiovascular", "Analgesics", "Antimalarial", "Respiratory", "Vitamins", "Medical Devices"];

export const mockProducts: Product[] = productNames.map((name, i) => ({
  id: `prod${i + 1}`,
  name,
  genericName: name.split(" ")[0],
  category: categories[i % categories.length],
  manufacturer: supplierNames[i % supplierNames.length],
  supplierId: `sup${(i % 8) + 1}`,
  supplierName: supplierNames[i % supplierNames.length],
  price: 500 + i * 350,
  unit: i % 5 === 0 ? "Inhaler" : i % 4 === 0 ? "Vial" : "Tablet",
  status: (["Active", "Active", "Active", "Pending Approval", "Rejected"] as const)[i % 5] as Product["status"],
  prescriptionRequired: i % 3 !== 0,
  stockCount: 50 + i * 30,
  demand: (["High", "High", "Medium", "Low"] as const)[i % 4],
  approvedAt: i % 5 !== 3 && i % 5 !== 4 ? makeDate(60 + i * 4) : undefined,
  createdAt: makeDate(80 + i * 5),
}));

// ─── Product Requests ─────────────────────────────────────────────────────────
const requestorNames = pharmacyNames.slice(0, 8);
export const mockProductRequests: ProductRequest[] = Array.from({ length: 18 }, (_, i) => ({
  id: `req${i + 1}`,
  productName: productNames[(i + 3) % productNames.length],
  genericName: productNames[(i + 3) % productNames.length].split(" ")[0],
  category: categories[i % categories.length],
  requestedById: `ph${(i % 8) + 1}`,
  requestedByName: requestorNames[i % 8],
  requestedByType: (["Pharmacy", "Supplier", "Hospital"] as const)[i % 3],
  status: (["Submitted", "Under Review", "Approved", "Requires More Information", "Rejected", "Draft"] as const)[i % 6] as ProductRequest["status"],
  submittedAt: makeDate(3 + i * 2),
  reviewedAt: i % 6 < 3 ? makeDate(i * 2) : undefined,
  reviewedBy: i % 6 < 3 ? "Admin Farumasi" : undefined,
  notes: i % 4 === 0 ? "Please provide RFDA certificate and proof of storage conditions." : undefined,
  rejectionReason: i % 6 === 4 ? "Product does not meet FARUMASI quality standards." : undefined,
  documents: ["product_spec.pdf", "rfda_certificate.pdf"],
  priority: (["Urgent", "High", "Normal", "Low"] as const)[i % 4],
}));

// ─── Marketplace Listings ─────────────────────────────────────────────────────
export const mockListings: MarketplaceListing[] = productNames.slice(0, 15).map((name, i) => ({
  id: `lst${i + 1}`,
  productId: `prod${i + 1}`,
  productName: name,
  pharmacyId: `ph${(i % 12) + 1}`,
  pharmacyName: pharmacyNames[i % 12],
  price: 600 + i * 200,
  stockQuantity: 20 + i * 15,
  status: (["Active", "Active", "Active", "Out of Stock", "Suspended"] as const)[i % 5] as MarketplaceListing["status"],
  sales30d: 30 + i * 12,
  views30d: 200 + i * 80,
  lastUpdated: makeDate(i % 7),
}));

// ─── Orders ───────────────────────────────────────────────────────────────────
export const mockOrders: Order[] = Array.from({ length: 30 }, (_, i) => ({
  id: `ord${String(i + 1).padStart(5, "0")}`,
  patientName: userNames[i % userNames.length],
  pharmacyId: `ph${(i % 12) + 1}`,
  pharmacyName: pharmacyNames[i % 12],
  prescriptionId: i % 3 !== 0 ? `rx${i + 1}` : undefined,
  status: (["Pending", "Confirmed", "Processing", "Ready", "Out for Delivery", "Delivered", "Cancelled", "Failed"] as const)[i % 8] as Order["status"],
  items: 1 + (i % 5),
  total: 2000 + i * 1500,
  createdAt: makeDate(i % 14),
  updatedAt: makeDate(Math.floor(i / 2) % 7),
  deliveryType: i % 3 === 0 ? "Pickup" : "Delivery",
}));

// ─── Fulfillment Records ─────────────────────────────────────────────────────
export const mockFulfillments: FulfillmentRecord[] = Array.from({ length: 25 }, (_, i) => ({
  id: `ful${i + 1}`,
  orderId: `ord${String(i + 1).padStart(5, "0")}`,
  prescriptionId: i % 4 !== 0 ? `rx${i + 1}` : undefined,
  pharmacyId: `ph${(i % 12) + 1}`,
  pharmacyName: pharmacyNames[i % 12],
  status: (["Fulfilled", "Fulfilled", "Partially Fulfilled", "Failed", "Pending"] as const)[i % 5] as FulfillmentRecord["status"],
  itemsTotal: 2 + (i % 4),
  itemsFulfilled: i % 5 === 3 ? 0 : i % 5 === 2 ? 1 + (i % 3) : 2 + (i % 4),
  processingTime: 15 + (i * 7) % 120,
  completedAt: i % 5 < 3 ? makeDate(i % 10) : undefined,
  createdAt: makeDate(i % 12),
}));

// ─── Deliveries ───────────────────────────────────────────────────────────────
export const mockDeliveries: Delivery[] = Array.from({ length: 20 }, (_, i) => ({
  id: `del${i + 1}`,
  orderId: `ord${String(i + 1).padStart(5, "0")}`,
  riderId: i % 4 !== 0 ? `rid${(i % 20) + 1}` : undefined,
  riderName: i % 4 !== 0 ? userNames[(i + 8) % userNames.length] : undefined,
  patientName: userNames[i % userNames.length],
  district: districts[i % districts.length],
  status: (["Pending", "Assigned", "Picked Up", "In Transit", "Delivered", "Failed"] as const)[i % 6] as Delivery["status"],
  assignedAt: i % 6 > 0 ? makeDate(i % 5) : undefined,
  deliveredAt: i % 6 === 4 ? makeDate(i % 3) : undefined,
  createdAt: makeDate(i % 10),
}));

// ─── Prescriptions (Admin) ────────────────────────────────────────────────────
export const mockPrescriptions: PrescriptionRecord[] = Array.from({ length: 25 }, (_, i) => ({
  id: `rx${String(i + 1).padStart(6, "0")}`,
  patientName: userNames[i % userNames.length],
  doctorName: userNames[(i + 1) % userNames.length],
  hospitalName: i % 3 !== 0 ? hospitalData[i % 8].name : undefined,
  pharmacyName: i % 4 < 3 ? pharmacyNames[i % 12] : undefined,
  status: (["Pending", "Sent", "Fulfilled", "Partially Fulfilled", "Failed", "Expired"] as const)[i % 6] as PrescriptionRecord["status"],
  priority: (["Urgent", "High", "Normal"] as const)[i % 3],
  items: 1 + (i % 4),
  createdAt: makeDate(i % 14),
  fulfilledAt: i % 6 === 2 ? makeDate(i % 8) : undefined,
}));

// ─── Revenue Records ─────────────────────────────────────────────────────────
export const mockRevenue: RevenueRecord[] = Array.from({ length: 25 }, (_, i) => ({
  id: `rev${i + 1}`,
  source: i % 5 === 0
    ? pharmacyNames[i % 12]
    : i % 5 === 1
      ? supplierNames[i % 8]
      : i % 5 === 2
        ? "Platform Service Fee"
        : i % 5 === 3
          ? `Delivery — ${userNames[(i + 8) % userNames.length]}`
          : pharmacyNames[(i + 3) % 12],
  sourceType: (["Order", "Commission", "Subscription", "Delivery Fee", "Service Fee"] as const)[i % 5],
  amount: i % 5 === 3
    ? 3000 + (i % 7) * 1500   // delivery fees are smaller per-order amounts
    : 50000 + i * 28000,
  commission: i % 5 === 3
    ? 0
    : Math.floor((50000 + i * 28000) * 0.08),
  date: makeDate(i % 20),
  status: (["Settled", "Settled", "Pending", "Disputed"] as const)[i % 4] as RevenueRecord["status"],
}));

// ─── Commissions ─────────────────────────────────────────────────────────────
export const mockCommissions: CommissionRecord[] = Array.from({ length: 20 }, (_, i) => ({
  id: `com${i + 1}`,
  entityId: `ph${(i % 12) + 1}`,
  entityType: (["Pharmacy", "Supplier", "Rider"] as const)[i % 3],
  entityName: i % 3 === 0 ? pharmacyNames[i % 12] : i % 3 === 1 ? supplierNames[i % 8] : userNames[(i + 8) % userNames.length],
  transactionId: `ord${String(i + 1).padStart(5, "0")}`,
  amount: 2000 + i * 900,
  rate: 6 + (i % 5),
  status: (["Pending", "Settled", "Disputed"] as const)[i % 3] as CommissionRecord["status"],
  createdAt: makeDate(i % 14),
}));

// ─── Withdrawal Requests ─────────────────────────────────────────────────────
export const mockWithdrawals: WithdrawalRequest[] = Array.from({ length: 16 }, (_, i) => ({
  id: `wdr${i + 1}`,
  entityId: `ph${(i % 12) + 1}`,
  entityType: (["Pharmacy", "Supplier", "Rider"] as const)[i % 3],
  entityName: i % 3 === 0 ? pharmacyNames[i % 12] : i % 3 === 1 ? supplierNames[i % 8] : userNames[(i + 8) % userNames.length],
  amount: 200000 + i * 85000,
  status: (["Pending", "Under Review", "Approved", "Paid", "Rejected"] as const)[i % 5] as WithdrawalRequest["status"],
  requestedAt: makeDate(3 + i * 2),
  processedAt: i % 5 >= 3 ? makeDate(i % 4) : undefined,
  processedBy: i % 5 >= 3 ? "Finance Admin" : undefined,
  notes: i % 4 === 0 ? "Monthly settlement" : undefined,
  method: (["Mobile Money", "Bank Transfer", "Airtel Money"] as const)[i % 3],
}));

// ─── AI Insights ─────────────────────────────────────────────────────────────
export const mockAIInsights: AIInsight[] = [
  { id: "ai1", title: "Critical Malaria Drug Shortage Risk — Kigali", summary: "Artemether/Lumefantrine stock at 12% of minimum threshold across 8 Kigali pharmacies. Historical demand surge expected in 3 weeks.", category: "Shortage", severity: "Critical", recommendation: "Trigger emergency procurement from Inyange Pharmaceuticals and Continental Pharma RW. Issue shortage alert to hospital coordinators.", affectedEntities: ["Gasabo", "Kicukiro", "Nyarugenge"], confidence: 94, status: "Active", createdAt: makeDate(0) },
  { id: "ai2", title: "Pharmacy MedPlus Remera — Declining Fulfillment Performance", summary: "Fulfillment rate dropped from 91% to 67% over 14 days. Likely stock management issue — 23 failed fulfillments in the past week.", category: "Fulfillment", severity: "High", recommendation: "Dispatch pharmacy coordinator for operational review. Flag for compliance check.", affectedEntities: ["MedPlus Pharmacy Remera"], confidence: 88, status: "Active", createdAt: makeDate(1) },
  { id: "ai3", title: "Antibiotic Demand Spike — Northern Province", summary: "Unusual 340% increase in Amoxicillin and Azithromycin prescriptions in Musanze and Rulindo. Possible respiratory illness cluster.", category: "Demand", severity: "High", recommendation: "Coordinate with Musanze District Hospital and trigger proactive stock distribution to northern pharmacies.", affectedEntities: ["Musanze", "Rulindo"], confidence: 79, status: "Active", createdAt: makeDate(1) },
  { id: "ai4", title: "Insurance Claim Rejection Rate Elevated — RSSB", summary: "RSSB insurance claims rejection rate increased from 8% to 23% this month. Pattern suggests documentation issues at hospital level.", category: "Financial", severity: "Medium", recommendation: "Notify hospital billing departments. Schedule compliance training for insurance documentation.", affectedEntities: ["CHUK", "KUTH", "KFH"], confidence: 82, status: "Acknowledged", createdAt: makeDate(2) },
  { id: "ai5", title: "Insulin Supply Chain Risk — Nationwide", summary: "Single supplier (Inyange Pharma) supplies 78% of Rwanda insulin. Projected supply gap of 14 days if current export restrictions continue.", category: "Shortage", severity: "Critical", recommendation: "Diversify insulin supply chain. Initiate emergency import procedures via RFDA fast-track pathway.", affectedEntities: ["All Provinces"], confidence: 91, status: "Active", createdAt: makeDate(0) },
  { id: "ai6", title: "Rider Performance Anomaly — Kigali Night Deliveries", summary: "Night delivery success rate dropped to 58% (vs. 89% daytime). Root cause: 3 riders with GPS tracking issues and safety concerns.", category: "Performance", severity: "Medium", recommendation: "Review night rider assignments. Install GPS tracking update. Consider delivery partner program for night slots.", affectedEntities: ["Gasabo", "Kicukiro"], confidence: 76, status: "Active", createdAt: makeDate(3) },
  { id: "ai7", title: "Platform Growth Acceleration — Western Province Onboarding", summary: "22% increase in pharmacy registrations from Western Province. Capacity to onboard 15+ new pharmacies this month.", category: "Accessibility", severity: "Low", recommendation: "Assign dedicated onboarding coordinator for Western Province. Prepare stock distribution capacity for new pharmacies.", affectedEntities: ["Rubavu", "Ngororero", "Nyamasheke"], confidence: 85, status: "Active", createdAt: makeDate(2) },
  { id: "ai8", title: "Duplicate Product Listings Detected", summary: "47 potentially duplicate product entries detected across supplier catalogues. Risks pricing inconsistency and fulfillment confusion.", category: "Compliance", severity: "Low", recommendation: "Run product deduplication workflow. Notify suppliers to review catalogue quality.", affectedEntities: ["Multiple Suppliers"], confidence: 97, status: "Resolved", createdAt: makeDate(5) },
];

// ─── Demand Forecasts ─────────────────────────────────────────────────────────
export const mockDemandForecasts: DemandForecast[] = [
  { id: "df1", productName: "Artemether/Lumefantrine 80/480mg", category: "Antimalarial", currentDemand: 1200, forecastedDemand: 1980, change: 65, region: "Nationwide", period: "Next 30 days", confidence: 89 },
  { id: "df2", productName: "Amoxicillin 500mg", category: "Antibiotics", currentDemand: 3400, forecastedDemand: 4200, change: 23.5, region: "Northern Province", period: "Next 30 days", confidence: 83 },
  { id: "df3", productName: "Paracetamol 500mg", category: "Analgesics", currentDemand: 8200, forecastedDemand: 8900, change: 8.5, region: "Nationwide", period: "Next 30 days", confidence: 91 },
  { id: "df4", productName: "Metformin 850mg", category: "Diabetes", currentDemand: 2100, forecastedDemand: 2340, change: 11.4, region: "Kigali", period: "Next 30 days", confidence: 86 },
  { id: "df5", productName: "Insulin Glargine 100U/mL", category: "Diabetes", currentDemand: 890, forecastedDemand: 1050, change: 18.0, region: "Nationwide", period: "Next 30 days", confidence: 88 },
  { id: "df6", productName: "Azithromycin 250mg", category: "Antibiotics", currentDemand: 1800, forecastedDemand: 2400, change: 33.3, region: "Northern Province", period: "Next 30 days", confidence: 77 },
  { id: "df7", productName: "Salbutamol Inhaler", category: "Respiratory", currentDemand: 620, forecastedDemand: 580, change: -6.5, region: "Kigali", period: "Next 30 days", confidence: 80 },
  { id: "df8", productName: "Ciprofloxacin 500mg", category: "Antibiotics", currentDemand: 1450, forecastedDemand: 1680, change: 15.9, region: "Eastern Province", period: "Next 30 days", confidence: 78 },
];

// ─── Shortage Alerts ──────────────────────────────────────────────────────────
export const mockShortageAlerts: ShortageAlert[] = [
  { id: "sh1", productName: "Artemether/Lumefantrine 80/480mg", category: "Antimalarial", severity: "Critical", affectedPharmacies: 23, affectedDistricts: ["Gasabo", "Kicukiro", "Nyarugenge", "Rwamagana"], currentStock: 340, estimatedRestock: makeDate(-7), riskScore: 94, createdAt: makeDate(2) },
  { id: "sh2", productName: "Insulin Glargine 100U/mL", category: "Diabetes", severity: "Critical", affectedPharmacies: 31, affectedDistricts: ["All Provinces"], currentStock: 180, estimatedRestock: makeDate(-5), riskScore: 91, createdAt: makeDate(1) },
  { id: "sh3", productName: "Rifampicin 150mg", category: "Antibiotics", severity: "High", affectedPharmacies: 14, affectedDistricts: ["Gasabo", "Musanze", "Huye"], currentStock: 620, estimatedRestock: makeDate(-3), riskScore: 78, createdAt: makeDate(3) },
  { id: "sh4", productName: "Lisinopril 10mg", category: "Cardiovascular", severity: "High", affectedPharmacies: 9, affectedDistricts: ["Gasabo", "Kicukiro"], currentStock: 890, estimatedRestock: makeDate(-10), riskScore: 71, createdAt: makeDate(4) },
  { id: "sh5", productName: "Salbutamol Inhaler", category: "Respiratory", severity: "Medium", affectedPharmacies: 6, affectedDistricts: ["Nyarugenge", "Gasabo"], currentStock: 1200, estimatedRestock: makeDate(-14), riskScore: 58, createdAt: makeDate(5) },
  { id: "sh6", productName: "Furosemide 40mg", category: "Cardiovascular", severity: "Medium", affectedPharmacies: 8, affectedDistricts: ["Huye", "Kamonyi"], currentStock: 780, estimatedRestock: makeDate(-12), riskScore: 52, createdAt: makeDate(6) },
];

// ─── Verification Requests ────────────────────────────────────────────────────
export const mockVerifications: VerificationRequest[] = [
  ...mockPharmacies.slice(0, 6).map((p, i) => ({
    id: `ver${i + 1}`,
    entityId: p.id,
    entityType: "Pharmacy" as const,
    entityName: p.name,
    status: (["Pending", "In Review", "Approved"] as const)[i % 3],
    submittedAt: makeDate(5 + i * 2),
    reviewedAt: i % 3 === 2 ? makeDate(i) : undefined,
    reviewer: i % 3 === 2 ? "Compliance Admin" : undefined,
    documents: ["pharmacy_license.pdf", "rfda_certificate.pdf", "business_registration.pdf"],
    notes: i % 3 === 1 ? "Awaiting physical inspection report." : undefined,
    priority: (["Urgent", "High", "Normal"] as const)[i % 3] as VerificationRequest["priority"],
  })),
  ...mockHospitals.slice(0, 4).map((h, i) => ({
    id: `ver${i + 7}`,
    entityId: h.id,
    entityType: "Hospital" as const,
    entityName: h.name,
    status: (["Pending", "In Review", "Approved", "Rejected"] as const)[i % 4] as VerificationStatus,
    submittedAt: makeDate(8 + i * 3),
    reviewedAt: i % 4 >= 2 ? makeDate(i + 1) : undefined,
    reviewer: i % 4 >= 2 ? "Super Admin" : undefined,
    documents: ["moh_license.pdf", "hospital_registration.pdf"],
    priority: (["High", "Normal", "Normal", "Low"] as const)[i % 4] as VerificationRequest["priority"],
  })),
  ...mockSuppliers.slice(0, 4).map((s, i) => ({
    id: `ver${i + 11}`,
    entityId: s.id,
    entityType: "Supplier" as const,
    entityName: s.name,
    status: (["Pending", "In Review"] as const)[i % 2] as VerificationStatus,
    submittedAt: makeDate(4 + i),
    documents: ["rfda_certificate.pdf", "tax_clearance.pdf", "business_registration.pdf"],
    priority: "Normal" as const,
  })),
];

// ─── Compliance Records ───────────────────────────────────────────────────────
export const mockComplianceRecords: ComplianceRecord[] = [
  ...mockHospitals.map((h, i) => ({
    id: `cmp${i + 1}`,
    entityId: h.id,
    entityType: "Hospital" as const,
    entityName: h.name,
    checkType: ["License Renewal", "Fire Safety", "Medical Waste", "Staff Credentials"][i % 4],
    dueDate: makeDate(-(30 + i * 20)),
    status: (["Compliant", "Compliant", "Pending", "Non-Compliant"] as const)[i % 4] as ComplianceRecord["status"],
    completedAt: i % 4 < 2 ? makeDate(40 + i * 20) : undefined,
    verifiedBy: i % 4 < 2 ? "Compliance Admin" : undefined,
  })),
  ...mockPharmacies.slice(0, 8).map((p, i) => ({
    id: `cmp${i + 9}`,
    entityId: p.id,
    entityType: "Pharmacy" as const,
    entityName: p.name,
    checkType: ["Cold Chain Compliance", "Storage Standards", "License Renewal", "Staff Certification"][i % 4],
    dueDate: makeDate(-(20 + i * 15)),
    status: (["Compliant", "Pending", "Non-Compliant", "Expired"] as const)[i % 4] as ComplianceRecord["status"],
    completedAt: i % 4 === 0 ? makeDate(30 + i * 10) : undefined,
  })),
];

// ─── Audit Logs ───────────────────────────────────────────────────────────────
const adminRoles = ["Super Admin", "Operations Admin", "Finance Admin", "Compliance Admin"] as const;
const auditActions = ["APPROVE", "REJECT", "RESTRICT", "SUSPEND", "VERIFY", "CREATE", "UPDATE", "PAYOUT", "WITHDRAW"] as const;
const resourceTypes = ["Pharmacy", "Hospital", "Doctor", "Supplier", "ProductRequest", "WithdrawalRequest", "User", "Product"];

export const mockAuditLogs: AuditLog[] = Array.from({ length: 30 }, (_, i) => ({
  id: `log${i + 1}`,
  actorId: `admin${i % 4 + 1}`,
  actorName: ["Super Admin", "Ops Admin", "Finance Admin", "Compliance Admin"][i % 4],
  actorRole: adminRoles[i % 4],
  action: auditActions[i % auditActions.length],
  resourceType: resourceTypes[i % resourceTypes.length],
  resourceId: `${resourceTypes[i % resourceTypes.length].toLowerCase()}${i + 1}`,
  resourceLabel: i % 3 === 0 ? pharmacyNames[i % 12] : i % 3 === 1 ? hospitalData[i % 8].name : supplierNames[i % 8],
  details: `${auditActions[i % auditActions.length]} action performed on ${resourceTypes[i % resourceTypes.length]}`,
  ipAddress: `197.${i % 200 + 50}.${i % 100 + 10}.${i % 200 + 2}`,
  createdAt: new Date(Date.now() - i * 3600000).toISOString(),
}));

// ─── Security Events ──────────────────────────────────────────────────────────
export const mockSecurityEvents: SecurityEvent[] = [
  { id: "sec1", type: "Failed Login", severity: "Medium", description: "12 failed login attempts from IP 192.168.1.45 targeting admin@farumasi.rw", ipAddress: "192.168.1.45", status: "Investigating", createdAt: makeDate(0) },
  { id: "sec2", type: "Suspicious Activity", severity: "High", description: "Bulk data export attempted outside business hours by user ph-admin-23", ipAddress: "41.186.47.12", userId: "u23", userName: "Suspicious User", status: "Open", createdAt: makeDate(0) },
  { id: "sec3", type: "API Abuse", severity: "High", description: "Product listing API called 4,200 times in 10 minutes from single IP. Possible automated scraping.", ipAddress: "102.88.34.201", status: "Resolved", createdAt: makeDate(1) },
  { id: "sec4", type: "Permission Escalation", severity: "Critical", description: "Unauthorized attempt to access Finance Admin endpoints from Support Admin account.", ipAddress: "197.243.21.88", userId: "admin9", userName: "Support Admin User", status: "Investigating", createdAt: makeDate(1) },
  { id: "sec5", type: "Session Anomaly", severity: "Low", description: "User session active from 3 different countries simultaneously. Possible credential compromise.", ipAddress: "Multiple", userId: "u156", userName: "Pharmacist User", status: "Resolved", createdAt: makeDate(2) },
  { id: "sec6", type: "Unusual Access", severity: "Medium", description: "Withdrawal request created and approved within 2 minutes — below review threshold velocity.", ipAddress: "41.186.33.99", status: "Dismissed", createdAt: makeDate(3) },
];

// ─── Notifications ────────────────────────────────────────────────────────────
export const mockNotifications: SystemNotification[] = [
  { id: "n1", type: "Critical", title: "Critical Drug Shortage — Artemether", message: "Artemether/Lumefantrine stock critically low across 23 pharmacies in Kigali. Immediate action required.", isRead: false, category: "Shortage", createdAt: makeDate(0) },
  { id: "n2", type: "Alert", title: "New Verification Request — 3 Pharmacies", message: "Pharmacie Centrale Kigali, Green Cross, and City Pharmacy have submitted verification documents.", isRead: false, category: "Verification", createdAt: makeDate(0) },
  { id: "n3", type: "Warning", title: "Withdrawal Request Above Threshold", message: "Centenary Pharmacy requested RWF 2,400,000 withdrawal — above single-approval limit.", isRead: false, category: "Finance", createdAt: makeDate(0) },
  { id: "n4", type: "Alert", title: "Security: Suspicious Login Activity", message: "12 failed login attempts detected on admin account. IP blocked.", isRead: false, category: "Security", createdAt: makeDate(0) },
  { id: "n5", type: "Success", title: "Product Request Approved", message: "Amoxicillin 500mg batch request from MedPlus Pharmacy approved successfully.", isRead: true, category: "Products", createdAt: makeDate(1) },
  { id: "n6", type: "Info", title: "Monthly Revenue Report Ready", message: "April 2026 financial report is ready for review. Total revenue: RWF 284.5M", isRead: true, category: "Finance", createdAt: makeDate(1) },
  { id: "n7", type: "Warning", title: "Fulfillment Rate Drop — MedPlus Remera", message: "Pharmacy fulfillment rate dropped from 91% to 67% in 14 days. Review required.", isRead: true, category: "Operations", createdAt: makeDate(2) },
  { id: "n8", type: "Info", title: "New Doctor Verification — 5 Pending", message: "5 new doctor verification requests awaiting review.", isRead: true, category: "Verification", createdAt: makeDate(2) },
];

// ─── Feature Flags ────────────────────────────────────────────────────────────
export const mockFeatureFlags: FeatureFlag[] = [
  { id: "ff1", key: "ai_shortage_alerts", name: "AI Shortage Alerts", description: "Enable AI-powered shortage prediction and automated alerts", enabled: true, rolloutPercentage: 100, environments: ["production", "staging"], updatedAt: makeDate(7) },
  { id: "ff2", key: "demand_forecasting", name: "Demand Forecasting Engine", description: "AI demand forecasting for medicine supply chain", enabled: true, rolloutPercentage: 100, environments: ["production", "staging", "development"], updatedAt: makeDate(14) },
  { id: "ff3", key: "instant_delivery", name: "Instant Delivery (< 2hr)", description: "Enable same-day express delivery for priority pharmacies", enabled: false, rolloutPercentage: 20, environments: ["staging", "development"], updatedAt: makeDate(3) },
  { id: "ff4", key: "insurance_auto_claim", name: "Insurance Auto-Claim Processing", description: "Automated RSSB insurance claim submission for approved prescriptions", enabled: false, rolloutPercentage: 0, environments: ["development"], updatedAt: makeDate(1) },
  { id: "ff5", key: "supplier_portal_v2", name: "Supplier Portal V2", description: "Redesigned supplier management portal with advanced analytics", enabled: true, rolloutPercentage: 100, environments: ["production", "staging"], updatedAt: makeDate(21) },
  { id: "ff6", key: "patient_chat", name: "Patient-Pharmacist Chat", description: "Real-time messaging between patients and pharmacists", enabled: false, rolloutPercentage: 5, environments: ["staging", "development"], updatedAt: makeDate(2) },
  { id: "ff7", key: "multi_currency", name: "Multi-Currency Support", description: "Support USD, EUR payments alongside RWF", enabled: false, rolloutPercentage: 0, environments: ["development"], updatedAt: makeDate(5) },
  { id: "ff8", key: "dark_mode", name: "Dark Mode", description: "Dark theme across all FARUMASI portals", enabled: true, rolloutPercentage: 100, environments: ["production", "staging", "development"], updatedAt: makeDate(30) },
];

// ─── Integrations ─────────────────────────────────────────────────────────────
export const mockIntegrations: Integration[] = [
  { id: "int1", name: "Mobile Money Rwanda", type: "Payment", provider: "MTN MoMo", status: "Connected", lastSync: makeDate(0), description: "MTN Mobile Money payment gateway for Rwanda" },
  { id: "int2", name: "Airtel Money", type: "Payment", provider: "Airtel Rwanda", status: "Connected", lastSync: makeDate(0), description: "Airtel Money payment processing integration" },
  { id: "int3", name: "RSSB Insurance", type: "Insurance", provider: "Rwanda Social Security Board", status: "Connected", lastSync: makeDate(1), description: "RSSB health insurance claim submission and verification" },
  { id: "int4", name: "SMS Gateway", type: "SMS", provider: "Africa's Talking", status: "Connected", lastSync: makeDate(0), description: "Bulk SMS notifications for patients, pharmacies, and hospitals" },
  { id: "int5", name: "Email Delivery", type: "Email", provider: "SendGrid", status: "Connected", lastSync: makeDate(0), description: "Transactional and marketing email delivery" },
  { id: "int6", name: "Rwanda HMIS", type: "EHR", provider: "Ministry of Health Rwanda", status: "Pending", description: "DHIS2 health management information system placeholder" },
  { id: "int7", name: "Last-Mile Logistics", type: "Logistics", provider: "SafeMotos Rwanda", status: "Connected", lastSync: makeDate(2), description: "Last-mile delivery partner for medicine distribution" },
  { id: "int8", name: "RFDA Drug Registry", type: "Analytics", provider: "Rwanda FDA", status: "Error", lastSync: makeDate(7), description: "Rwanda FDA drug registration and compliance API" },
];

// ─── Availability Records ─────────────────────────────────────────────────────
export const mockAvailability: AvailabilityRecord[] = productNames.slice(0, 12).map((name, i) => ({
  id: `avl${i + 1}`,
  productName: name,
  category: categories[i % categories.length],
  totalListings: 20 + i * 8,
  availablePharmacies: 10 + i * 5,
  avgPrice: 600 + i * 180,
  minPrice: 400 + i * 120,
  maxPrice: 900 + i * 250,
  coveragePercent: 40 + (i * 7) % 55,
  stockStatus: (["Adequate", "Adequate", "Low", "Critical", "Out of Stock"] as const)[i % 5] as AvailabilityRecord["stockStatus"],
}));

// ─── Admin Users ──────────────────────────────────────────────────────────────
export const mockAdminUsers: AdminUser[] = [
  { id: "adm1", name: "Farumasi Super Admin", email: "superadmin@farumasi.rw", role: "Super Admin", permissions: ["*"], status: "Active", lastLogin: makeDate(0), createdAt: makeDate(365) },
  { id: "adm2", name: "Operations Admin", email: "ops@farumasi.rw", role: "Operations Admin", permissions: ["users:read", "orders:*", "fulfillment:*", "delivery:*"], status: "Active", lastLogin: makeDate(0), createdAt: makeDate(200) },
  { id: "adm3", name: "Finance Admin", email: "finance@farumasi.rw", role: "Finance Admin", permissions: ["revenue:*", "withdrawals:*", "payouts:*", "commissions:*"], status: "Active", lastLogin: makeDate(1), createdAt: makeDate(180) },
  { id: "adm4", name: "Compliance Admin", email: "compliance@farumasi.rw", role: "Compliance Admin", permissions: ["verification:*", "compliance:*", "audit:read"], status: "Active", lastLogin: makeDate(2), createdAt: makeDate(150) },
  { id: "adm5", name: "Pharmacy Admin", email: "pharmacy@farumasi.rw", role: "Pharmacy Admin", permissions: ["pharmacies:*", "catalogue:read", "product-requests:*"], status: "Active", lastLogin: makeDate(1), createdAt: makeDate(120) },
  { id: "adm6", name: "Support Admin", email: "support@farumasi.rw", role: "Support Admin", permissions: ["users:read", "orders:read", "notifications:*"], status: "Inactive", lastLogin: makeDate(14), createdAt: makeDate(90) },
];
