import api from "@/lib/api";

export interface ContentPageAdmin {
  id: string;
  slug: string;
  page_type: string;
  audience: string;
  title: string;
  summary?: string | null;
  body?: string | null;
  status: string;
  version: number;
  contact_meta?: Record<string, unknown> | null;
  published_at?: string | null;
  updated_at?: string | null;
  updated_by_name?: string | null;
}

export interface ContentNotifyPayload {
  user_ids?: string[];
  roles?: string[];
  subject?: string;
  message?: string;
  send_email?: boolean;
  send_in_app?: boolean;
}

export interface ContentNotifyResult {
  notification_id: string;
  recipient_count: number;
  email_sent_count: number;
  in_app_sent_count: number;
  sent_at: string;
}

export const contentPagesService = {
  async list(): Promise<ContentPageAdmin[]> {
    const { data } = await api.get<ContentPageAdmin[]>("/admin/content-pages");
    return data;
  },

  async get(id: string): Promise<ContentPageAdmin> {
    const { data } = await api.get<ContentPageAdmin>(`/admin/content-pages/${id}`);
    return data;
  },

  async update(
    id: string,
    patch: Partial<Pick<ContentPageAdmin, "title" | "summary" | "body" | "status" | "contact_meta">>,
  ): Promise<ContentPageAdmin> {
    const { data } = await api.put<ContentPageAdmin>(`/admin/content-pages/${id}`, patch);
    return data;
  },

  async publish(id: string): Promise<ContentPageAdmin> {
    const { data } = await api.post<ContentPageAdmin>(`/admin/content-pages/${id}/publish`);
    return data;
  },

  async notify(id: string, payload: ContentNotifyPayload): Promise<ContentNotifyResult> {
    const { data } = await api.post<ContentNotifyResult>(`/admin/content-pages/${id}/notify`, payload);
    return data;
  },
};
