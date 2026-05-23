import { getClient } from "./client";
import type {
  AddressOut,
  OrderOut,
  PaginatedResponse,
  PatientProfileOut,
  PrescriptionOut,
  RecommendationResponse,
} from "./types";

export interface RecommendationRequest {
  prescription_id: string;
  latitude: number;
  longitude: number;
  insurance_provider_id?: string;
  max_results?: number;
}

export const patientsApi = {
  me: () => getClient().get<PatientProfileOut>("/patients/me"),
  updateMe: (payload: Partial<PatientProfileOut>) =>
    getClient().put<PatientProfileOut>("/patients/me", payload),

  // Addresses
  listAddresses: () => getClient().get<AddressOut[]>("/patients/me/addresses"),
  addAddress: (payload: Omit<AddressOut, "id">) =>
    getClient().post<AddressOut>("/patients/me/addresses", payload),

  // Prescriptions
  listPrescriptions: () => getClient().get<PrescriptionOut[]>("/patients/me/prescriptions"),
  uploadPrescription: (file: File, notes?: string) =>
    getClient().upload<PrescriptionOut>(
      "/patients/me/prescriptions",
      file,
      "file",
      notes ? { notes } : undefined,
    ),

  // Orders
  listOrders: (params?: { page?: number; page_size?: number }) =>
    getClient().get<PaginatedResponse<OrderOut>>("/patients/me/orders", { params }),
  createOrder: (payload: unknown) => getClient().post<OrderOut>("/patients/me/orders", payload),

  // Recommendations
  recommend: (payload: RecommendationRequest) =>
    getClient().post<RecommendationResponse>("/patients/me/recommendations", payload),
};
