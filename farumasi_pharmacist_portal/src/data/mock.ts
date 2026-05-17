import type {
  PharmacistUser, PrescriptionRequest, Order,
  InventoryItem, Driver, AuditLog, ChatThread, DashboardStats, AppNotification,
} from "@/types";

// ─── Auth ────────────────────────────────────────────
export const mockPharmacist: PharmacistUser = {
  id: "ph_001",
  name: "Dr. Mutoni Claire",
  email: "claire.mutoni@farumasi.rw",
  phone: "+250 788 111 222",
  role: "owner",
  pharmacyId: "pharmacy_001",
  pharmacyName: "Kigali Central Pharmacy",
  pharmacyAddress: "KG 7 Ave, Kigali, Rwanda",
  pharmacyCity: "Kigali",
};

// ─── Dashboard Stats ─────────────────────────────────
export const mockStats: DashboardStats = {
  totalOrdersToday: 24,
  pendingRequests: 7,
  revenue30d: 4_850_000,
  lowStockItems: 5,
  activeDrivers: 3,
};

// ─── Prescription Requests ───────────────────────────
export const mockRequests: PrescriptionRequest[] = [
  {
    id: "REQ-001",
    patientName: "Amina Uwase",
    patientPhone: "+250 788 000 000",
    items: [
      { name: "Amoxicillin 500mg", quantity: 2, unitPrice: 2500 },
      { name: "Paracetamol 500mg", quantity: 1, unitPrice: 1200 },
    ],
    totalAmount: 6200,
    status: "broadcast",
    broadcastAt: new Date(Date.now() - 5 * 60000).toISOString(),
    expiresAt: new Date(Date.now() + 25 * 60000).toISOString(),
  },
  {
    id: "REQ-002",
    patientName: "Jean Bosco",
    patientPhone: "+250 788 333 444",
    items: [{ name: "Metformin 500mg", quantity: 3, unitPrice: 3000 }],
    totalAmount: 9000,
    status: "invoice_sent",
    broadcastAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    acceptedAt: new Date(Date.now() - 1.5 * 3600000).toISOString(),
    expiresAt: new Date(Date.now() + 12 * 3600000).toISOString(),
  },
  {
    id: "REQ-003",
    patientName: "Diane Ingabire",
    patientPhone: "+250 788 555 666",
    items: [
      { name: "Chloroquine 250mg", quantity: 1, unitPrice: 4500 },
      { name: "ORS Sachet", quantity: 5, unitPrice: 500 },
    ],
    totalAmount: 7000,
    status: "accepted",
    broadcastAt: new Date(Date.now() - 45 * 60000).toISOString(),
    acceptedAt: new Date(Date.now() - 30 * 60000).toISOString(),
    expiresAt: new Date(Date.now() + 8 * 3600000).toISOString(),
  },
  {
    id: "REQ-004",
    patientName: "Patrick Nzeyimana",
    patientPhone: "+250 788 777 888",
    items: [{ name: "Loratadine 10mg", quantity: 1, unitPrice: 1800 }],
    totalAmount: 1800,
    status: "patient_confirmed",
    broadcastAt: new Date(Date.now() - 6 * 3600000).toISOString(),
    acceptedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
  },
];

