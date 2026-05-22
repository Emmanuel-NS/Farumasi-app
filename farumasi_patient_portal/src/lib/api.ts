import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

/** Attach stored access token to every request. */
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("farumasi_access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  // FastAPI redirect_slashes=False: ensure list-style paths end with '/'
  // Paths that are clearly NOT list endpoints: contain a UUID, or end in an action keyword
  if (config.url) {
    const isActionPath = /\/(login|register|refresh|logout|me|read|approve|reject|assign|publish|archive|confirm-qr|mark-all-read|read-all|mark-paid|availability|summary)$/.test(config.url);
    const hasSegmentAfterSlash = /\/[^/]+\/[^/]+$/.test(config.url); // has sub-path like /orders/123
    if (!config.url.endsWith("/") && !isActionPath && !hasSegmentAfterSlash) {
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
