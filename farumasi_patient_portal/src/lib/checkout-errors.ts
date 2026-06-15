import axios from "axios";

/** Turn axios / API failures into user-facing checkout messages. */
export function checkoutErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    if (err.code === "ECONNABORTED") {
      return "Request timed out. The server may be busy — please try again in a moment.";
    }
    if (!err.response) {
      if (err.message === "Network Error") {
        return "Could not reach the server. Check that the API is running at the configured URL and try again.";
      }
      return "Could not reach the server. Check your connection and that the API is running.";
    }
    const data = err.response.data as {
      detail?: string | { msg?: string; message?: string }[] | { message?: string };
      message?: string;
    };
    const detail = data?.detail;
    if (typeof detail === "string" && detail.trim()) {
      return parsePaymentDetail(detail) ?? detail;
    }
    if (Array.isArray(detail)) {
      const first = detail[0];
      if (typeof first === "string") return first;
      if (first?.msg) return first.msg;
      if (first?.message) return first.message;
    }
    if (detail && typeof detail === "object" && "message" in detail && detail.message) {
      return String(detail.message);
    }
    if (data?.message) return parsePaymentDetail(data.message) ?? data.message;
    if (err.response.status === 401) {
      return "Please sign in to place an order.";
    }
    if (err.response.status === 422) {
      return "Some order details are invalid. Review your cart and try again.";
    }
    if (err.response.status === 400) {
      return typeof detail === "string" && detail.trim()
        ? (parsePaymentDetail(detail) ?? detail)
        : "Could not place order. Review your cart and try again.";
    }
    if (err.response.status >= 500) {
      return "Server error while processing your order. Please try again in a moment.";
    }
  }
  if (err instanceof Error && err.message) {
    return parsePaymentDetail(err.message) ?? err.message;
  }
  return fallback;
}

function parsePaymentDetail(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.includes("amount_exceeds_default_limit") || /exceeds.*limit/i.test(trimmed)) {
    return (
      "This order exceeds the current Pesapal payment limit on the FARUMASI merchant account. " +
      "Please contact support or try a smaller order while limits are being raised."
    );
  }
  const dictMatch = trimmed.match(/\{.*\}/s);
  if (dictMatch) {
    try {
      const parsed = JSON.parse(dictMatch[0].replace(/'/g, '"')) as {
        code?: string;
        message?: string;
      };
      if (parsed.code === "amount_exceeds_default_limit") {
        return (
          "This order exceeds the current Pesapal payment limit. Contact FARUMASI support or try a smaller order."
        );
      }
      if (parsed.message) return `Payment could not start: ${parsed.message}`;
    } catch {
      // ignore parse errors
    }
  }
  return null;
}
