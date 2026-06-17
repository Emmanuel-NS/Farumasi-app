import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

/** Origin of the API server (no /api/v1 suffix). Used for static asset URLs
 *  like `/uploads/...` returned by the backend. */
export const API_ORIGIN = API_BASE.replace(/\/api\/v\d+\/?$/, "");

/** Resolve a (possibly relative) media URL returned by the backend (e.g.
 *  `/uploads/chat/abc.jpg`) into an absolute URL that points at the API
 *  server, not the Next.js dev server. Passes data: and http(s): URLs
 *  through unchanged. */
export function mediaUrl(url?: string | null): string {
  if (!url) return "";
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (url.startsWith("/")) return `${API_ORIGIN}${url}`;
  return `${API_ORIGIN}/${url}`;
}

/** Extract a human-readable message from a failed API call. */
export function apiErrorDetail(err: unknown): string | undefined {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data
    ?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string };
    if (typeof first?.msg === "string") return first.msg;
  }
  return undefined;
}

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 20_000,
});

/** Attach stored access token to every request. */
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("farumasi_access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  // FormData must use the browser-generated multipart boundary.
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    if (config.headers && typeof config.headers.delete === "function") {
      config.headers.delete("Content-Type");
    } else if (config.headers) {
      delete (config.headers as Record<string, unknown>)["Content-Type"];
    }
  }

  if (config.url) {
    const authSlowPath =
      /\/auth\/(register|resend-registration-otp|forgot-password|reset-password|verify-registration)/.test(
        config.url,
      );
    if (authSlowPath) {
      config.timeout = 60_000;
    }

    const isActionPath = /\/(login|register|refresh|logout|me|read|approve|reject|assign|publish|archive|confirm-qr|mark-all-read|read-all|mark-paid|availability|summary)$/.test(config.url);
    const hasSegmentAfterSlash = /\/[^/]+\/[^/]+$/.test(config.url);
    const isCreateOrder = config.url === "/patients/me/orders";
    if (
      !isCreateOrder &&
      !config.url.endsWith("/") &&
      !isActionPath &&
      !hasSegmentAfterSlash
    ) {
      config.url = config.url + "/";
    }
  }

  return config;
});

/** On 401, try to refresh once; on failure clear tokens. */
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      // If the request had no Authorization header the user is a guest —
      // there is nothing to refresh and we must NOT redirect to login.
      if (!original.headers?.Authorization) return Promise.reject(err);

      original._retry = true;
      try {
        const refresh = typeof window !== "undefined"
          ? localStorage.getItem("farumasi_refresh_token")
          : null;
        if (!refresh) throw new Error("no refresh token");
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, {
          refresh_token: refresh,
        });
        if (typeof window !== "undefined") {
          localStorage.setItem("farumasi_access_token", data.access_token);
          localStorage.setItem("farumasi_refresh_token", data.refresh_token);
        }
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch {
        if (typeof window !== "undefined") {
          localStorage.removeItem("farumasi_access_token");
          localStorage.removeItem("farumasi_refresh_token");
          localStorage.removeItem("farumasi_auth");
        }
        window.location.href = "/auth/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;
