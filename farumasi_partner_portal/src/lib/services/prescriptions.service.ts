import api from "@/lib/api";

export interface BackendPrescriptionItem {
  id: string;
  product_id?: string | null;
  medicine_name?: string | null;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  quantity?: number | null;
  instructions?: string | null;
  substitution_allowed?: boolean | null;
}

export interface BackendPrescription {
  id: string;
  patient_id: string;
  doctor_id?: string | null;
  hospital_id?: string | null;
  prescription_type: string;
  status: string;
  notes?: string | null;
  diagnosis_notes?: string | null;
  uploaded_file_url?: string | null;
  qr_code?: string | null;
  items: BackendPrescriptionItem[];
  patient?: { id: string; full_name?: string } | null;
  created_at: string;
}

export const prescriptionsService = {
  async get(id: string): Promise<BackendPrescription> {
    const { data } = await api.get<BackendPrescription>(`/prescriptions/${id}`);
    return data;
  },
};
