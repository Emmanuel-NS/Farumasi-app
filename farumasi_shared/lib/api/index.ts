/**
 * FARUMASI Shared API — public surface.
 *
 * Usage (per portal, once at bootstrap):
 *
 * ```ts
 * import { configureFarumasiApi } from "@farumasi/shared/lib/api";
 *
 * configureFarumasiApi({
 *   baseUrl: process.env.NEXT_PUBLIC_API_URL!,
 *   tokenKeyPrefix: "farumasi_patient_",
 *   onUnauthorized: () => { window.location.href = "/auth/login"; },
 * });
 * ```
 *
 * Then any module can:
 *
 * ```ts
 * import { authApi, patientsApi } from "@farumasi/shared/lib/api";
 * await authApi.login({ email, password });
 * const me = await authApi.me();
 * ```
 */

export * from "./types";
export { FarumasiApiClient, configureFarumasiApi, getClient, normalizeError } from "./client";
export type {
  FarumasiApiClientOptions,
  NormalizedError,
  TokenStorage,
} from "./client";

export { authApi } from "./auth";
export { patientsApi } from "./patients";
export { doctorsApi } from "./doctors";
export { hospitalsApi } from "./hospitals";
export { pharmacistsApi } from "./pharmacists";
export { pharmaciesApi } from "./pharmacies";
export { partnersApi } from "./partners";
export { productsApi, categoriesApi, listingsApi, insuranceApi } from "./products";
export { prescriptionsApi } from "./prescriptions";
export { recommendationsApi } from "./recommendations";
export { ordersApi } from "./orders";
export { deliveriesApi } from "./deliveries";
export { ridersApi } from "./riders";
export { revenueApi } from "./revenue";
export { withdrawalsApi } from "./withdrawals";
export { notificationsApi } from "./notifications";
export { articlesApi } from "./articles";
export { adminApi } from "./admin";
