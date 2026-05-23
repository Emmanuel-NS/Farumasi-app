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
  instructions: string | null;
  substitution_allowed: boolean;
  created_at: string;
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
  };
}

export function adaptPrescription(p: BackendPrescription): DigitalPrescription {
  const status = (STATUS_MAP[p.status] ?? "active") as DigitalPrescriptionStatus;
  return {
    id: p.id,
    patientId: p.patient_id,
    doctorName: p.doctor_id ? `Doctor #${p.doctor_id.slice(0, 6)}` : "FARUMASI Doctor",
    hospitalName: "FARUMASI Healthcare",
    diagnosis: p.diagnosis_notes ?? undefined,
    issuedAt: p.created_at,
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    status,
    qrCode: p.qr_code ?? undefined,
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
};

