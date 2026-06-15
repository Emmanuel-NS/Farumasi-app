import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

/** Safe back when opened from a shared link (no prior history). */
export function safeBackToHealth(router: AppRouterInstance) {
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back();
    return;
  }
  router.push("/health");
}

export function safeBackToConsult(router: AppRouterInstance) {
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back();
    return;
  }
  router.push("/consult");
}

export function safeBackToStore(router: AppRouterInstance) {
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back();
    return;
  }
  router.push("/store");
}
