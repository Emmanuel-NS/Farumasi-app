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

export interface PatientProfile {
  id: string;
  user_id: string;
  has_pin?: boolean;
}

export const patientsService = {
  async getMyProfile(): Promise<PatientProfile> {
    const { data } = await api.get<PatientProfile>("/patients/me");
    return data;
  },

  async listAddresses(): Promise<PatientAddress[]> {
    const { data } = await api.get<PatientAddress[]>("/patients/me/addresses");
    return data;
  },

  async addAddress(payload: {
    label: string;
    line1: string;
    line2?: string;
    district?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    is_default?: boolean;
  }): Promise<PatientAddress> {
    const { data } = await api.post<PatientAddress>("/patients/me/addresses", payload);
    return data;
  },

  async updateAddress(
    id: string,
    payload: Partial<{
      label: string;
      line1: string;
      line2: string;
      district: string;
      city: string;
      latitude: number;
      longitude: number;
      is_default: boolean;
    }>,
  ): Promise<PatientAddress> {
    const { data } = await api.patch<PatientAddress>(`/patients/me/addresses/${id}`, payload);
    return data;
  },

  async deleteAddress(id: string): Promise<void> {
    await api.delete(`/patients/me/addresses/${id}`);
  },
};
