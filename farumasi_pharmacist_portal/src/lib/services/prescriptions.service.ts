import api from "@/lib/api";

export interface PrescriptionItem {
  id: string;
  /** Backend field name from the API */
  medicine_name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  duration_days?: number;
  quantity?: number;
  unit_price?: number;
  instructions?: string;
  product_id?: string | null;
}

export interface BackendPrescription {
  id: string;
  prescription_type: string;
  status: string;
  notes?: string;
  uploaded_file_url?: string;
  created_at: string;
  updated_at: string;
  items: PrescriptionItem[];
  patient?: {
    id: string;
    user?: { id: string; full_name: string; email: string; phone?: string; profile_image_url?: string };
  };
  doctor?: {
    id: string;
    user?: { id: string; full_name: string; email: string };
  };
}

export interface PaginatedPrescriptions {
  items: BackendPrescription[];
  total: number;
  offset: number;
  limit: number;
}

export type PrescriptionReviewStatus =
  | "pending"
  | "approved"
  | "clarification_needed"
  | "rejected";

export interface PrescriptionReviewPayload {
  prescription_id: string;
  review_status: PrescriptionReviewStatus;
  review_notes?: string;
  safety_flags?: string[];
}

export interface PrescriptionReview {
  id: string;
  prescription_id: string;
  pharmacist_id: string;
  review_status: string;
  review_notes?: string;
  safety_flags?: string[];
  created_at: string;
}

export type SellMode = "pack" | "partial";

export interface CartItem {
  medicine_name: string;
  product_id?: string | null;
  dosage?: string;
  frequency?: string;
  duration?: string;
  quantity: number;
  /** Instructions for the patient, may include encoded sell_mode */
  instructions?: string;
  /** NOT a backend field — stored locally while building the cart */
  sell_mode?: SellMode;
}

export const prescriptionsService = {
  async getAll(params?: {
    offset?: number;
    limit?: number;
    status?: string;
  }): Promise<PaginatedPrescriptions> {
    const { data } = await api.get<PaginatedPrescriptions>("/prescriptions/", { params });
    return data;
  },

  async getOne(id: string): Promise<BackendPrescription> {
    const { data } = await api.get<BackendPrescription>(`/prescriptions/${id}`);
    return data;
  },

  /** Add a single item (medicine) to the prescription cart. */
  async addItem(prescriptionId: string, item: CartItem): Promise<PrescriptionItem> {
    const { data } = await api.post<PrescriptionItem>(
      `/prescriptions/${prescriptionId}/items`,
      item,
    );
    return data;
  },

  /** Update an existing prescription item. */
  async updateItem(
    prescriptionId: string,
    itemId: string,
    updates: Partial<CartItem>,
  ): Promise<PrescriptionItem> {
    const { data } = await api.patch<PrescriptionItem>(
      `/prescriptions/${prescriptionId}/items/${itemId}`,
      updates,
    );
    return data;
  },

  /** Remove a prescription item. */
  async deleteItem(prescriptionId: string, itemId: string): Promise<void> {
    await api.delete(`/prescriptions/${prescriptionId}/items/${itemId}`);
  },

  /**
   * Save pharmacist notes on the prescription and set its status.
   * Use status="reviewed" to mark the cart as ready for the patient.
   * Use status="under_review" to mark it as still being worked on.
   */
  async updatePrescription(
    id: string,
    payload: { notes?: string; status?: string },
  ): Promise<BackendPrescription> {
    const { data } = await api.patch<BackendPrescription>(`/prescriptions/${id}`, payload);
    return data;
  },

  /**
   * Submit a prescription review. Backend reflects the outcome on the
   * prescription row:
   *  - approved             -> prescription.status = "reviewed"
   *  - clarification_needed -> prescription.status = "under_review"
   *  - rejected             -> prescription.status = "cancelled"
   *  - pending              -> no change
   */
  async submitReview(payload: PrescriptionReviewPayload): Promise<PrescriptionReview> {
    const { data } = await api.post<PrescriptionReview>(
      "/pharmacists/prescription-reviews",
      payload,
    );
    return data;
  },
};
