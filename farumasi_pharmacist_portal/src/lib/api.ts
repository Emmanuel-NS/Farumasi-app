import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const API_ORIGIN = API_BASE.replace(/\/api\/v\d+\/?$/, "");

/** Resolve a (possibly relative) media URL returned by the backend (e.g.
 *  `/uploads/chat/abc.jpg`) into an absolute URL that points at the API
 *  server, not the Next.js dev server. */
export function mediaUrl(url?: string | null): string {
  if (!url) return "";
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (url.startsWith("/")) return `${API_ORIGIN}${url}`;
  return `${API_ORIGIN}/${url}`;
}

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 20_000,
});

/** Attach stored access token to every request. */
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("farumasi_pharm_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  // Ensure list-style paths end with '/' for FastAPI
  if (config.url) {
    const isActionPath = /\/(login|register|refresh|logout|me|read|approve|reject|status|review|upload|all|publish|archive|sponsored)$/.test(config.url);
    const hasSubPath = /\/[^/]+\/[^/]+$/.test(config.url);
    if (!config.url.endsWith("/") && !isActionPath && !hasSubPath) {
      config.url = config.url + "/";
    }
  }
  return config;
});

/** On 401, clear tokens and redirect to login. */
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = typeof window !== "undefined"
          ? localStorage.getItem("farumasi_pharm_refresh")
          : null;
        if (!refresh) throw new Error("no refresh token");
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, {
          refresh_token: refresh,
        });
        if (typeof window !== "undefined") {
          localStorage.setItem("farumasi_pharm_token", data.access_token);
          localStorage.setItem("farumasi_pharm_refresh", data.refresh_token);
        }
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch {
        if (typeof window !== "undefined") {
          localStorage.removeItem("farumasi_pharm_token");
          localStorage.removeItem("farumasi_pharm_refresh");
          localStorage.removeItem("farumasi_pharm_user");
        }
        window.location.href = "/auth/login";
      }
    }
    return Promise.reject(err);
  }
);

/** Extract a human-readable error message from an Axios error response. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getApiError(err: any, fallback = "Something went wrong"): string {
  const data = err?.response?.data;
  const detail = data?.detail ?? data?.message ?? data?.error;
  if (!detail) {
    if (err?.code === "ECONNABORTED") return "Request timed out — try again";
    if (!err?.response) return err?.message || "Network error — check your connection";
    return fallback;
  }
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item: unknown) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const row = item as { msg?: string; loc?: unknown[] };
          if (row.msg) {
            const loc = Array.isArray(row.loc)
              ? row.loc.filter((p) => p !== "body" && p !== "query").join(".")
              : "";
            return loc ? `${loc}: ${row.msg}` : row.msg;
          }
        }
        return null;
      })
      .filter(Boolean);
    if (parts.length) return parts.join("; ");
  }
  if (typeof detail === "object" && detail !== null && "msg" in detail) {
    return String((detail as { msg: string }).msg);
  }
  return fallback;
}

export default api;
