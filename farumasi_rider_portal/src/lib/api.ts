import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("farumasi_rider_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  // Ensure list-style paths end with '/' for FastAPI
  if (config.url) {
    const isActionPath =
      /\/(login|register|refresh|logout|me|accept|status|confirm-qr)$/.test(
        config.url
      );
    const hasSubPath = /\/[^/]+\/[^/]+$/.test(config.url);
    if (!config.url.endsWith("/") && !isActionPath && !hasSubPath) {
      config.url = config.url + "/";
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh =
          typeof window !== "undefined"
            ? localStorage.getItem("farumasi_rider_refresh")
            : null;
        if (!refresh) throw new Error("no refresh token");
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, {
          refresh_token: refresh,
        });
        if (typeof window !== "undefined") {
          localStorage.setItem("farumasi_rider_token", data.access_token);
          localStorage.setItem("farumasi_rider_refresh", data.refresh_token);
        }
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch {
        if (typeof window !== "undefined") {
          localStorage.removeItem("farumasi_rider_token");
          localStorage.removeItem("farumasi_rider_refresh");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(err);
  }
);

export default api;
