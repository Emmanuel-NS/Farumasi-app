import { getClient } from "./client";
import type {
  NotificationOut,
  NotificationUnreadCount,
  PaginatedResponse,
} from "./types";

export const notificationsApi = {
  list: (params?: { page?: number; page_size?: number; status?: string }) =>
    getClient().get<PaginatedResponse<NotificationOut>>("/notifications/", { params }),

  unreadCount: () => getClient().get<NotificationUnreadCount>("/notifications/unread-count"),

  markRead: (id: string) => getClient().patch<NotificationOut>(`/notifications/${id}/read`),

  markAllRead: () => getClient().patch<void>("/notifications/read-all"),

  /** Super-admin: broadcast a notification. */
  broadcast: (payload: {
    target_role?: string;
    target_user_ids?: string[];
    title: string;
    body: string;
    category?: string;
    data?: Record<string, unknown>;
  }) => getClient().post<{ delivered: number }>("/notifications/admin/broadcast", payload),
};
