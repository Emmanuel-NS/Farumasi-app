// ═══════════════════════════════════════════════════════════════════════════════
// FARUMASI MOCK SERVICE LAYER
//
// All portals use these services instead of importing mock data directly.
// Each function simulates an async API call with realistic delays.
// Replace these implementations with real HTTP/API calls when backend is ready.
//
// Pattern: all functions return Promise<T> to make the API-ready migration trivial.
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  Patient, Doctor, Hospital, Department, Pharmacist, Pharmacy,
  CatalogueProduct, ProductListing, ProductRequest,
  Prescription, Order, Delivery, Rider,
  RevenueRecord, HealthArticle, AppNotification, AuditLog, AIInsight,
  MedicineAvailabilityRecord, PharmacyRecommendation,
  InsuranceProvider, UserRole,
} from "../types";

import {
  mockPatients, mockDoctors, mockHospitals, mockDepartments,
  mockPharmacists, mockPharmacies, mockCatalogueProducts,
  mockProductListings, mockProductRequests, mockPrescriptions,
  mockOrders, mockDeliveries, mockRiders, mockRevenueRecords,
  mockHealthArticles, mockAIInsights, mockAvailabilityRecords,
} from "../data";

import { getPharmacyRecommendations, type RecommendationInput } from "./recommendation-engine";

// ── Utility ───────────────────────────────────────────────────────────────────

