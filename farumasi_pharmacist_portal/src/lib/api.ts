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
    const isActionPath = /\/(login|register|refresh|logout|me|read|approve|reject|status|review|upload|all)$/.test(config.url);
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

export default api;
