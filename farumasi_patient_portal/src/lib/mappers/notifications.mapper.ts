import type { AppNotification, NotificationCategory } from "@/types";

export interface BackendNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  category: string | null;
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

export interface BackendUnreadCount {
  unread: number;
}

const CATEGORY_MAP: Record<string, NotificationCategory> = {
  order:          "order",
  prescription:   "health_tip",
  delivery:       "order_shipped",
  promo:          "promo",
  reminder:       "reminder",
  general:        "general",
  system:         "general",
};

export function adaptNotification(n: BackendNotification): AppNotification {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    category: (CATEGORY_MAP[n.category ?? "general"] ?? "general"),
    isRead: n.read_status,
    time: n.created_at,
  };
}
