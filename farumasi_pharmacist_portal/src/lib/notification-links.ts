import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export interface NotificationLinkSource {
  id: string;
  read_status?: boolean;
  action_url?: string | null;
}

export function notificationHref(actionUrl?: string | null): string | null {
  const raw = actionUrl?.trim();
  if (!raw) return null;
  return raw.startsWith("/") ? raw : `/${raw}`;
}

export async function openNotification(
  notif: NotificationLinkSource,
  router: AppRouterInstance,
  markRead: (id: string) => Promise<unknown>,
): Promise<void> {
  if (!notif.read_status) {
    try {
      await markRead(notif.id);
    } catch {
      /* ignore */
    }
  }
  const href = notificationHref(notif.action_url);
  if (href) router.push(href);
}
