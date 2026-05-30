import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

const TOKEN_KEY = "farumasi_partner_token";
const REFRESH_KEY = "farumasi_partner_refresh";
const USER_KEY = "farumasi_partner_user";

/** Attach stored access token to every request. */
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  // Ensure list-style paths end with '/' for FastAPI
  if (config.url) {
    const isActionPath = /\/(login|register|refresh|logout|me|read|approve|reject|status|review|upload|all|availability|submit|change-password)$/.test(
      config.url,
    );
    const hasSubPath = /\/[^/]+\/[^/]+$/.test(config.url);
    if (!config.url.endsWith("/") && !isActionPath && !hasSubPath) {
      config.url = config.url + "/";
    }
  }
  return config;
});

/** On 401, try refresh once, otherwise wipe tokens and redirect to /login. */
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh =
          typeof window !== "undefined" ? localStorage.getItem(REFRESH_KEY) : null;
        if (!refresh) throw new Error("no refresh token");
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, {
          refresh_token: refresh,
        });
        if (typeof window !== "undefined") {
          localStorage.setItem(TOKEN_KEY, data.access_token);
          localStorage.setItem(REFRESH_KEY, data.refresh_token);
        }
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch {
        if (typeof window !== "undefined") {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_KEY);
          localStorage.removeItem(USER_KEY);
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(err);
  },
);

/** Safely extract a human-readable message from any axios/API error.
 *  Handles Pydantic v2 array-style detail, plain string detail, and network errors. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getApiError(err: any, fallback = "Something went wrong"): string {
  const detail = err?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const first = detail[0];
    if (typeof first === "string") return first;
    if (first?.msg) return first.msg as string;
  }
  return fallback;
}

export const tokenKeys = { TOKEN_KEY, REFRESH_KEY, USER_KEY };
export default api;
