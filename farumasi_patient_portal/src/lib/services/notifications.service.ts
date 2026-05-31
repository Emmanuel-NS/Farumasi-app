import api from "@/lib/api";
import { isMockMode } from "@/lib/env";
import type { AppNotification } from "@/types";
import {
  adaptNotification,
  type BackendNotification,
  type BackendUnreadCount,
  type PaginatedNotifications,
} from "@/lib/mappers/notifications.mapper";

export { adaptNotification };
export type { BackendNotification, PaginatedNotifications, BackendUnreadCount };

const MOCK_NOTIFICATIONS: AppNotification[] = [
  { id: "n1", title: "Order dispatched", message: "Your order ORD-002 is on the way! Rider is 10 min away.", isRead: false, time: new Date(Date.now() - 3600000).toISOString(), category: "order" },
  { id: "n2", title: "Order delivered", message: "Order ORD-001 was delivered successfully.", isRead: true, time: new Date(Date.now() - 86400000 * 2).toISOString(), category: "order" },
  { id: "n3", title: "Prescription reviewed", message: "Your prescription has been reviewed and approved.", isRead: false, time: new Date(Date.now() - 7200000).toISOString(), category: "health_tip" },
  { id: "n4", title: "Welcome to FARUMASI", message: "Your account is ready. Order medicines and consult doctors anytime.", isRead: true, time: new Date(Date.now() - 86400000 * 7).toISOString(), category: "general" },
];

export const notificationsService = {
  async getMyNotifications(unreadOnly = false): Promise<AppNotification[]> {
    if (isMockMode()) return unreadOnly ? MOCK_NOTIFICATIONS.filter((n) => !n.isRead) : [...MOCK_NOTIFICATIONS];
    const { data } = await api.get<PaginatedNotifications>("/notifications/", {
      params: { unread_only: unreadOnly, limit: 50 },
    });
    return data.items.map(adaptNotification);
  },

  async getUnreadCount(): Promise<number> {
    if (isMockMode()) return MOCK_NOTIFICATIONS.filter((n) => !n.isRead).length;
    const { data } = await api.get<BackendUnreadCount>("/notifications/unread-count");
    return data.unread;
  },

  async markRead(id: string): Promise<void> {
    if (isMockMode()) return;
    await api.patch(`/notifications/${id}/read`);
  },

  async markAllRead(): Promise<void> {
    if (isMockMode()) return;
    // Phase 11.3: use PATCH /notifications/read-all per backend spec.
    await api.patch("/notifications/read-all");
  },
};
