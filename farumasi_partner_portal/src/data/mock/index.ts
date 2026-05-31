import type {
  ApprovedProduct, ListedProduct, Order, InventoryEntry,
  Transaction, WithdrawalRequest, Notification, TeamMember,
  ComplianceDocument, ProductRequest, ActivityLog, DashboardKPIs,
  ChartDataPoint, RevenueStats, BusinessProfile
} from "@/types";

// ─── Business profile ─────────────────────────────────────────────────────────

export const mockBusiness: BusinessProfile = {
  id: "biz_001",
  name: "Inyange Pharmacy Ltd",
  type: "pharmacy",
  description: "Leading community pharmacy serving Kigali since 2015",
  email: "admin@inyangepharma.rw",
  phone: "+250 788 123 456",
  address: "KN 4 Ave, Nyarugenge",
  city: "Kigali",
  website: "https://inyangepharma.rw",
  logoUrl: "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=200&h=200&fit=crop&q=80",
  verificationStatus: "verified",
  joinedAt: "2024-01-15",
  totalProducts: 42,
  totalOrders: 1284,
};

// ─── Approved product catalogue ───────────────────────────────────────────────

export const mockApprovedProducts: ApprovedProduct[] = [
  { id: "ap_001", name: "Paracetamol 500mg Tablets", genericName: "Paracetamol", brand: "Panadol", manufacturer: "GSK Rwanda", category: "medicines", dosageForm: "Tablet", strength: "500mg", description: "Analgesic and antipyretic for pain and fever relief.", approvalStatus: "approved", rfidaApprovalNo: "RFDA/MED/2023/0142", requiresPrescription: false, tags: ["analgesic", "fever", "pain"], imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&h=300&fit=crop&q=80", createdAt: "2023-03-10" },
  { id: "ap_002", name: "Amoxicillin 250mg Capsules", genericName: "Amoxicillin", brand: "Amoxil", manufacturer: "Cipla Rwanda", category: "medicines", dosageForm: "Capsule", strength: "250mg", description: "Broad-spectrum antibiotic for bacterial infections.", approvalStatus: "approved", rfidaApprovalNo: "RFDA/MED/2023/0089", requiresPrescription: true, tags: ["antibiotic", "bacterial"], imageUrl: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=300&h=300&fit=crop&q=80", createdAt: "2023-02-14" },
  { id: "ap_003", name: "Metformin 500mg Tablets", genericName: "Metformin HCl", brand: "Glucophage", manufacturer: "Merck Rwanda", category: "medicines", dosageForm: "Tablet", strength: "500mg", description: "First-line treatment for Type 2 diabetes.", approvalStatus: "approved", rfidaApprovalNo: "RFDA/MED/2022/0311", requiresPrescription: true, tags: ["diabetes", "glycemic"], imageUrl: "https://images.unsplash.com/photo-1550572017-aca57ed63ce7?w=300&h=300&fit=crop&q=80", createdAt: "2022-11-20" },
  { id: "ap_004", name: "Omeprazole 20mg Capsules", genericName: "Omeprazole", brand: "Losec", manufacturer: "AstraZeneca", category: "medicines", dosageForm: "Capsule", strength: "20mg", description: "Proton pump inhibitor for gastric acid reduction.", approvalStatus: "approved", rfidaApprovalNo: "RFDA/MED/2023/0205", requiresPrescription: false, tags: ["gastric", "acid reflux"], imageUrl: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=300&h=300&fit=crop&q=80", createdAt: "2023-05-08" },
  { id: "ap_005", name: "Amlodipine 5mg Tablets", genericName: "Amlodipine Besylate", brand: "Norvasc", manufacturer: "Pfizer", category: "medicines", dosageForm: "Tablet", strength: "5mg", description: "Calcium channel blocker for hypertension and angina.", approvalStatus: "approved", rfidaApprovalNo: "RFDA/MED/2022/0278", requiresPrescription: true, tags: ["hypertension", "cardiac"], imageUrl: "https://images.unsplash.com/photo-1559757148-5b24ef2c29c4?w=300&h=300&fit=crop&q=80", createdAt: "2022-09-15" },
  { id: "ap_006", name: "Blood Pressure Monitor (Digital)", genericName: undefined, brand: "Omron", manufacturer: "Omron Healthcare", category: "medical_devices", description: "Automatic upper arm blood pressure monitor with memory function.", approvalStatus: "approved", rfidaApprovalNo: "RFDA/DEV/2023/0067", requiresPrescription: false, tags: ["hypertension", "monitoring", "device"], imageUrl: "https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=300&h=300&fit=crop&q=80", createdAt: "2023-01-22" },
  { id: "ap_007", name: "Malaria Rapid Diagnostic Test", genericName: undefined, brand: "SD BIOLINE", manufacturer: "Abbott", category: "diagnostics", description: "Rapid diagnostic test for Plasmodium falciparum detection.", approvalStatus: "approved", rfidaApprovalNo: "RFDA/DX/2023/0033", requiresPrescription: false, tags: ["malaria", "diagnostics", "rapid test"], imageUrl: "https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=300&h=300&fit=crop&q=80", createdAt: "2023-04-01" },
  { id: "ap_008", name: "Vitamin C 1000mg Effervescent", genericName: "Ascorbic Acid", brand: "Redoxon", manufacturer: "Bayer", category: "supplements", description: "High-dose Vitamin C supplement for immune support.", approvalStatus: "approved", requiresPrescription: false, tags: ["vitamin", "immune", "supplement"], imageUrl: "https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?w=300&h=300&fit=crop&q=80", createdAt: "2023-06-10" },
  { id: "ap_009", name: "Artemether/Lumefantrine 20/120mg", genericName: "Artemether + Lumefantrine", brand: "Coartem", manufacturer: "Novartis", category: "medicines", dosageForm: "Tablet", strength: "20/120mg", description: "Fixed-dose combination for uncomplicated P. falciparum malaria.", approvalStatus: "approved", rfidaApprovalNo: "RFDA/MED/2022/0198", requiresPrescription: true, tags: ["malaria", "artemisinin", "ACT"], imageUrl: "https://images.unsplash.com/photo-1550572017-aca57ed63ce7?w=300&h=300&fit=crop&q=80", createdAt: "2022-07-30" },
  { id: "ap_010", name: "Surgical Gloves (Latex) — Box 100", genericName: undefined, brand: "Ansell", manufacturer: "Ansell Healthcare", category: "consumables", description: "Sterile powdered latex surgical gloves, size M.", approvalStatus: "approved", requiresPrescription: false, tags: ["surgical", "PPE", "gloves"], imageUrl: "https://images.unsplash.com/photo-1583947582886-f43ceba25f30?w=300&h=300&fit=crop&q=80", createdAt: "2023-02-28" },
];

// ─── Listed products ──────────────────────────────────────────────────────────

export const mockListedProducts: ListedProduct[] = [
  { id: "lp_001", approvedProductId: "ap_001", product: mockApprovedProducts[0], sku: "IPA-PAR-500", price: 1500, comparePrice: 1800, stockQty: 450, reorderThreshold: 100, status: "available", deliveryAvailable: true, pickupAvailable: true, batchNumber: "BN2024A", expiryDate: "2026-08-31", totalSales: 892, totalRevenue: 1338000, lastUpdated: "2026-05-10" },
  { id: "lp_002", approvedProductId: "ap_002", product: mockApprovedProducts[1], sku: "IPA-AMX-250", price: 3200, stockQty: 28, reorderThreshold: 50, status: "low_stock", deliveryAvailable: true, pickupAvailable: true, batchNumber: "BN2024B", expiryDate: "2026-12-15", totalSales: 234, totalRevenue: 748800, lastUpdated: "2026-05-12" },
  { id: "lp_003", approvedProductId: "ap_003", product: mockApprovedProducts[2], sku: "IPA-MET-500", price: 4500, stockQty: 180, reorderThreshold: 60, status: "available", deliveryAvailable: false, pickupAvailable: true, batchNumber: "BN2024C", expiryDate: "2027-03-20", totalSales: 156, totalRevenue: 702000, lastUpdated: "2026-05-08" },
  { id: "lp_004", approvedProductId: "ap_005", product: mockApprovedProducts[4], sku: "IPA-AML-5", price: 6800, stockQty: 0, reorderThreshold: 40, status: "out_of_stock", deliveryAvailable: true, pickupAvailable: true, totalSales: 89, totalRevenue: 605200, lastUpdated: "2026-05-14" },
  { id: "lp_005", approvedProductId: "ap_006", product: mockApprovedProducts[5], sku: "IPA-BP-OMR", price: 45000, comparePrice: 52000, stockQty: 12, reorderThreshold: 5, status: "available", deliveryAvailable: true, pickupAvailable: true, totalSales: 24, totalRevenue: 1080000, lastUpdated: "2026-05-01" },
  { id: "lp_006", approvedProductId: "ap_007", product: mockApprovedProducts[6], sku: "IPA-MAL-RDT", price: 2500, stockQty: 340, reorderThreshold: 100, status: "available", deliveryAvailable: true, pickupAvailable: true, batchNumber: "BN2024D", expiryDate: "2026-10-31", totalSales: 412, totalRevenue: 1030000, lastUpdated: "2026-05-11" },
  { id: "lp_007", approvedProductId: "ap_008", product: mockApprovedProducts[7], sku: "IPA-VITC-1G", price: 8500, stockQty: 65, reorderThreshold: 30, status: "available", deliveryAvailable: true, pickupAvailable: true, batchNumber: "BN2024E", expiryDate: "2027-06-30", totalSales: 78, totalRevenue: 663000, lastUpdated: "2026-05-05" },
  { id: "lp_008", approvedProductId: "ap_009", product: mockApprovedProducts[8], sku: "IPA-COA-20", price: 5200, stockQty: 0, reorderThreshold: 80, status: "out_of_stock", deliveryAvailable: true, pickupAvailable: true, batchNumber: "BN2024F", expiryDate: "2026-07-15", totalSales: 203, totalRevenue: 1055600, lastUpdated: "2026-05-13" },
];

// ─── Orders ───────────────────────────────────────────────────────────────────

export const mockOrders: Order[] = [
  { id: "ord_001", orderNumber: "FRM-2026-4401", customerId: "c_001", customerName: "Mugisha Jean", customerPhone: "+250 788 001 001", items: [{ id: "oi_1", productId: "lp_001", productName: "Paracetamol 500mg", quantity: 2, unitPrice: 1500, totalPrice: 3000, requiresPrescription: false }], subtotal: 3000, deliveryFee: 1000, commission: 450, netAmount: 3550, status: "pending", isDelivery: true, deliveryAddress: "KG 11 Ave, Remera, Kigali", hasPrescription: false, placedAt: "2026-05-16T08:22:00Z", updatedAt: "2026-05-16T08:22:00Z" },
  { id: "ord_002", orderNumber: "FRM-2026-4400", customerId: "c_002", customerName: "Uwimana Grace", customerPhone: "+250 789 002 002", items: [{ id: "oi_2", productId: "lp_003", productName: "Metformin 500mg", quantity: 1, unitPrice: 4500, totalPrice: 4500, requiresPrescription: true }, { id: "oi_3", productId: "lp_002", productName: "Amoxicillin 250mg", quantity: 1, unitPrice: 3200, totalPrice: 3200, requiresPrescription: true }], subtotal: 7700, deliveryFee: 0, commission: 770, netAmount: 6930, status: "preparing", isDelivery: false, hasPrescription: true, prescriptionUrl: "https://example.com/rx/001.pdf", placedAt: "2026-05-16T07:45:00Z", updatedAt: "2026-05-16T08:10:00Z" },
  { id: "ord_003", orderNumber: "FRM-2026-4399", customerId: "c_003", customerName: "Nkurunziza Eric", customerPhone: "+250 786 003 003", items: [{ id: "oi_4", productId: "lp_006", productName: "Malaria RDT", quantity: 3, unitPrice: 2500, totalPrice: 7500, requiresPrescription: false }], subtotal: 7500, deliveryFee: 1500, commission: 900, netAmount: 8100, status: "out_for_delivery", isDelivery: true, deliveryAddress: "KN 3 St, Nyamirambo", hasPrescription: false, placedAt: "2026-05-15T16:30:00Z", updatedAt: "2026-05-16T07:00:00Z" },
  { id: "ord_004", orderNumber: "FRM-2026-4398", customerId: "c_004", customerName: "Kampire Alice", customerPhone: "+250 780 004 004", items: [{ id: "oi_5", productId: "lp_005", productName: "Blood Pressure Monitor", quantity: 1, unitPrice: 45000, totalPrice: 45000, requiresPrescription: false }], subtotal: 45000, deliveryFee: 2000, commission: 4500, netAmount: 42500, status: "completed", isDelivery: true, deliveryAddress: "KG 7 Ave, Gisozi", hasPrescription: false, placedAt: "2026-05-14T10:00:00Z", updatedAt: "2026-05-15T14:30:00Z", completedAt: "2026-05-15T14:30:00Z" },
  { id: "ord_005", orderNumber: "FRM-2026-4397", customerId: "c_005", customerName: "Habimana Patrick", customerPhone: "+250 787 005 005", items: [{ id: "oi_6", productId: "lp_007", productName: "Vitamin C 1000mg", quantity: 2, unitPrice: 8500, totalPrice: 17000, requiresPrescription: false }], subtotal: 17000, deliveryFee: 1000, commission: 1800, netAmount: 16200, status: "completed", isDelivery: true, deliveryAddress: "KN 5 Ave, Muhima", hasPrescription: false, placedAt: "2026-05-14T09:15:00Z", updatedAt: "2026-05-14T18:45:00Z", completedAt: "2026-05-14T18:45:00Z" },
  { id: "ord_006", orderNumber: "FRM-2026-4396", customerId: "c_006", customerName: "Mukamurenzi Rose", customerPhone: "+250 782 006 006", items: [{ id: "oi_7", productId: "lp_001", productName: "Paracetamol 500mg", quantity: 5, unitPrice: 1500, totalPrice: 7500, requiresPrescription: false }], subtotal: 7500, deliveryFee: 0, commission: 750, netAmount: 6750, status: "cancelled", isDelivery: false, hasPrescription: false, placedAt: "2026-05-13T14:00:00Z", updatedAt: "2026-05-13T15:30:00Z" },
];

// ─── Revenue data ─────────────────────────────────────────────────────────────

export const mockRevenueStats: RevenueStats = {
  totalRevenue: 8_422_600,
  monthlyRevenue: 1_284_500,
  weeklyRevenue: 342_800,
  todayRevenue: 48_250,
  pendingBalance: 224_650,
  availableBalance: 1_060_000,
  totalCommissionPaid: 842_260,
  totalWithdrawn: 5_995_990,
};

export const mockRevenueChart: ChartDataPoint[] = [
  { label: "Jun", value: 620000, secondary: 62000 },
  { label: "Jul", value: 780000, secondary: 78000 },
  { label: "Aug", value: 710000, secondary: 71000 },
  { label: "Sep", value: 890000, secondary: 89000 },
  { label: "Oct", value: 1050000, secondary: 105000 },
  { label: "Nov", value: 940000, secondary: 94000 },
  { label: "Dec", value: 1320000, secondary: 132000 },
  { label: "Jan", value: 960000, secondary: 96000 },
  { label: "Feb", value: 1080000, secondary: 108000 },
  { label: "Mar", value: 1240000, secondary: 124000 },
  { label: "Apr", value: 1180000, secondary: 118000 },
  { label: "May", value: 1284500, secondary: 128450 },
];

export const mockOrdersChart: ChartDataPoint[] = [
  { label: "Mon", value: 18 },
  { label: "Tue", value: 24 },
  { label: "Wed", value: 31 },
  { label: "Thu", value: 22 },
  { label: "Fri", value: 38 },
  { label: "Sat", value: 45 },
  { label: "Sun", value: 28 },
];

export const mockTopProducts: ChartDataPoint[] = [
  { label: "Paracetamol 500mg", value: 892 },
  { label: "Malaria RDT", value: 412 },
  { label: "Coartem 20/120mg", value: 203 },
  { label: "Amoxicillin 250mg", value: 234 },
  { label: "Vitamin C 1000mg", value: 78 },
];

// ─── Withdrawals ──────────────────────────────────────────────────────────────

export const mockWithdrawals: WithdrawalRequest[] = [
  { id: "wd_001", amount: 500000, bankName: "Bank of Kigali", accountNumber: "00040-00082660-51", accountName: "Inyange Pharmacy Ltd", status: "completed", requestedAt: "2026-05-01T09:00:00Z", processedAt: "2026-05-03T11:30:00Z" },
  { id: "wd_002", amount: 300000, bankName: "Bank of Kigali", accountNumber: "00040-00082660-51", accountName: "Inyange Pharmacy Ltd", status: "processing", requestedAt: "2026-05-12T14:00:00Z" },
  { id: "wd_003", amount: 200000, bankName: "Bank of Kigali", accountNumber: "00040-00082660-51", accountName: "Inyange Pharmacy Ltd", status: "pending", requestedAt: "2026-05-15T16:30:00Z" },
];

export const mockTransactions: Transaction[] = [
  { id: "tx_001", type: "sale", orderId: "ord_004", amount: 45000, fee: 4500, netAmount: 40500, description: "Order FRM-2026-4398 — Blood Pressure Monitor", status: "completed", timestamp: "2026-05-15T14:30:00Z" },
  { id: "tx_002", type: "sale", orderId: "ord_005", amount: 17000, fee: 1700, netAmount: 15300, description: "Order FRM-2026-4397 — Vitamin C 1000mg x2", status: "completed", timestamp: "2026-05-14T18:45:00Z" },
  { id: "tx_003", type: "withdrawal", amount: 500000, fee: 0, netAmount: 500000, description: "Withdrawal to Bank of Kigali — Inyange Pharmacy", status: "completed", timestamp: "2026-05-03T11:30:00Z" },
  { id: "tx_004", type: "commission", amount: -84226, fee: 0, netAmount: -84226, description: "Monthly commission settlement — April 2026", status: "completed", timestamp: "2026-05-01T00:00:00Z" },
];

// ─── Notifications ────────────────────────────────────────────────────────────

export const mockNotifications: Notification[] = [
  { id: "n_001", category: "order", title: "New Order Received", message: "Order FRM-2026-4401 from Mugisha Jean — 2x Paracetamol 500mg", isRead: false, actionUrl: "/orders/ord_001", timestamp: "2026-05-16T08:22:00Z" },
  { id: "n_002", category: "inventory", title: "Low Stock Alert", message: "Amoxicillin 250mg is running low (28 units remaining). Reorder threshold: 50.", isRead: false, actionUrl: "/inventory", timestamp: "2026-05-15T20:00:00Z" },
  { id: "n_003", category: "inventory", title: "Out of Stock", message: "Amlodipine 5mg is now out of stock. Update your listing.", isRead: false, actionUrl: "/products/listed", timestamp: "2026-05-15T18:30:00Z" },
  { id: "n_004", category: "withdrawal", title: "Withdrawal Processing", message: "Your withdrawal of RWF 300,000 is being processed.", isRead: true, actionUrl: "/revenue", timestamp: "2026-05-12T14:15:00Z" },
  { id: "n_005", category: "approval", title: "Product Request Update", message: "Your request for 'Ceftriaxone 1g Injection' is under review.", isRead: true, actionUrl: "/requests", timestamp: "2026-05-10T11:00:00Z" },
  { id: "n_006", category: "system", title: "Profile Verified", message: "Your business profile has been successfully verified by FARUMASI.", isRead: true, timestamp: "2026-05-01T09:00:00Z" },
];

// ─── Compliance ───────────────────────────────────────────────────────────────

export const mockComplianceDocs: ComplianceDocument[] = [
  { id: "cd_001", name: "Business Registration Certificate", type: "business_registration", status: "valid", expiryDate: "2027-01-15", uploadedAt: "2024-01-15" },
  { id: "cd_002", name: "Rwanda Tax Clearance Certificate", type: "tax_certificate", status: "expiring_soon", expiryDate: "2026-06-30", uploadedAt: "2025-07-01" },
  { id: "cd_003", name: "Pharmacy Operating License", type: "pharmacy_license", status: "valid", expiryDate: "2027-08-20", uploadedAt: "2024-08-20" },
  { id: "cd_004", name: "RFDA Dispensing License", type: "rfda_license", status: "valid", expiryDate: "2027-08-20", uploadedAt: "2024-08-20" },
];

// ─── Team ─────────────────────────────────────────────────────────────────────

export const mockTeam: TeamMember[] = [
  { id: "tm_001", name: "Kalisa David", email: "david@inyangepharma.rw", phone: "+250 788 111 222", role: "owner", status: "active", lastActive: "2026-05-16T08:00:00Z", joinedAt: "2024-01-15" },
  { id: "tm_002", name: "Uwase Sandra", email: "sandra@inyangepharma.rw", phone: "+250 789 222 333", role: "manager", status: "active", lastActive: "2026-05-15T17:30:00Z", joinedAt: "2024-03-01" },
  { id: "tm_003", name: "Niyomugabo Felix", email: "felix@inyangepharma.rw", role: "pharmacist_staff", status: "active", lastActive: "2026-05-16T07:45:00Z", joinedAt: "2024-06-15" },
  { id: "tm_004", name: "Ingabire Claire", email: "claire@inyangepharma.rw", role: "inventory_staff", status: "active", lastActive: "2026-05-14T12:00:00Z", joinedAt: "2025-01-10" },
  { id: "tm_005", name: "Nkusi Emmanuel", email: "nkusi@inyangepharma.rw", role: "finance_staff", status: "invited", joinedAt: "2026-05-10" },
];

// ─── Product requests ─────────────────────────────────────────────────────────

export const mockProductRequests: ProductRequest[] = [
  { id: "pr_001", productName: "Ceftriaxone 1g Injection", genericName: "Ceftriaxone Sodium", brand: "Rocephin", manufacturer: "Roche", manufacturerCountry: "Switzerland", category: "medicines", dosageForm: "Injection", strength: "1g", description: "Third-generation cephalosporin antibiotic for severe infections.", intendedUse: "Hospital pharmacy dispensing", requiresPrescription: true, documents: [], suggestedPrice: 12000, status: "under_review", submittedAt: "2026-05-10T10:00:00Z", reviewNotes: "Awaiting RFDA documentation verification." },
  { id: "pr_002", productName: "Losartan Potassium 50mg", genericName: "Losartan", brand: "Cozaar", manufacturer: "MSD", manufacturerCountry: "USA", category: "medicines", dosageForm: "Tablet", strength: "50mg", description: "ARB antihypertensive for blood pressure management.", intendedUse: "Retail dispensing", requiresPrescription: true, documents: [], suggestedPrice: 7500, status: "approved", submittedAt: "2026-04-01T09:00:00Z", reviewNotes: "Approved. RFDA license confirmed.", reviewedAt: "2026-04-15T14:00:00Z", reviewedBy: "Dr. Murenzi (FARUMASI Pharmacist)" },
];

// ─── Activity logs ─────────────────────────────────────────────────────────────

export const mockActivityLogs: ActivityLog[] = [
  { id: "al_001", action: "Stock Updated", entity: "Product", entityId: "lp_001", performedBy: "Uwase Sandra", performedByRole: "manager", details: "Restocked Paracetamol 500mg: +200 units", timestamp: "2026-05-16T07:30:00Z" },
  { id: "al_002", action: "Price Changed", entity: "Product", entityId: "lp_005", performedBy: "Kalisa David", performedByRole: "owner", details: "BP Monitor price changed: 52,000 → 45,000 RWF", timestamp: "2026-05-15T16:00:00Z" },
  { id: "al_003", action: "Order Accepted", entity: "Order", entityId: "ord_002", performedBy: "Niyomugabo Felix", performedByRole: "pharmacist_staff", details: "Order FRM-2026-4400 accepted for preparation", timestamp: "2026-05-16T08:10:00Z" },
  { id: "al_004", action: "Withdrawal Requested", entity: "Finance", entityId: "wd_003", performedBy: "Nkusi Emmanuel", performedByRole: "finance_staff", details: "Withdrawal request: RWF 200,000 to Bank of Kigali", timestamp: "2026-05-15T16:30:00Z" },
  { id: "al_005", action: "Team Member Invited", entity: "Team", entityId: "tm_005", performedBy: "Kalisa David", performedByRole: "owner", details: "Invited Nkusi Emmanuel as Finance Staff", timestamp: "2026-05-10T10:00:00Z" },
];

// ─── Dashboard KPIs ───────────────────────────────────────────────────────────

export const mockKPIs: DashboardKPIs = {
  totalRevenue: 8_422_600,
  monthlyRevenue: 1_284_500,
  revenueGrowth: 8.7,
  activeListings: 6,
  totalProducts: 8,
  lowStockCount: 2,
  pendingOrders: 2,
  completedOrders: 892,
  cancelledOrders: 34,
  pendingWithdrawals: 500000,
  pendingRequests: 1,
  unreadNotifications: 3,
};
