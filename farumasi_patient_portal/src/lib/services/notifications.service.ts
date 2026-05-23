import api from "@/lib/api";
import type { AppNotification } from "@/types";
import {
  adaptNotification,
  type BackendNotification,
  type BackendUnreadCount,
  type PaginatedNotifications,
} from "@/lib/mappers/notifications.mapper";

export { adaptNotification };
export type { BackendNotification, PaginatedNotifications, BackendUnreadCount };

export const notificationsService = {
  async getMyNotifications(unreadOnly = false): Promise<AppNotification[]> {
    const { data } = await api.get<PaginatedNotifications>("/notifications/", {
      params: { unread_only: unreadOnly, limit: 50 },
    });
    return data.items.map(adaptNotification);
  },

  async getUnreadCount(): Promise<number> {
    const { data } = await api.get<BackendUnreadCount>("/notifications/unread-count");
    return data.unread;
  },

  async markRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`);
  },

  async markAllRead(): Promise<void> {
    // Phase 11.3: use PATCH /notifications/read-all per backend spec.
    await api.patch("/notifications/read-all");
  },
};
