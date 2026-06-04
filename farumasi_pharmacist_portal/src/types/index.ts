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
  | "accepted"
  | "rejected"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "delivered"
  | "completed"
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

export type AgeRange = "infant_toddler" | "toddler" | "child" | "adolescent" | "adult";

export interface AgeDosage {
  ageRange: AgeRange;
  instructions: string;
}

export interface InventoryItem {
  id: number;
  name: string;
  imageUrl: string;
  manufacturer: string;         // brand / maker (e.g. "HealthLive Pharma")
  category: string;
  subCategory?: string;
  additionalCategories: string[];
  sku: string;
  stock: number;
  minStock: number;
  unitPrice: number;
  /** Lowest price for this item across all pharmacies on the platform */
  marketPriceMin: number;
  /** Highest price for this item across all pharmacies on the platform */
  marketPriceMax: number;
  expiryDate: string;           // ISO date
  supplier: string;             // procurement supplier
  stockStatus: StockStatus;
  requiresPrescription: boolean;
  lastRestocked: string;
  isPublished: boolean;
  rating: number;
  // Catalogue content
  shortDescription: string;
  dosageSummary: string;
  description: string;
  sideEffects: string;
  dosage: string;
  doseMorning?: string;
  doseAfternoon?: string;
  doseEvening?: string;
  doseTimeInterval?: string;
  ageDosages: AgeDosage[];
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

// ─── Health Posts ─────────────────────────────────────
export type HealthPostCategory =
  | "General Tips"
  | "Remedies"
  | "SRH"
  | "Mental Health"
  | "Nutrition"
  | "Mother & Babies"
  | "Did You Know?";

export type HealthPostStatus = "Published" | "Draft";

export interface HealthPost {
  id: string;
  title: string;
  summary: string;
  category: HealthPostCategory;
  views: number;
  date: string;
  status: HealthPostStatus;
  /** HTML content from RichEditor */
  content: string;
  /** Thumbnail shown on list cards */
  posterImage?: string;
  /** Hero image shown when reading the full article */
  coverImage?: string;
  /** YouTube video URL used as cover (takes precedence over coverImage; falls back to posterImage) */
  youtubeLink?: string;
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
