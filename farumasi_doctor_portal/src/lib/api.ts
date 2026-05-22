import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("farumasi_doctor_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
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
        const refresh = typeof window !== "undefined"
          ? localStorage.getItem("farumasi_doctor_refresh") : null;
        if (!refresh) throw new Error("no refresh token");
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refresh_token: refresh });
        localStorage.setItem("farumasi_doctor_token", data.access_token);
        localStorage.setItem("farumasi_doctor_refresh", data.refresh_token);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch {
        localStorage.removeItem("farumasi_doctor_token");
        localStorage.removeItem("farumasi_doctor_refresh");
        localStorage.removeItem("farumasi_doctor_user");
        window.location.href = "/auth/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;