// ─── Orders ──────────────────────────────────────────
export const mockOrders: Order[] = [
  {
    id: "ORD-7829X",
    patientName: "Amina Uwase",
    patientPhone: "+250 788 000 000",
    items: [
      { medicineName: "Panadol Extra 500mg", quantity: 2, unitPrice: 1800, totalPrice: 3600 },
      { medicineName: "Vitamin C 1000mg", quantity: 1, unitPrice: 4500, totalPrice: 4500 },
    ],
    totalAmount: 8100,
    status: "out_for_delivery",
    paymentMethod: "mobile_money",
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60000).toISOString(),
    deliveryAddress: "KG 123 St, Kigali",
    driverId: "drv_001",
    driverName: "Jean Kayitare",
  },
  {
    id: "ORD-6541B",
    patientName: "Jean Bosco",
    patientPhone: "+250 788 333 444",
    items: [{ medicineName: "Metformin 500mg", quantity: 3, unitPrice: 3000, totalPrice: 9000 }],
    totalAmount: 9000,
    status: "preparing",
    paymentMethod: "mobile_money",
    createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 60000).toISOString(),
    deliveryAddress: "KN 44 Ave, Kigali",
  },
  {
    id: "ORD-5031C",
    patientName: "Diane Ingabire",
    patientPhone: "+250 788 555 666",
    items: [
      { medicineName: "Chloroquine 250mg", quantity: 1, unitPrice: 4500, totalPrice: 4500 },
      { medicineName: "ORS Sachet", quantity: 5, unitPrice: 500, totalPrice: 2500 },
    ],
    totalAmount: 7000,
    status: "delivered",
    paymentMethod: "cash",
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 3600000).toISOString(),
    deliveryAddress: "KG 8 Ave, Kigali",
    driverName: "Eric Habimana",
  },
  {
    id: "ORD-4422D",
    patientName: "Patrick Nzeyimana",
    patientPhone: "+250 788 777 888",
    items: [{ medicineName: "Loratadine 10mg", quantity: 1, unitPrice: 1800, totalPrice: 1800 }],
    totalAmount: 1800,
    status: "cancelled",
    paymentMethod: "card",
    createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 47 * 3600000).toISOString(),
  },
];

// ─── Inventory ───────────────────────────────────────
export const mockInventory: InventoryItem[] = [
  { id: 1, name: "Panadol Extra 500mg", category: "Analgesic", sku: "MED-001", stock: 142, minStock: 20, unitPrice: 1800, expiryDate: "2026-03-01", supplier: "GlaxoSmithKline", stockStatus: "in_stock", requiresPrescription: false, lastRestocked: "2025-01-10" },
  { id: 2, name: "Amoxicillin 500mg", category: "Antibiotic", sku: "MED-002", stock: 8, minStock: 15, unitPrice: 2500, expiryDate: "2025-11-15", supplier: "Cipla Rwanda", stockStatus: "low_stock", requiresPrescription: true, lastRestocked: "2025-01-05" },
  { id: 3, name: "Vitamin C 1000mg", category: "Vitamins", sku: "MED-003", stock: 0, minStock: 10, unitPrice: 4500, expiryDate: "2026-06-01", supplier: "Nature's Best", stockStatus: "out_of_stock", requiresPrescription: false, lastRestocked: "2024-12-20" },
  { id: 4, name: "Metformin 500mg", category: "Diabetes", sku: "MED-004", stock: 60, minStock: 10, unitPrice: 3000, expiryDate: "2026-01-01", supplier: "Cipla Rwanda", stockStatus: "in_stock", requiresPrescription: true, lastRestocked: "2025-01-12" },
  { id: 5, name: "Ibuprofen 400mg", category: "NSAID", sku: "MED-005", stock: 3, minStock: 15, unitPrice: 1500, expiryDate: "2025-09-30", supplier: "Abbott", stockStatus: "low_stock", requiresPrescription: false, lastRestocked: "2024-12-15" },
  { id: 6, name: "ORS Sachet", category: "ORS", sku: "MED-006", stock: 200, minStock: 30, unitPrice: 500, expiryDate: "2026-12-01", supplier: "UNICEF Rwanda", stockStatus: "in_stock", requiresPrescription: false, lastRestocked: "2025-01-01" },
  { id: 7, name: "Chloroquine 250mg", category: "Antimalarial", sku: "MED-007", stock: 0, minStock: 10, unitPrice: 4500, expiryDate: "2025-08-01", supplier: "Sanofi Rwanda", stockStatus: "out_of_stock", requiresPrescription: true, lastRestocked: "2024-11-01" },
  { id: 8, name: "Loratadine 10mg", category: "Antihistamine", sku: "MED-008", stock: 45, minStock: 10, unitPrice: 1800, expiryDate: "2026-04-01", supplier: "Bayer Rwanda", stockStatus: "in_stock", requiresPrescription: false, lastRestocked: "2025-01-08" },
];

