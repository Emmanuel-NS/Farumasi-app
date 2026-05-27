import api from "@/lib/api";

export interface BackendAuditLog {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface AuditListResponse {
  items: BackendAuditLog[];
  total: number;
  offset: number;
  limit: number;
}

export const auditService = {
  async list(params: {
    offset?: number;
    limit?: number;
    action?: string;
    entity_type?: string;
    search?: string;
  } = {}): Promise<AuditListResponse> {
    const { data } = await api.get<AuditListResponse>("/audit/", { params });
    return data;
  },
};
