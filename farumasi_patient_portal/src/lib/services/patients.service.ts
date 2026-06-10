import { api } from "@/lib/api";

export interface PatientAddress {
  id: string;
  patient_id: string;
  label: string;
  line1: string;
  line2?: string | null;
  district?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_default: boolean;
  created_at: string;
}

export const patientsService = {
  async listAddresses(): Promise<PatientAddress[]> {
    const { data } = await api.get<PatientAddress[]>("/patients/me/addresses");
    return data;
  },
};
