/** FARUMASI icon for browser Notification API (must be same-origin). */
export const FARUMASI_NOTIFICATION_ICON = "/logo.png";

export function browserNotificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function showFarumasiBrowserNotification(
  title: string,
  body: string,
  options?: { tag?: string; onClick?: () => void },
): void {
  if (!browserNotificationsSupported() || Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, {
      body,
      icon: FARUMASI_NOTIFICATION_ICON,
      badge: FARUMASI_NOTIFICATION_ICON,
      tag: options?.tag ?? "farumasi",
    });
    n.onclick = () => {
      window.focus();
      options?.onClick?.();
      n.close();
    };
  } catch {
    /* ignore — e.g. insecure context */
  }
}
