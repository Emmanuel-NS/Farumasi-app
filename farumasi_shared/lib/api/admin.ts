import { getClient } from "./client";
import type {
  AdminSummaryOut,
  AuditLogOut,
  PaginatedResponse,
  UserOut,
} from "./types";

export const adminApi = {
  // Users
  listUsers: (params?: { page?: number; page_size?: number; role?: string; status?: string }) =>
    getClient().get<PaginatedResponse<UserOut>>("/users/", { params }),
  setUserStatus: (userId: string, status: string) =>
    getClient().patch<UserOut>(`/users/${userId}/status`, { status }),

  // Analytics
  analyticsSummary: () => getClient().get<AdminSummaryOut>("/analytics/admin"),
  pharmacyAnalytics: (pharmacyId: string) =>
    getClient().get<unknown>(`/analytics/pharmacy/${pharmacyId}`),
  profilesOverview: () => getClient().get<unknown>("/admin/profiles/overview"),

  // Audit logs
  listAuditLogs: (params?: {
    page?: number;
    page_size?: number;
    actor_user_id?: string;
    entity_type?: string;
    action?: string;
  }) => getClient().get<PaginatedResponse<AuditLogOut>>("/admin/audit-logs/", { params }),
  getAuditLogById: (id: string) => getClient().get<AuditLogOut>(`/admin/audit-logs/${id}`),
  listAuditLogsByEntity: (entityType: string, entityId: string) =>
    getClient().get<AuditLogOut[]>(`/admin/audit-logs/entity/${entityType}/${entityId}`),
};
