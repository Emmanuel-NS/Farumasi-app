import { tokenKeys } from "@/lib/api";

/** Base path for seller-scoped `/me` APIs (pharmacy vs partner company). */
export function getSellerMeBase(): "/partners/me" | "/pharmacies/me" {
  if (typeof window === "undefined") return "/partners/me";
  try {
    const raw = localStorage.getItem(tokenKeys.USER_KEY);
    if (raw) {
      const user = JSON.parse(raw) as { role?: string };
      if (user.role === "pharmacy_admin" || user.role === "pharmacist") {
        return "/pharmacies/me";
      }
    }
  } catch {
    /* ignore */
  }
  return "/partners/me";
}
