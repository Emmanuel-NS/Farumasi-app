import { getClient } from "./client";
import type { DoctorProfileOut, PaginatedResponse, PrescriptionOut } from "./types";

export interface CreatePrescriptionPayload {
  patient_id: string;
  diagnosis_notes?: string;
  notes?: string;
  items: Array<{
    medicine_name: string;
    product_id?: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    quantity?: number;
    instructions?: string;
  }>;
}

export const doctorsApi = {
  me: () => getClient().get<DoctorProfileOut>("/doctors/me"),
  updateMe: (payload: Partial<DoctorProfileOut>) =>
    getClient().put<DoctorProfileOut>("/doctors/me", payload),
  getById: (id: string) => getClient().get<DoctorProfileOut>(`/doctors/${id}`),

  listMyPrescriptions: (params?: { page?: number; page_size?: number }) =>
    getClient().get<PaginatedResponse<PrescriptionOut>>("/doctors/me/prescriptions", { params }),

  createPrescription: (payload: CreatePrescriptionPayload) =>
    getClient().post<PrescriptionOut>("/doctors/me/prescriptions", payload),
};
