import api from "@/lib/api";
import type { AppNotification } from "@/types";

export interface BackendNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  category: string;
  read_status: boolean;
  action_url: string | null;
  created_at: string;
}

export interface PaginatedNotifications {
  items: BackendNotification[];
  total: number;
  offset: number;
  limit: number;
}

const CATEGORY_MAP: Record<string, AppNotification["category"]> = {
  order:          "order",
  prescription:   "health_tip",
  delivery:       "order_shipped",
  promo:          "promo",
  reminder:       "reminder",
  general:        "general",
};

export function adaptNotification(n: BackendNotification): AppNotification {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    category: (CATEGORY_MAP[n.category] ?? "general") as AppNotification["category"],
    isRead: n.read_status,
    time: n.created_at,
  };
}

export const notificationsService = {
  async getMyNotifications(unreadOnly = false): Promise<AppNotification[]> {
    const { data } = await api.get<PaginatedNotifications>("/notifications", {
      params: { unread_only: unreadOnly, limit: 50 },
    });
    return data.items.map(adaptNotification);
  },

  async markRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`);
  },

  async markAllRead(): Promise<void> {
    await api.post("/notifications/mark-all-read");
  },
};