// ─── Fleet ───────────────────────────────────────────
export const mockDrivers: Driver[] = [
  { id: "drv_001", name: "Jean Kayitare", phone: "+250 788 100 100", vehicleType: "motorcycle", vehiclePlate: "RAD 123 A", status: "on_delivery", currentOrderId: "ORD-7829X", totalDeliveries: 234, rating: 4.9 },
  { id: "drv_002", name: "Eric Habimana", phone: "+250 788 200 200", vehicleType: "bicycle", vehiclePlate: "RAD 456 B", status: "available", totalDeliveries: 189, rating: 4.7 },
  { id: "drv_003", name: "Alice Uwimana", phone: "+250 788 300 300", vehicleType: "motorcycle", vehiclePlate: "RAD 789 C", status: "off_duty", totalDeliveries: 102, rating: 4.8 },
];

// ─── Audit Logs ──────────────────────────────────────
export const mockAuditLogs: AuditLog[] = [
  { id: 1, action: "request_accepted", description: "Accepted prescription request REQ-003 from Diane Ingabire", performedBy: "Dr. Mutoni Claire", timestamp: new Date(Date.now() - 30 * 60000).toISOString(), entityId: "REQ-003" },
  { id: 2, action: "order_status_change", description: "Order ORD-7829X moved to Out for Delivery", performedBy: "Dr. Mutoni Claire", timestamp: new Date(Date.now() - 32 * 60000).toISOString(), entityId: "ORD-7829X" },
  { id: 3, action: "driver_assigned", description: "Driver Jean Kayitare assigned to ORD-7829X", performedBy: "System", timestamp: new Date(Date.now() - 33 * 60000).toISOString(), entityId: "ORD-7829X" },
  { id: 4, action: "inventory_update", description: "Vitamin C 1000mg stock updated: 5 → 0", performedBy: "Dr. Mutoni Claire", timestamp: new Date(Date.now() - 3 * 3600000).toISOString(), entityId: "MED-003" },
  { id: 5, action: "invoice_sent", description: "Invoice sent to Jean Bosco for REQ-002", performedBy: "Dr. Mutoni Claire", timestamp: new Date(Date.now() - 1.5 * 3600000).toISOString(), entityId: "REQ-002" },
  { id: 6, action: "login", description: "Dr. Mutoni Claire logged in from Kigali, Rwanda", performedBy: "Dr. Mutoni Claire", timestamp: new Date(Date.now() - 5 * 3600000).toISOString() },
];

// ─── Chat Threads ────────────────────────────────────
export const mockChatThreads: ChatThread[] = [
  { id: "chat_001", patientName: "Amina Uwase", lastMessage: "What's the dosage for Amoxicillin?", lastMessageAt: new Date(Date.now() - 10 * 60000).toISOString(), unread: 2, type: "consultation" },
  { id: "chat_002", patientName: "Jean Bosco", lastMessage: "My prescription is uploaded", lastMessageAt: new Date(Date.now() - 45 * 60000).toISOString(), unread: 0, type: "general" },
  { id: "chat_003", patientName: "Diane Ingabire", lastMessage: "When will my order arrive?", lastMessageAt: new Date(Date.now() - 2 * 3600000).toISOString(), unread: 1, type: "general" },
];

// ─── Notifications ───────────────────────────────────
export const mockNotifications: AppNotification[] = [
  { id: "n1", category: "request", title: "New Prescription Request", message: "Amina Uwase sent a prescription request", time: new Date(Date.now() - 5 * 60000).toISOString(), isRead: false },
  { id: "n2", category: "inventory", title: "Low Stock Alert", message: "Amoxicillin 500mg is running low (8 units left)", time: new Date(Date.now() - 1 * 3600000).toISOString(), isRead: false },
  { id: "n3", category: "order", title: "Order Delivered", message: "ORD-5031C delivered to Diane Ingabire", time: new Date(Date.now() - 20 * 3600000).toISOString(), isRead: true },
  { id: "n4", category: "chat", title: "New Message", message: "Amina Uwase sent a message", time: new Date(Date.now() - 10 * 60000).toISOString(), isRead: false },
  { id: "n5", category: "system", title: "System Update", message: "Farumasi platform updated to v2.1.0", time: new Date(Date.now() - 2 * 24 * 3600000).toISOString(), isRead: true },
];
