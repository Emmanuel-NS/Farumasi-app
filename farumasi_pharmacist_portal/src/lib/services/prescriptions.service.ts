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

export const prescriptionsService = {
  async getAll(params?: {
    offset?: number;
    limit?: number;
    status?: string;
  }): Promise<PaginatedPrescriptions> {
    const { data } = await api.get<PaginatedPrescriptions>("/prescriptions/", { params });
    return data;
  },

  async updateStatus(id: string, status: string): Promise<BackendPrescription> {
    const { data } = await api.patch<BackendPrescription>(`/prescriptions/${id}/status`, { status });
    return data;
  },
};
