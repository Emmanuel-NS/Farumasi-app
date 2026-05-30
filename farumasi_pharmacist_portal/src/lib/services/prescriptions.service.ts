import api from "@/lib/api";

export interface PrescriptionItem {
  id: string;
  medication_name: string;
  dosage?: string;
  frequency?: string;
  duration_days?: number;
  quantity?: number;
  unit_price?: number;
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
