import axios from "axios";

/** Extract a human-readable message from axios/FastAPI errors. */
export function getApiError(err: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (Array.isArray(detail)) {
      const msg = detail
        .map((d) => (typeof d === "object" && d && "msg" in d ? String(d.msg) : String(d)))
        .filter(Boolean)
        .join(". ");
      if (msg) return msg;
    }
    if (typeof err.response?.data?.message === "string") return err.response.data.message;
    if (err.message && !err.message.startsWith("Request failed")) return err.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
