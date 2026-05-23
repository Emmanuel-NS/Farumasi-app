/**
 * FARUMASI Shared API Client — core HTTP layer
 *
 * Cross-portal axios client with:
 *   - configurable base URL
 *   - configurable per-portal token storage key prefix
 *   - automatic Bearer attach
 *   - automatic single-shot refresh on 401
 *   - trailing-slash heuristic (FastAPI runs with redirect_slashes=False)
 *   - normalized errors
 *
 * This module has no portal-specific UI logic. UI concerns (toasts, redirects)
 * must be handled by each portal by listening to {@link FarumasiApiClient}'s
 * `onUnauthorized` callback.
 */

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";

import type { ApiErrorBody, TokenResponse } from "./types";

// ── Configuration ────────────────────────────────────────────────────────────
export interface FarumasiApiClientOptions {
  /** Full base URL, e.g. `http://localhost:8000/api/v1`. */
  baseUrl: string;
  /** Storage key prefix per portal, e.g. `farumasi_patient_`. */
  tokenKeyPrefix: string;
  /**
   * Storage backend. Defaults to `window.localStorage` in the browser.
   * Pass a custom impl for Node SSR / tests.
   */
  storage?: TokenStorage;
  /**
   * Called when refresh fails or no refresh token is present.
   * Portals typically clear app state and redirect to the login page here.
   */
  onUnauthorized?: () => void;
  /** Default request timeout in ms. */
  timeoutMs?: number;
}

export interface TokenStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

export interface NormalizedError {
  status: number;
  message: string;
  detail: ApiErrorBody["detail"] | undefined;
  raw: unknown;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const ACTION_PATH_RE =
  /\/(login|register|refresh|logout|me|read|approve|reject|assign|publish|archive|confirm-qr|mark-all-read|read-all|mark-paid|availability|summary|status|payment-status|payment|broadcast|submit|review)(\?|$)/i;

/**
 * Heuristic for FastAPI's `redirect_slashes=False`.
 * - Adds a trailing `/` to *list-style* paths.
 * - Leaves *action* paths and *item* paths alone.
 */
function applyTrailingSlash(url: string): string {
  if (!url) return url;
  // Already has trailing slash before query.
  const [path, query] = url.split("?");
  if (path.endsWith("/")) return url;
  if (ACTION_PATH_RE.test(url)) return url;
  // Item path like /orders/<uuid> — count slashes
  const segments = path.split("/").filter(Boolean);
  const last = segments[segments.length - 1] ?? "";
  // If last segment looks like an id (uuid or long token), don't add slash
  const looksLikeId = /^[a-f0-9-]{8,}$/i.test(last) || /^\d+$/.test(last);
  if (looksLikeId) return url;
  const newPath = path + "/";
  return query ? `${newPath}?${query}` : newPath;
}

function normalizeError(err: unknown): NormalizedError {
  if (axios.isAxiosError(err)) {
    const aerr = err as AxiosError<ApiErrorBody>;
    const status = aerr.response?.status ?? 0;
    const detail = aerr.response?.data?.detail;
    let message: string;
    if (typeof detail === "string") {
      message = detail;
    } else if (Array.isArray(detail) && detail.length > 0) {
      message = detail.map((d) => d.msg).join("; ");
    } else {
      message = aerr.message || "Network error";
    }
    return { status, message, detail, raw: err };
  }
  return {
    status: 0,
    message: err instanceof Error ? err.message : "Unknown error",
    detail: undefined,
    raw: err,
  };
}

// ── Default storage (browser) ────────────────────────────────────────────────
const defaultStorage: TokenStorage = {
  getItem(key) {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  },
  setItem(key, value) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  },
  removeItem(key) {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  },
};

// ── Client ───────────────────────────────────────────────────────────────────
export class FarumasiApiClient {
  readonly baseUrl: string;
  readonly tokenKeyPrefix: string;
  readonly accessKey: string;
  readonly refreshKey: string;
  readonly storage: TokenStorage;
  readonly axios: AxiosInstance;
  readonly onUnauthorized?: () => void;

