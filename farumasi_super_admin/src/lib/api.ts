import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const TOKEN_KEY = "farumasi_admin_token";

const api = axios.create({ baseURL: BASE_URL, timeout: 20_000 });

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const isAuthRoute =
      config.url?.includes("/auth/login") || config.url?.includes("/auth/register");
    if (!isAuthRoute) {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      const onLogin = window.location.pathname.startsWith("/login");
      if (!onLogin) {
        localStorage.removeItem(TOKEN_KEY);
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  },
);

export default api;
export { TOKEN_KEY };
