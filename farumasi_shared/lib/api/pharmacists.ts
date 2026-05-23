import { getClient } from "./client";
import type {
  PaginatedResponse,
  PharmacistProfileOut,
} from "./types";

export const pharmacistsApi = {
  list: (params?: { page?: number; page_size?: number }) =>
    getClient().get<PaginatedResponse<PharmacistProfileOut>>("/pharmacists/", { params }),

  me: () => getClient().get<PharmacistProfileOut>("/pharmacists/me"),

  updateMe: (payload: Partial<PharmacistProfileOut>) =>
    getClient().put<PharmacistProfileOut>("/pharmacists/me", payload),
};
