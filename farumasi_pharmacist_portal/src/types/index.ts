// ─── Auth ───────────────────────────────────────────────
export type PharmacistRole = "owner" | "staff" | "manager";

export interface PharmacistUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: PharmacistRole;
  pharmacyId: string;
  pharmacyName: string;
  pharmacyAddress?: string;
  pharmacyCity?: string;
  avatarUrl?: string;
}

// ─── Prescription Requests ─────────────────────────────
export type RequestStatus =
  | "broadcast"          // waiting for pharmacy to accept
  | "accepted"           // pharmacy accepted, preparing invoice
  | "invoice_sent"       // invoice sent to patient
  | "patient_confirmed"  // patient confirmed
  | "rejected"
  | "expired";

export interface PrescriptionItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface PrescriptionRequest {
  id: string;
  patientName: string;
  patientPhone: string;
  prescriptionImageUrl?: string;
  items: PrescriptionItem[];
  totalAmount: number;
  status: RequestStatus;
  broadcastAt: string;
  acceptedAt?: string;
  expiresAt: string;
  notes?: string;
}

// ─── Orders ────────────────────────────────────────────
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "failed";

export interface OrderItem {
  medicineName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  patientName: string;
  patientPhone: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: "mobile_money" | "card" | "cash";
  createdAt: string;
  updatedAt: string;
  deliveryAddress?: string;
  driverId?: string;
  driverName?: string;
}

// ─── Inventory ─────────────────────────────────────────
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface InventoryItem {
  id: number;
  name: string;
  category: string;
  sku: string;
  stock: number;
  minStock: number;
  unitPrice: number;
  expiryDate: string;
  supplier: string;
  stockStatus: StockStatus;
  requiresPrescription: boolean;
  lastRestocked: string;
}

// ─── Fleet ─────────────────────────────────────────────
export type DriverStatus = "available" | "on_delivery" | "off_duty";

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicleType: "motorcycle" | "bicycle" | "car";
  vehiclePlate: string;
  status: DriverStatus;
  currentOrderId?: string;
  totalDeliveries: number;
  rating: number;
}

// ─── Audit Logs ────────────────────────────────────────
export type AuditAction =
  | "inventory_update"
  | "order_status_change"
  | "request_accepted"
  | "request_rejected"
  | "login"
  | "invoice_sent"
  | "driver_assigned";

export interface AuditLog {
  id: number;
  action: AuditAction;
  description: string;
  performedBy: string;
  timestamp: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

// ─── Chat ──────────────────────────────────────────────
export type ChatType = "consultation" | "general";

export interface ChatThread {
  id: string;
  patientName: string;
  patientPhone?: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
  type: ChatType;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderRole: "pharmacist" | "patient";
  content: string;
  sentAt: string;
  isRead?: boolean;
}

// ─── Analytics snapshot ─────────────────────────────────
export interface DashboardStats {
  totalOrdersToday: number;
  pendingRequests: number;
  revenue30d: number;
  lowStockItems: number;
  activeDrivers: number;
}

// ─── Notifications ─────────────────────────────────────
export type NotifCategory = "order" | "request" | "inventory" | "system" | "chat";

export interface AppNotification {
  id: string;
  category: NotifCategory;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
}

// ─── Generics ──────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}