function delay<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function simulateError(chance = 0): void {
  if (Math.random() < chance) throw new Error("Simulated network error");
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const authService = {
  /** Mock login — returns user matching email in mock data */
  async login(email: string, _password: string): Promise<{ user: Patient | Doctor | Pharmacist | Rider | null; token: string | null }> {
    const allUsers = [
      ...mockPatients,
      ...mockDoctors,
      ...mockPharmacists,
      ...mockRiders,
    ] as (Patient | Doctor | Pharmacist | Rider)[];
    const user = allUsers.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
    const token = user ? `mock-jwt-${user.id}-${Date.now()}` : null;
    return delay(400, { user, token });
  },

  async logout(): Promise<void> {
    return delay(100, undefined);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const patientService = {
  async getAll(): Promise<Patient[]> {
    return delay(200, [...mockPatients]);
  },

  async getById(id: string): Promise<Patient | null> {
    return delay(150, mockPatients.find((p) => p.id === id) ?? null);
  },

  async getByPhone(phone: string): Promise<Patient | null> {
    return delay(150, mockPatients.find((p) => p.phone === phone) ?? null);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const doctorService = {
  async getAll(): Promise<Doctor[]> {
    return delay(200, [...mockDoctors]);
  },

  async getById(id: string): Promise<Doctor | null> {
    return delay(150, mockDoctors.find((d) => d.id === id) ?? null);
  },

  async getByHospital(hospitalId: string): Promise<Doctor[]> {
    return delay(200, mockDoctors.filter((d) => d.hospitalId === hospitalId));
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HOSPITAL SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const hospitalService = {
  async getAll(): Promise<Hospital[]> {
    return delay(200, [...mockHospitals]);
  },

  async getById(id: string): Promise<Hospital | null> {
    return delay(150, mockHospitals.find((h) => h.id === id) ?? null);
  },

  async getDepartments(hospitalId: string): Promise<Department[]> {
    return delay(200, mockDepartments.filter((d) => d.hospitalId === hospitalId));
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PHARMACIST SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const pharmacistService = {
  async getAll(): Promise<Pharmacist[]> {
    return delay(200, [...mockPharmacists]);
  },

  async getById(id: string): Promise<Pharmacist | null> {
    return delay(150, mockPharmacists.find((p) => p.id === id) ?? null);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PHARMACY SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const pharmacyService = {
  async getAll(): Promise<Pharmacy[]> {
    return delay(200, [...mockPharmacies]);
  },

  async getById(id: string): Promise<Pharmacy | null> {
    return delay(150, mockPharmacies.find((p) => p.id === id) ?? null);
  },

  async getActive(): Promise<Pharmacy[]> {
    return delay(200, mockPharmacies.filter((p) => p.status === "active"));
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const productService = {
  /** Get all approved catalogue products */
  async getCatalogue(): Promise<CatalogueProduct[]> {
    return delay(200, mockCatalogueProducts.filter((p) => p.status === "approved"));
  },

  async getCatalogueById(id: string): Promise<CatalogueProduct | null> {
    return delay(150, mockCatalogueProducts.find((p) => p.id === id) ?? null);
  },

  /** Get product listings (pharmacy stock) — optionally filtered by pharmacy */
  async getListings(pharmacyId?: string): Promise<ProductListing[]> {
    const listings = pharmacyId
      ? mockProductListings.filter((l) => l.pharmacyId === pharmacyId)
      : mockProductListings;
    return delay(200, listings);
  },

  /** Get product requests — filtered by pharmacy or all */
  async getRequests(pharmacyId?: string): Promise<ProductRequest[]> {
    const requests = pharmacyId
      ? mockProductRequests.filter((r) => r.pharmacyId === pharmacyId)
      : mockProductRequests;
    return delay(200, requests);
  },

  /** Update listing availability and stock */
  async updateListing(
    listingId: string,
    updates: Partial<ProductListing>
  ): Promise<ProductListing | null> {
    const index = mockProductListings.findIndex((l) => l.id === listingId);
    if (index === -1) return delay(150, null);
    const updated = { ...mockProductListings[index], ...updates, updatedAt: new Date().toISOString() };
    mockProductListings[index] = updated;
    return delay(300, updated);
  },

  /** Submit a new product request */
  async submitRequest(
    request: Omit<ProductRequest, "id" | "status" | "submittedAt">
  ): Promise<ProductRequest> {
    const newRequest: ProductRequest = {
      ...request,
      id: `preq-${Date.now()}`,
      status: "submitted",
      submittedAt: new Date().toISOString(),
    };
    mockProductRequests.push(newRequest);
    return delay(300, newRequest);
  },

  /** Pharmacist/admin reviews a product request */
  async reviewRequest(
    requestId: string,
    action: "approve" | "reject" | "requires_info",
    notes: string,
    reviewedBy: string
  ): Promise<ProductRequest | null> {
    const index = mockProductRequests.findIndex((r) => r.id === requestId);
    if (index === -1) return delay(150, null);
    const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "requires_info";
    mockProductRequests[index] = {
      ...mockProductRequests[index],
      status,
      reviewNotes: notes,
      reviewedBy,
      reviewedAt: new Date().toISOString(),
      resolvedAt: action !== "requires_info" ? new Date().toISOString() : undefined,
    };
    return delay(300, mockProductRequests[index]);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PRESCRIPTION SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const prescriptionService = {
  /** Get all prescriptions (super admin / pharmacist view) */
  async getAll(): Promise<Prescription[]> {
    return delay(200, [...mockPrescriptions]);
  },

  /** Get prescriptions for a specific patient */
  async getByPatient(patientId: string): Promise<Prescription[]> {
    return delay(200, mockPrescriptions.filter((rx) => rx.patientId === patientId));
  },

  /** Get prescriptions by a specific doctor */
  async getByDoctor(doctorId: string): Promise<Prescription[]> {
    return delay(200, mockPrescriptions.filter((rx) => rx.doctorId === doctorId));
  },

  async getById(id: string): Promise<Prescription | null> {
    return delay(150, mockPrescriptions.find((rx) => rx.id === id) ?? null);
  },

  /** Doctor creates a new digital prescription */
  async create(
    prescription: Omit<Prescription, "id" | "qrCode" | "issuedAt" | "expiresAt" | "status">
  ): Promise<Prescription> {
    const now = new Date();
    const expiry = new Date(now);
    expiry.setDate(expiry.getDate() + 30);

    const newRx: Prescription = {
      ...prescription,
      id: `rx-${Date.now()}`,
      status: "draft",
      issuedAt: now.toISOString(),
      expiresAt: expiry.toISOString(),
      qrCode: `RX-${Date.now()}-QR-${now.toISOString().replace(/[^0-9]/g, "").slice(0, 14)}`,
    };
    mockPrescriptions.push(newRx);
    return delay(400, newRx);
  },

  /** Doctor sends prescription to patient */
  async sendToPatient(prescriptionId: string): Promise<Prescription | null> {
    const index = mockPrescriptions.findIndex((rx) => rx.id === prescriptionId);
    if (index === -1) return delay(150, null);
    mockPrescriptions[index] = {
      ...mockPrescriptions[index],
      status: "sent_to_patient",
      sentToPatientAt: new Date().toISOString(),
    };
    return delay(300, mockPrescriptions[index]);
  },

  /** Patient selects a pharmacy for their prescription */
  async selectPharmacy(prescriptionId: string, pharmacyId: string): Promise<Prescription | null> {
    const index = mockPrescriptions.findIndex((rx) => rx.id === prescriptionId);
    if (index === -1) return delay(150, null);
    mockPrescriptions[index] = {
      ...mockPrescriptions[index],
      status: "order_placed",
      selectedPharmacyId: pharmacyId,
    };
    return delay(300, mockPrescriptions[index]);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// RECOMMENDATION SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const recommendationService = {
  /**
   * Get top 3 pharmacy recommendations for a prescription.
   * Used by: doctor portal (before prescribing), patient portal (choosing pharmacy)
   */
  async getForPrescription(
    prescriptionId: string,
    patientLat: number,
    patientLng: number,
    preferDelivery: boolean
  ): Promise<PharmacyRecommendation[]> {
    const prescription = mockPrescriptions.find((rx) => rx.id === prescriptionId);
    if (!prescription) return delay(200, []);

    const patient = mockPatients.find((p) => p.id === prescription.patientId);
    const insurance = patient?.insurance ?? "NONE";

    const input: RecommendationInput = {
      prescriptionItemIds: prescription.items.map((i) => i.catalogueProductId),
      quantities: Object.fromEntries(prescription.items.map((i) => [i.catalogueProductId, i.quantity])),
      patientInsurance: insurance,
      patientLat,
      patientLng,
      preferDelivery,
      pharmacies: mockPharmacies,
      productListings: mockProductListings,
      catalogueProducts: mockCatalogueProducts,
    };

    const results = getPharmacyRecommendations(input);
    return delay(500, results);
  },

  /**
   * Get recommendations for an arbitrary list of medicine IDs.
   * Used by: doctor portal (availability check before prescribing)
   */
  async getForMedicineList(
    medicineIds: string[],
    quantities: Record<string, number>,
    patientInsurance: InsuranceProvider,
    patientLat: number,
    patientLng: number,
    preferDelivery: boolean
  ): Promise<PharmacyRecommendation[]> {
    const input: RecommendationInput = {
      prescriptionItemIds: medicineIds,
      quantities,
      patientInsurance,
      patientLat,
      patientLng,
      preferDelivery,
      pharmacies: mockPharmacies,
      productListings: mockProductListings,
      catalogueProducts: mockCatalogueProducts,
    };
    const results = getPharmacyRecommendations(input);
    return delay(500, results);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ORDER SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const orderService = {
  async getAll(): Promise<Order[]> {
    return delay(200, [...mockOrders]);
  },

  async getByPatient(patientId: string): Promise<Order[]> {
    return delay(200, mockOrders.filter((o) => o.patientId === patientId));
  },

  async getByPharmacy(pharmacyId: string): Promise<Order[]> {
    return delay(200, mockOrders.filter((o) => o.pharmacyId === pharmacyId));
  },

  async getById(id: string): Promise<Order | null> {
    return delay(150, mockOrders.find((o) => o.id === id) ?? null);
  },

  async updateStatus(
    orderId: string,
    status: Order["status"],
    metadata?: Partial<Order>
  ): Promise<Order | null> {
    const index = mockOrders.findIndex((o) => o.id === orderId);
    if (index === -1) return delay(150, null);
    mockOrders[index] = { ...mockOrders[index], status, ...metadata };
    return delay(300, mockOrders[index]);
  },

  async place(order: Omit<Order, "id" | "qrCode" | "placedAt">): Promise<Order> {
    const newOrder: Order = {
      ...order,
      id: `ord-${Date.now()}`,
      qrCode: `ORD-${Date.now()}-QR-${Date.now()}`,
      placedAt: new Date().toISOString(),
    };
    mockOrders.push(newOrder);
    return delay(400, newOrder);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const deliveryService = {
  async getAll(): Promise<Delivery[]> {
    return delay(200, [...mockDeliveries]);
  },

  async getById(id: string): Promise<Delivery | null> {
    return delay(150, mockDeliveries.find((d) => d.id === id) ?? null);
  },

  async getByRider(riderId: string): Promise<Delivery[]> {
    return delay(200, mockDeliveries.filter((d) => d.riderId === riderId));
  },

  async getActiveForRider(riderId: string): Promise<Delivery | null> {
    return delay(200, mockDeliveries.find(
      (d) =>
        d.riderId === riderId &&
        !["delivered", "failed", "returned"].includes(d.status)
    ) ?? null);
  },

  /** Rider accepts a delivery */
  async accept(deliveryId: string, riderId: string, riderName: string, riderPhone: string): Promise<Delivery | null> {
    const index = mockDeliveries.findIndex((d) => d.id === deliveryId);
    if (index === -1) return delay(150, null);
    mockDeliveries[index] = {
      ...mockDeliveries[index],
      riderId,
      riderName,
      riderPhone,
      status: "assigned",
      assignedAt: new Date().toISOString(),
    };
    return delay(300, mockDeliveries[index]);
  },

  /** Rider rejects delivery with reason */
  async reject(deliveryId: string, reason: string): Promise<Delivery | null> {
    const index = mockDeliveries.findIndex((d) => d.id === deliveryId);
    if (index === -1) return delay(150, null);
    mockDeliveries[index] = {
      ...mockDeliveries[index],
      status: "failed",
      rejectionReason: reason,
      failedAt: new Date().toISOString(),
    };
    return delay(300, mockDeliveries[index]);
  },

  /** Rider confirms pickup */
  async confirmPickup(deliveryId: string): Promise<Delivery | null> {
    const index = mockDeliveries.findIndex((d) => d.id === deliveryId);
    if (index === -1) return delay(150, null);
    mockDeliveries[index] = {
      ...mockDeliveries[index],
      status: "picked_up",
      pickedUpAt: new Date().toISOString(),
    };
    return delay(300, mockDeliveries[index]);
  },

  /** Rider scans QR to confirm delivery */
  async confirmDeliveryByQR(deliveryId: string, scannedQR: string): Promise<{ success: boolean; delivery: Delivery | null }> {
    const index = mockDeliveries.findIndex((d) => d.id === deliveryId);
    if (index === -1) return delay(300, { success: false, delivery: null });

    const delivery = mockDeliveries[index];
    if (delivery.qrCode !== scannedQR) {
      return delay(300, { success: false, delivery: null });
    }

    mockDeliveries[index] = {
      ...delivery,
      status: "delivered",
      qrConfirmedAt: new Date().toISOString(),
      deliveredAt: new Date().toISOString(),
      actualMinutes: delivery.pickedUpAt
        ? Math.round((Date.now() - new Date(delivery.pickedUpAt).getTime()) / 60000)
        : undefined,
    };
    return delay(400, { success: true, delivery: mockDeliveries[index] });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// RIDER SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const riderService = {
  async getAll(): Promise<Rider[]> {
    return delay(200, [...mockRiders]);
  },

  async getById(id: string): Promise<Rider | null> {
    return delay(150, mockRiders.find((r) => r.id === id) ?? null);
  },

  async getAvailable(): Promise<Rider[]> {
    return delay(200, mockRiders.filter((r) => r.riderStatus === "available"));
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// REVENUE SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const revenueService = {
  async getAll(): Promise<RevenueRecord[]> {
    return delay(200, [...mockRevenueRecords]);
  },

  async getByPharmacy(pharmacyId: string): Promise<RevenueRecord[]> {
    return delay(200, mockRevenueRecords.filter((r) => r.pharmacyId === pharmacyId));
  },

  async getPlatformTotals(): Promise<{
    totalGross: number;
    totalCommissions: number;
    totalDeliveryFees: number;
    pendingSettlement: number;
    settled: number;
  }> {
    const totals = mockRevenueRecords.reduce(
      (acc, r) => ({
        totalGross: acc.totalGross + r.orderAmount,
        totalCommissions: acc.totalCommissions + r.commissionAmount,
        totalDeliveryFees: acc.totalDeliveryFees + r.deliveryFee,
        pendingSettlement: acc.pendingSettlement + (r.status === "pending" ? r.netToPharmacy : 0),
        settled: acc.settled + (r.status === "settled" ? r.netToPharmacy : 0),
      }),
      { totalGross: 0, totalCommissions: 0, totalDeliveryFees: 0, pendingSettlement: 0, settled: 0 }
    );
    return delay(200, totals);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ARTICLE SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const articleService = {
  async getPublished(): Promise<HealthArticle[]> {
    return delay(200, mockHealthArticles.filter((a) => a.status === "published"));
  },

  async getAll(): Promise<HealthArticle[]> {
    return delay(200, [...mockHealthArticles]);
  },

  async getById(id: string): Promise<HealthArticle | null> {
    return delay(150, mockHealthArticles.find((a) => a.id === id) ?? null);
  },

  async getByAuthor(authorId: string): Promise<HealthArticle[]> {
    return delay(200, mockHealthArticles.filter((a) => a.authorId === authorId));
  },

  async create(article: Omit<HealthArticle, "id" | "viewCount" | "createdAt" | "updatedAt">): Promise<HealthArticle> {
    const newArticle: HealthArticle = {
      ...article,
      id: `art-${Date.now()}`,
      viewCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockHealthArticles.push(newArticle);
    return delay(400, newArticle);
  },

  async publish(id: string): Promise<HealthArticle | null> {
    const index = mockHealthArticles.findIndex((a) => a.id === id);
    if (index === -1) return delay(150, null);
    mockHealthArticles[index] = {
      ...mockHealthArticles[index],
      status: "published",
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return delay(300, mockHealthArticles[index]);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// AVAILABILITY SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const availabilityService = {
  /** Get all availability records (for doctor/patient medicine search) */
  async getAll(): Promise<MedicineAvailabilityRecord[]> {
    return delay(200, [...mockAvailabilityRecords]);
  },

  /** Get availability for a specific medicine */
  async getForMedicine(catalogueProductId: string): Promise<MedicineAvailabilityRecord[]> {
    return delay(200, mockAvailabilityRecords.filter(
      (r) => r.catalogueProductId === catalogueProductId
    ));
  },

  /** Get all medicines available at a specific pharmacy */
  async getForPharmacy(pharmacyId: string): Promise<MedicineAvailabilityRecord[]> {
    return delay(200, mockAvailabilityRecords.filter(
      (r) => r.pharmacyId === pharmacyId
    ));
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION SERVICE
// ─────────────────────────────────────────────────────────────────────────────

// In-memory notifications store for demo
const notificationsStore: AppNotification[] = [
  {
    id: "notif-001",
    recipientId: "u-pat-001",
    recipientRole: "patient",
    category: "prescription",
    title: "New prescription from Dr. Emmanuel",
    message: "Dr. Emmanuel Nkurunziza issued you a digital prescription for Upper Respiratory Tract Infection.",
    isRead: false,
    actionUrl: "/prescriptions",
    relatedEntityId: "rx-002",
    createdAt: "2026-05-18T09:05:00Z",
  },
  {
    id: "notif-002",
    recipientId: "u-pat-001",
    recipientRole: "patient",
    category: "delivery",
    title: "Your order is out for delivery",
    message: "Kalisa Jean is on the way with your order from MedPlus Remera. Estimated arrival: 35 minutes.",
    isRead: false,
    actionUrl: "/orders",
    relatedEntityId: "ord-001",
    createdAt: "2026-05-18T11:35:00Z",
  },
  {
    id: "notif-003",
    recipientId: "u-pat-002",
    recipientRole: "patient",
    category: "prescription",
    title: "New prescription from Dr. Jean-Pierre",
    message: "Dr. Jean-Pierre Rurangwa issued you a digital prescription for Type 2 Diabetes and Hypertension management.",
    isRead: false,
    actionUrl: "/prescriptions",
    relatedEntityId: "rx-001",
    createdAt: "2026-05-20T10:35:00Z",
  },
];

export const notificationService = {
  async getForUser(userId: string, _role: UserRole): Promise<AppNotification[]> {
    return delay(150, notificationsStore.filter((n) => n.recipientId === userId));
  },

  async markRead(notificationId: string): Promise<void> {
    const notif = notificationsStore.find((n) => n.id === notificationId);
    if (notif) notif.isRead = true;
    return delay(100, undefined);
  },

  async markAllRead(userId: string): Promise<void> {
    notificationsStore
      .filter((n) => n.recipientId === userId)
      .forEach((n) => { n.isRead = true; });
    return delay(150, undefined);
  },

  async create(notification: Omit<AppNotification, "id" | "createdAt">): Promise<AppNotification> {
    const newNotif: AppNotification = {
      ...notification,
      id: `notif-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    notificationsStore.push(newNotif);
    return delay(100, newNotif);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT SERVICE
// ─────────────────────────────────────────────────────────────────────────────

const auditStore: AuditLog[] = [];

export const auditService = {
  async getAll(): Promise<AuditLog[]> {
    return delay(200, [...auditStore].reverse());
  },

  async log(entry: Omit<AuditLog, "id" | "timestamp">): Promise<AuditLog> {
    const log: AuditLog = {
      ...entry,
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    auditStore.push(log);
    return delay(50, log);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// AI INSIGHT SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const aiInsightService = {
  async getAll(): Promise<AIInsight[]> {
    return delay(200, [...mockAIInsights]);
  },

  async getUnresolved(): Promise<AIInsight[]> {
    return delay(200, mockAIInsights.filter((i) => !i.isResolved));
  },

  async resolve(insightId: string, resolvedBy: string): Promise<AIInsight | null> {
    const insight = mockAIInsights.find((i) => i.id === insightId);
    if (!insight) return delay(150, null);
    insight.isResolved = true;
    insight.resolvedBy = resolvedBy;
    insight.resolvedAt = new Date().toISOString();
    return delay(300, insight);
  },
};
