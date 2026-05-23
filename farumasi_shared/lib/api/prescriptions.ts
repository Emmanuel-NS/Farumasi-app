import { getClient } from "./client";
import type { PaginatedResponse, PrescriptionOut } from "./types";

export const prescriptionsApi = {
  list: (params?: { page?: number; page_size?: number; status?: string }) =>
    getClient().get<PaginatedResponse<PrescriptionOut>>("/prescriptions/", { params }),
  getById: (id: string) => getClient().get<PrescriptionOut>(`/prescriptions/${id}`),
  create: (payload: unknown) => getClient().post<PrescriptionOut>("/prescriptions/", payload),
  update: (id: string, payload: unknown) =>
    getClient().patch<PrescriptionOut>(`/prescriptions/${id}`, payload),
};
