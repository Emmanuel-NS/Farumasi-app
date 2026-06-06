/**
 * Shared layout data store — single source of truth for live counts/balances
 * that both the topbar and sidebar display. A single poller runs from the
 * layout; sidebar and topbar are pure consumers with no fetch logic of their own.
 */
import { create } from "zustand";
import { startVisibleInterval } from "@/lib/polling";
import { notificationsService, type BackendNotification } from "@/lib/services/notifications.service";
import { revenueService } from "@/lib/services/revenue.service";
import { productRequestsService } from "@/lib/services/product-requests.service";
import { sellerChangeRequestsService } from "@/lib/services/seller-change-requests.service";

interface LayoutDataState {
  unreadCount: number;
  recentNotifications: BackendNotification[];
  availableBalance: number;
  pendingBalance: number;
  pendingRequests: number;
  lastFetchedAt: number;
  fetch: () => Promise<void>;
  startPolling: (intervalMs?: number) => () => void;
}

const OPEN_PRODUCT_STATUSES = new Set(["draft", "submitted", "under_review", "more_info_required"]);
const ACTIVE_WITHDRAWAL_STATUSES = new Set(["pending", "approved", "processing"]);

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
      productRequestsService.list({ offset: 0, limit: 50 }),
      sellerChangeRequestsService.listPending(),
      revenueService.listWithdrawals(),
    ]);

    const unreadCount = results[0].status === "fulfilled" ? (results[0].value as number) : undefined;
    const notifList = results[1].status === "fulfilled" ? results[1].value : undefined;
    const summary = results[2].status === "fulfilled" ? results[2].value : undefined;
    const requests = results[3].status === "fulfilled" ? results[3].value : undefined;
    const pendingChanges = results[4].status === "fulfilled" ? results[4].value : undefined;
    const withdrawals = results[5].status === "fulfilled" ? results[5].value : undefined;

    const openProducts =
      requests?.items?.filter((r) => OPEN_PRODUCT_STATUSES.has(r.status)).length ?? 0;
    const inboxPending = pendingChanges?.length ?? 0;
    const activeWithdrawals =
      withdrawals?.filter((w) => ACTIVE_WITHDRAWAL_STATUSES.has(w.status)).length ?? 0;

    const totalPending =
      results[3].status === "fulfilled" ||
      results[4].status === "fulfilled" ||
      results[5].status === "fulfilled"
        ? openProducts + inboxPending + activeWithdrawals
        : undefined;

    set((prev) => ({
      unreadCount: unreadCount ?? prev.unreadCount,
      recentNotifications: notifList?.items ?? prev.recentNotifications,
      availableBalance: summary ? summary.available_balance : prev.availableBalance,
      pendingBalance: summary ? summary.pending_balance : prev.pendingBalance,
      pendingRequests: totalPending ?? prev.pendingRequests,
      lastFetchedAt: Date.now(),
    }));
  },

  startPolling: (intervalMs = 120_000) => {
    return startVisibleInterval(() => {
      void useLayoutDataStore.getState().fetch();
    }, intervalMs);
  },
}));
