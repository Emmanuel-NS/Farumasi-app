// ─── Core enums ───────────────────────────────────────────────────────────────

export type ProductStatus = "available" | "unavailable" | "low_stock" | "out_of_stock" | "suspended" | "pending_update";
export type OrderStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "preparing"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled"
  | "failed";
export type RequestStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "more_info_required"
  | "requires_info"
  | "approved"
  | "rejected";
export type WithdrawalStatus = "pending" | "processing" | "completed" | "rejected";
export type VerificationStatus = "unverified" | "pending" | "verified" | "suspended";
export type TeamRole = "owner" | "manager" | "inventory_staff" | "finance_staff" | "pharmacist_staff";
export type CompanyType = "pharmacy" | "supplier" | "device_company" | "distributor" | "wellness" | "importer" | "specialized";
export type ProductCategory = "medicines" | "medical_devices" | "diagnostics" | "wellness" | "supplements" | "equipment" | "consumables" | "specialized";

// ─── Product models ───────────────────────────────────────────────────────────

export interface ApprovedProduct {
  id: string;
  name: string;
  genericName?: string;
  brand: string;
  manufacturer: string;
  category: ProductCategory;
  subCategory?: string;
  dosageForm?: string;
  strength?: string;
  description: string;
  imageUrl?: string;
  approvalStatus: "approved" | "pending" | "withdrawn";
  rfidaApprovalNo?: string;
  requiresPrescription: boolean;
  tags: string[];
  createdAt: string;
}

export interface ListedProduct {
  id: string;
  approvedProductId: string;
  product: ApprovedProduct;
  sku?: string;
  price: number;        // RWF
  comparePrice?: number;
  stockQty: number;
  reorderThreshold: number;
  status: ProductStatus;
  deliveryAvailable: boolean;
  pickupAvailable: boolean;
  batchNumber?: string;
  expiryDate?: string;
  totalSales: number;
  totalRevenue: number;
  lastUpdated: string;
}

// ─── Order models ─────────────────────────────────────────────────────────────

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  requiresPrescription: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  commission: number;
  netAmount: number;
  status: OrderStatus;
  isDelivery: boolean;
  deliveryAddress?: string;
  hasPrescription: boolean;
  prescriptionUrl?: string;
  notes?: string;
  placedAt: string;
  updatedAt: string;
  completedAt?: string;
}

// ─── Inventory models ─────────────────────────────────────────────────────────

export interface InventoryEntry {
  id: string;
  listedProductId: string;
  productName: string;
  sku?: string;
  category: ProductCategory;
  currentStock: number;
  reorderThreshold: number;
  maxStock: number;
  batchNumber?: string;
  expiryDate?: string;
  daysUntilExpiry?: number;
  lastRestocked?: string;
  unitCost?: number;
  status: ProductStatus;
  movements: StockMovement[];
}

export interface StockMovement {
  id: string;
  type: "restock" | "sale" | "adjustment" | "write_off" | "return";
  quantity: number;
  note?: string;
  performedBy: string;
  timestamp: string;
}

// ─── Financial models ─────────────────────────────────────────────────────────

export interface RevenueStats {
  totalRevenue: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  todayRevenue: number;
  pendingBalance: number;
  availableBalance: number;
  totalCommissionPaid: number;
  totalWithdrawn: number;
}

export interface Transaction {
  id: string;
  type: "sale" | "withdrawal" | "commission" | "refund" | "adjustment";
  orderId?: string;
  amount: number;
  fee?: number;
  netAmount: number;
  description: string;
  status: "completed" | "pending" | "failed";
  timestamp: string;
}

export interface WithdrawalRequest {
  id: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: WithdrawalStatus;
  requestedAt: string;
  processedAt?: string;
  rejectionReason?: string;
}

// ─── Product request models ───────────────────────────────────────────────────

export interface ProductRequest {
  id: string;
  productName: string;
  genericName?: string;
  brand: string;
  manufacturer: string;
  manufacturerCountry: string;
  category: ProductCategory;
  dosageForm?: string;
  strength?: string;
  description: string;
  intendedUse: string;
  requiresPrescription: boolean;
  rfidaApprovalNo?: string;
  documents: UploadedDocument[];
  suggestedPrice?: number;
  notes?: string;
  status: RequestStatus;
  submittedAt?: string;
  reviewNotes?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface UploadedDocument {
  id: string;
  name: string;
  type: "regulatory_approval" | "product_sheet" | "safety_data" | "certificate" | "other";
  url: string;
  uploadedAt: string;
}

// ─── Notification models ──────────────────────────────────────────────────────

export type NotificationCategory = "order" | "inventory" | "approval" | "withdrawal" | "compliance" | "system";

export interface Notification {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  timestamp: string;
}

// ─── Compliance models ────────────────────────────────────────────────────────

export interface ComplianceDocument {
  id: string;
  name: string;
  type: "business_registration" | "tax_certificate" | "pharmacy_license" | "rfda_license" | "import_permit" | "other";
  status: "valid" | "expiring_soon" | "expired" | "pending_review";
  expiryDate?: string;
  uploadedAt: string;
  url?: string;
}

// ─── Team models ──────────────────────────────────────────────────────────────

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: TeamRole;
  status: "active" | "invited" | "suspended";
  lastActive?: string;
  joinedAt: string;
  avatarUrl?: string;
}

// ─── Analytics models ─────────────────────────────────────────────────────────

export interface DashboardKPIs {
  totalRevenue: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  activeListings: number;
  totalProducts: number;
  lowStockCount: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  pendingWithdrawals: number;
  pendingRequests: number;
  unreadNotifications: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  secondary?: number;
}

export interface ActivityLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  performedBy: string;
  performedByRole: TeamRole;
  details?: string;
  timestamp: string;
}

// ─── Business profile ─────────────────────────────────────────────────────────

export interface BusinessProfile {
  id: string;
  name: string;
  type: CompanyType;
  description: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  website?: string;
  logoUrl?: string;
  verificationStatus: VerificationStatus;
  joinedAt: string;
  totalProducts: number;
  totalOrders: number;
}