  constructor(opts: FarumasiApiClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.tokenKeyPrefix = opts.tokenKeyPrefix;
    this.accessKey = `${opts.tokenKeyPrefix}access_token`;
    this.refreshKey = `${opts.tokenKeyPrefix}refresh_token`;
    this.storage = opts.storage ?? defaultStorage;
    this.onUnauthorized = opts.onUnauthorized;

    this.axios = axios.create({
      baseURL: this.baseUrl,
      timeout: opts.timeoutMs ?? 30_000,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
    });

    this.axios.interceptors.request.use(async (config) => this.attachAuth(config));
    this.axios.interceptors.response.use(
      (r) => r,
      (err) => this.handleResponseError(err),
    );
  }

  // ── Token I/O ──────────────────────────────────────────────────────────────
  async getAccessToken(): Promise<string | null> {
    return Promise.resolve(this.storage.getItem(this.accessKey));
  }

  async getRefreshToken(): Promise<string | null> {
    return Promise.resolve(this.storage.getItem(this.refreshKey));
  }

  async setTokens(tokens: TokenResponse): Promise<void> {
    await this.storage.setItem(this.accessKey, tokens.access_token);
    await this.storage.setItem(this.refreshKey, tokens.refresh_token);
  }

  async clearTokens(): Promise<void> {
    await this.storage.removeItem(this.accessKey);
    await this.storage.removeItem(this.refreshKey);
  }

  // ── Interceptors ───────────────────────────────────────────────────────────
  private async attachAuth(config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> {
    const token = await this.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.url) {
      config.url = applyTrailingSlash(config.url);
    }
    return config;
  }

  private async handleResponseError(err: AxiosError) {
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (
      err.response?.status === 401 &&
      original &&
      !original._retry &&
      !(original.url ?? "").includes("/auth/refresh")
    ) {
      original._retry = true;
      try {
        const refresh = await this.getRefreshToken();
        if (!refresh) throw new Error("no refresh token");
        const { data } = await axios.post<TokenResponse>(
          `${this.baseUrl}/auth/refresh`,
          { refresh_token: refresh },
          { headers: { "Content-Type": "application/json" } },
        );
        await this.setTokens(data);
        original.headers = original.headers ?? {};
        original.headers["Authorization"] = `Bearer ${data.access_token}`;
        return this.axios(original);
      } catch (refreshErr) {
        await this.clearTokens();
        this.onUnauthorized?.();
        return Promise.reject(normalizeError(refreshErr));
      }
    }
    return Promise.reject(normalizeError(err));
  }

  // ── Verbs ──────────────────────────────────────────────────────────────────
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const { data } = await this.axios.get<T>(url, config);
    return data;
  }

  async post<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const { data } = await this.axios.post<T>(url, body, config);
    return data;
  }

  async patch<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const { data } = await this.axios.patch<T>(url, body, config);
    return data;
  }

  async put<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const { data } = await this.axios.put<T>(url, body, config);
    return data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const { data } = await this.axios.delete<T>(url, config);
    return data;
  }

  /** Upload a file via multipart/form-data. */
  async upload<T>(
    url: string,
    file: File | Blob,
    fieldName = "file",
    extraFields?: Record<string, string | Blob>,
  ): Promise<T> {
    const form = new FormData();
    form.append(fieldName, file);
    if (extraFields) {
      for (const [k, v] of Object.entries(extraFields)) form.append(k, v);
    }
    const { data } = await this.axios.post<T>(url, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  }
}

/** Module-level singleton — set once per portal via {@link configureFarumasiApi}. */
let _client: FarumasiApiClient | null = null;

export function configureFarumasiApi(opts: FarumasiApiClientOptions): FarumasiApiClient {
  _client = new FarumasiApiClient(opts);
  return _client;
}

export function getClient(): FarumasiApiClient {
  if (!_client) {
    throw new Error(
      "FarumasiApiClient is not configured. Call configureFarumasiApi(...) at app bootstrap.",
    );
  }
  return _client;
}

export { normalizeError };
