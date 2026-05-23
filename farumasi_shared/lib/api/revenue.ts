import { getClient } from "./client";
import type { RevenueRecordOut, RevenueSummary } from "./types";

export const revenueApi = {
  /** Finance admin: list all revenue records. */
  listAll: () => getClient().get<RevenueRecordOut[]>("/revenue/"),
  summary: () => getClient().get<RevenueSummary>("/revenue/summary"),
  byPharmacy: (pharmacyId: string) =>
    getClient().get<RevenueRecordOut[]>(`/revenue/pharmacies/${pharmacyId}`),
  byPartner: (partnerId: string) =>
    getClient().get<RevenueRecordOut[]>(`/revenue/partners/${partnerId}`),
};
