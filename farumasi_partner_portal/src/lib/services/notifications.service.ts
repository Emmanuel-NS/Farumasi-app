import api from "@/lib/api";

export interface BackendNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  category?: string | null;
  read_status: boolean;
  action_url?: string | null;
  created_at: string;
}

export interface PaginatedNotifications {
  items: BackendNotification[];
  total: number;
  offset: number;
  limit: number;
}

export const notificationsService = {
  async list(params?: { offset?: number; limit?: number; unread_only?: boolean }): Promise<PaginatedNotifications> {
    const { data } = await api.get<PaginatedNotifications>("/notifications/", { params });
    return data;
  },

  async unreadCount(): Promise<number> {
    const { data } = await api.get<{ unread: number }>("/notifications/unread-count");
    return data.unread;
  },

  async markRead(id: string): Promise<BackendNotification> {
    const { data } = await api.patch<BackendNotification>(`/notifications/${id}/read`, { read_status: true });
    return data;
  },

  async markAllRead(): Promise<void> {
    await api.post("/notifications/mark-all-read");
  },
};
