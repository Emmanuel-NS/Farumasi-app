"use client";

import { useConsultPushNotifications } from "@/hooks/use-consult-push-notifications";

/** Mounts consult message browser notifications for authenticated patients. */
export function ConsultNotificationsMount() {
  useConsultPushNotifications();
  return null;
}
