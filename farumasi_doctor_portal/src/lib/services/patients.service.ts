import { prescriptionsService, BackendPrescription } from "@/lib/services/prescriptions.service";
import api from "@/lib/api";

export interface DerivedPatient {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  prescriptionCount: number;
  lastPrescriptionAt: string;
  status: "Active";
  dateOfBirth?: string;
  gender?: string;
  nationalId?: string;
}

export const patientsService = {
  /** Derive unique patients from the prescriptions list. */
  async getPatients(): Promise<DerivedPatient[]> {
    const { data } = await api.get<{ items: BackendPrescription[]; total: number }>(
      "/prescriptions/",
      { params: { limit: 100 } }
    );
    const items = data.items ?? [];

    const map = new Map<string, DerivedPatient>();
    for (const rx of items) {
      const pid = rx.patient_id;
      if (!map.has(pid)) {
        const user = rx.patient?.user;
        map.set(pid, {
          id: pid,
          fullName: user?.full_name ?? `Patient #${pid.slice(-6)}`,
          email: user?.email ?? "",
          phone: user?.phone ?? "—",
          prescriptionCount: 1,
          lastPrescriptionAt: rx.created_at,
          status: "Active",
        });
      } else {
        const existing = map.get(pid)!;
        existing.prescriptionCount += 1;
        if (rx.created_at > existing.lastPrescriptionAt) {
          existing.lastPrescriptionAt = rx.created_at;
        }
      }
    }
    return Array.from(map.values());
  },
};
