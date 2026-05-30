/**
 * Shared layout data store — single source of truth for live counts/balances
 * that both the topbar and sidebar display. A single poller runs from the
 * layout; sidebar and topbar are pure consumers with no fetch logic of their own.
 */
import { create } from "zustand";
import { notificationsService, type BackendNotification } from "@/lib/services/notifications.service";
import { revenueService } from "@/lib/services/revenue.service";
import { productRequestsService } from "@/lib/services/product-requests.service";

interface LayoutDataState {
  unreadCount: number;
  recentNotifications: BackendNotification[];
  availableBalance: number;
  pendingBalance: number;
  pendingRequests: number;
  lastFetchedAt: number;
  // Actions
  fetch: () => Promise<void>;
  startPolling: (intervalMs?: number) => () => void;
}

export const useLayoutDataStore = create<LayoutDataState>()((set) => ({
  unreadCount: 0,
  recentNotifications: [],
  availableBalance: 0,
  pendingBalance: 0,
  pendingRequests: 0,
  lastFetchedAt: 0,

  fetch: async () => {
    const results = await Promise.allSettled([
      notificationsService.unreadCount(),
      notificationsService.list({ offset: 0, limit: 5 }),
      revenueService.getSummary(),
      productRequestsService.list({ status: "pending", offset: 0, limit: 1 }),
    ]);

    const unreadCount = results[0].status === "fulfilled" ? (results[0].value as number) : undefined;
    const notifList = results[1].status === "fulfilled" ? results[1].value : undefined;
    const summary = results[2].status === "fulfilled" ? results[2].value : undefined;
    const requests = results[3].status === "fulfilled" ? results[3].value : undefined;

    set(prev => ({
      unreadCount: unreadCount ?? prev.unreadCount,
      recentNotifications: notifList?.items ?? prev.recentNotifications,
      availableBalance: summary?.available_balance ?? prev.availableBalance,
      pendingBalance: summary?.pending_balance ?? prev.pendingBalance,
      pendingRequests: requests?.total ?? prev.pendingRequests,
      lastFetchedAt: Date.now(),
    }));
  },

  startPolling: (intervalMs = 60_000) => {
    // Fetch immediately on start
    useLayoutDataStore.getState().fetch();
    const id = setInterval(() => useLayoutDataStore.getState().fetch(), intervalMs);
    return () => clearInterval(id);
  },
}));
