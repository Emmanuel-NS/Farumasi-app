import api from "@/lib/api";

export interface AuditLog {
  id: string;
  actor_user_id?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  old_value?: unknown;
  new_value?: unknown;
  ip_address?: string | null;
  created_at: string;
}

export interface AuditListParams {
  offset?: number;
  limit?: number;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  actor_user_id?: string;
  search?: string;
  sort_by?: "created_at" | "action";
  sort_dir?: "asc" | "desc";
}

export const auditService = {
  async list(params?: AuditListParams): Promise<{ items: AuditLog[]; total: number }> {
    const { data } = await api.get<{ items: AuditLog[]; total: number; offset: number; limit: number }>(
      "/admin/audit-logs",
      { params },
    );
    return { items: data.items, total: data.total };
  },

  async getById(logId: string): Promise<AuditLog> {
    const { data } = await api.get<AuditLog>(`/admin/audit-logs/${logId}`);
    return data;
  },

  async getEntityTypes(): Promise<string[]> {
    const { data } = await api.get<string[]>("/admin/audit-logs/meta/entity-types");
    return data;
  },
};
