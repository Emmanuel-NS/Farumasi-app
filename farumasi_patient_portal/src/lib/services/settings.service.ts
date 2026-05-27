import api from "@/lib/api";

export interface NotificationChannels {
  push: boolean;
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}

export interface NotificationEvents {
  orders: boolean;
  health_tips: boolean;
  promotions: boolean;
  app_updates: boolean;
  reminders: boolean;
}

export interface NotificationPreferences {
  channels: NotificationChannels;
  events: NotificationEvents;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  channels: { push: true, email: true, sms: false, whatsapp: false },
  events: { orders: true, health_tips: true, promotions: false, app_updates: true, reminders: true },
};

export const settingsService = {
  async getNotificationPreferences(): Promise<NotificationPreferences> {
    const { data } = await api.get<NotificationPreferences>("/users/me/notification-preferences");
    return data;
  },

  async updateNotificationPreferences(
    prefs: NotificationPreferences,
  ): Promise<NotificationPreferences> {
    const { data } = await api.put<NotificationPreferences>(
      "/users/me/notification-preferences",
      prefs,
    );
    return data;
  },
};
