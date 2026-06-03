import api from "@/lib/api";
import type { DigitalPrescription, DigitalPrescriptionItem, DigitalPrescriptionStatus } from "@/types";

export interface BackendPrescriptionItem {
  id: string;
  prescription_id: string;
  product_id: string | null;
  medicine_name: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  quantity: number;
  /** May contain "[sm:partial]" prefix to indicate partial sell_mode */
  instructions: string | null;
  substitution_allowed: boolean;
  created_at: string;
}

export interface PharmacyRecommendation {
  id: string;
  prescription_id: string;
  pharmacy_id?: string | null;
  partner_company_id?: string | null;
  pharmacy?: { id: string; name: string; address?: string; district?: string } | null;
  partner?: { id: string; name: string; address?: string; district?: string } | null;
  rank_score?: number | null;
  estimated_fulfillment_time?: number | null;
  estimated_total_price?: number | null;
  estimated_distance_km?: number | null;
  available_items_count?: number | null;
  total_items_count?: number | null;
  can_fulfill_complete_prescription?: boolean | null;
}

export interface BackendPrescription {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  hospital_id: string | null;
  prescription_type: string;
  status: string;
  notes: string | null;
  diagnosis_notes: string | null;
  uploaded_file_url: string | null;
  qr_code: string | null;
  items: BackendPrescriptionItem[];
  created_at: string;
}

const STATUS_MAP: Record<string, DigitalPrescriptionStatus> = {
  draft:         "draft",
  active:        "active",
  pending:       "active",
  reviewed:      "sent_to_patient",
  fulfilled:     "fulfilled",
  cancelled:     "cancelled",
  expired:       "expired",
};

function adaptItem(item: BackendPrescriptionItem): DigitalPrescriptionItem {
  return {
    id: item.id,
    medicineName: item.medicine_name,
    strength: item.dosage ?? "",
    dose: item.dosage ?? "",
    frequency: item.frequency ?? "",
    duration: item.duration ?? "",
    quantity: item.quantity,
    productId: item.product_id ?? undefined,
    instructions: item.instructions ?? undefined,
  };
}

export function adaptPrescription(p: BackendPrescription): DigitalPrescription {
  const status = (STATUS_MAP[p.status] ?? "active") as DigitalPrescriptionStatus;
  const isUploaded = p.prescription_type === "uploaded" || !!p.uploaded_file_url;
  return {
    id: p.id,
    patientId: p.patient_id,
    prescriptionType: isUploaded ? "uploaded" : "digital",
    doctorName: p.doctor_id ? `Doctor #${p.doctor_id.slice(0, 6)}` : "Uploaded by patient",
    hospitalName: isUploaded ? undefined : "FARUMASI Healthcare",
    diagnosis: p.diagnosis_notes ?? undefined,
    notes: p.notes ?? undefined,
    issuedAt: p.created_at,
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    status,
    qrCode: p.qr_code ?? undefined,
    uploadedFileUrl: p.uploaded_file_url ?? undefined,
    items: (p.items ?? []).map(adaptItem),
  };
}

export const prescriptionsService = {
  async getMyPrescriptions(): Promise<DigitalPrescription[]> {
    // Backend: GET /api/v1/patients/me/prescriptions
    const { data } = await api.get<BackendPrescription[]>("/patients/me/prescriptions");
    return Array.isArray(data) ? data.map(adaptPrescription) : [];
  },

  async getPrescriptionById(id: string): Promise<DigitalPrescription> {
    const { data } = await api.get<BackendPrescription>(`/prescriptions/${id}`);
    return adaptPrescription(data);
  },

  async uploadPrescriptionFile(file: File): Promise<{ url: string; file_key: string }> {
    // Backend: POST /api/v1/uploads/prescription (multipart)
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post<{ url: string; file_key: string }>(
      "/uploads/prescription",
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data;
  },

  async createFromUpload(fileUrl: string, notes?: string): Promise<BackendPrescription> {
    // Backend: POST /api/v1/patients/me/prescriptions/upload
    const { data } = await api.post<BackendPrescription>("/patients/me/prescriptions/upload", {
      uploaded_file_url: fileUrl,
      notes,
    });
    return data;
  },

  /**
   * Patient self-cancellation (only allowed while prescription is still pending/active).
   * Backend: PATCH /api/v1/prescriptions/{id} with { status: "cancelled" }.
   */
  async cancelPrescription(id: string): Promise<BackendPrescription> {
    const { data } = await api.patch<BackendPrescription>(`/prescriptions/${id}`, {
      status: "cancelled",
    });
    return data;
  },

  /** Load raw prescriptions preserving all backend fields (product_ids, instructions). */
  async getMyPrescriptionsRaw(): Promise<BackendPrescription[]> {
    const { data } = await api.get<BackendPrescription[]>("/patients/me/prescriptions");
    return Array.isArray(data) ? data : [];
  },

  /** Fetch pharmacy recommendations for a reviewed prescription. */
  async getRecommendations(prescriptionId: string): Promise<PharmacyRecommendation[]> {
    try {
      const { data } = await api.get<{ top_recommendations?: PharmacyRecommendation[] }>(
        `/patients/me/prescriptions/${prescriptionId}/recommendations`
      );
      // Backend returns { top_recommendations: [...], total_candidates_evaluated: N, ... }
      if (Array.isArray(data)) return data;
      return Array.isArray(data?.top_recommendations) ? data.top_recommendations : [];
    } catch { return []; }
  },

  /**
   * Place order via the recommendation flow (prescription_id + recommendation_id).
   * The backend resolves prescription items (must have product_id) to the pharmacy's listings.
   */
  async confirmOrderViaRecommendation(params: {
    prescriptionId: string;
    recommendationId: string;
    deliveryMethod: "delivery" | "pickup";
    deliveryAddress?: string;
    notes?: string;
  }): Promise<{ id: string }> {
    const { data } = await api.post<{ id: string }>("/orders/", {
      prescription_id:            params.prescriptionId,
      selected_recommendation_id: params.recommendationId,
      delivery_method:            params.deliveryMethod,
      delivery_address:           params.deliveryAddress,
      notes:                      params.notes,
    });
    return data;
  },

  /**
   * Fallback: place order with explicit items when prescription items lack product_ids.
   * Extracts sell_mode from the [sm:partial] encoding in instructions.
   */
  async confirmOrderManual(params: {
    prescriptionId: string;
    pharmacyId?: string;
    items: Array<{ medicine_name: string; quantity: number; instructions?: string }>;
    deliveryMethod: "delivery" | "pickup";
    deliveryAddress?: string;
    notes?: string;
  }): Promise<{ id: string }> {
    const { data } = await api.post<{ id: string }>("/orders/", {
      prescription_id:  params.prescriptionId,
      pharmacy_id:      params.pharmacyId,
      delivery_method:  params.deliveryMethod,
      delivery_address: params.deliveryAddress,
      notes:            params.notes,
      items: params.items.map((it) => {
        const sellMode = it.instructions?.startsWith("[sm:partial]") ? "partial" : "pack";
        return { product_name: it.medicine_name, quantity: it.quantity, unit_price: 0, sell_mode: sellMode };
      }),
    });
    return data;
  },
};

