import api from "@/lib/api";
import type { Prescription, PrescriptionStatus } from "@/types";

export interface BackendPrescriptionItem {
  id: string;
  medication_name: string;
  dosage?: string;
  frequency?: string;
  duration_days?: number;
  quantity?: number;
  unit_price?: number;
  instructions?: string;
  substitution_allowed?: boolean;
}

export interface BackendPrescription {
  id: string;
  patient_id: string;
  doctor_id?: string;
  prescription_type: string;
  status: string;
  notes?: string;
  diagnosis_notes?: string;
  uploaded_file_url?: string;
  qr_code?: string;
  items: BackendPrescriptionItem[];
  created_at: string;
  updated_at: string;
  patient?: {
    id: string;
    user?: { id: string; full_name: string; email: string; phone?: string };
  };
}

export interface PaginatedPrescriptions {
  items: BackendPrescription[];
  total: number;
  offset: number;
  limit: number;
}

const STATUS_MAP: Record<string, PrescriptionStatus> = {
  draft:               "Draft",
  active:              "Pending",
  under_review:        "Pending",
  reviewed:            "Sent",
  fulfilled:           "Fulfilled",
  partially_fulfilled: "PartiallyFulfilled",
  cancelled:           "Cancelled",
  expired:             "Expired",
};

export function adaptPrescription(p: BackendPrescription): Prescription {
  const status = STATUS_MAP[p.status] ?? "Pending";
  return {
    id: p.id,
    prescriptionNumber: `RX-${p.id.slice(-8).toUpperCase()}`,
    doctorId: p.doctor_id ?? "",
    doctorName: "Dr. (You)",
    patientId: p.patient_id,
    patientName: p.patient?.user?.full_name ?? `Patient #${p.patient_id.slice(-6)}`,
    facilityName: "FARUMASI Healthcare",
    diagnosis: p.diagnosis_notes ?? "—",
    chiefComplaint: p.notes ?? "—",
    icdCode: undefined,
    items: p.items.map((i, idx) => ({
      id: i.id ?? String(idx),
      medicineId: i.id ?? String(idx),
      medicineName: i.medication_name,
      genericName: i.medication_name,
      dosageForm: "Tablet" as const,
      strength: i.dosage ?? "",
      dose: i.dosage ?? "",
      frequency: i.frequency ?? "",
      duration: i.duration_days ? `${i.duration_days} days` : "",
      quantity: i.quantity ?? 1,
      instructions: i.instructions ?? "",
      substitutionAllowed: i.substitution_allowed ?? false,
      insuranceCovered: false,
      estimatedCostRWF: (i.unit_price ?? 0) * (i.quantity ?? 1),
      aiWarnings: [],
    })),
    status,
    qrCode: p.qr_code ?? undefined,
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
    notes: p.notes ?? undefined,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

export const prescriptionsService = {
  async getAll(params?: { offset?: number; limit?: number; status?: string }): Promise<Prescription[]> {
    const { data } = await api.get<PaginatedPrescriptions>("/prescriptions/", { params: { limit: 50, ...params } });
    return (data.items ?? []).map(adaptPrescription);
  },

  async getMyPrescriptions(): Promise<Prescription[]> {
    // Doctor sees all prescriptions they are associated with
    return this.getAll({ limit: 100 });
  },

  async getById(id: string): Promise<Prescription | null> {
    try {
      const { data } = await api.get<BackendPrescription>(`/prescriptions/${id}`);
      return adaptPrescription(data);
    } catch {
      return null;
    }
  },
};
