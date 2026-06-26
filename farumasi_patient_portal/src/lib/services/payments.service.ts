import api from "@/lib/api";

export interface PaymentInitiateResult {
  order_id: string;
  payment_status: string;
  amount: number;
  order_amount?: number;
  processing_fee?: number;
  currency: string;
  provider: string;
  external_id?: string | null;
  checkout_url?: string | null;
  message: string;
}

export interface PaymentStatusResult {
  order_id: string;
  payment_status: string;
  amount_due: number;
  amount_paid?: number | null;
  payment_method?: string | null;
  payment_reference?: string | null;
  message?: string | null;
  processing_fee?: number | null;
}

export type PaymentMethodId = "mtn_momo" | "airtel_money" | "card";

export interface FlutterwaveInitiatePayload {
  phone: string;
  email?: string;
  name?: string;
  redirect_url?: string;
  payment_method?: PaymentMethodId;
}

const POLL_INTERVAL_MS = 2500;
const POLL_MAX_ATTEMPTS = 48;

export const paymentsService = {
  async initiateFlutterwave(
    orderId: string,
    payload: FlutterwaveInitiatePayload,
  ): Promise<PaymentInitiateResult> {
    const { data } = await api.post<PaymentInitiateResult>(
      `/patients/me/orders/${orderId}/payments/flutterwave/initiate`,
      payload,
      { timeout: 45_000 },
    );
    return data;
  },

  async getStatus(orderId: string): Promise<PaymentStatusResult> {
    const { data } = await api.get<PaymentStatusResult>(
      `/patients/me/orders/${orderId}/payments/status`,
    );
    return data;
  },

  async waitUntilPaid(orderId: string): Promise<PaymentStatusResult> {
    for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
      const status = await this.getStatus(orderId);
      if (status.payment_status === "paid") return status;
      if (status.payment_status === "failed") {
        throw new Error(status.message ?? "Payment failed");
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    throw new Error("Payment timed out. Check your payment status or try again.");
  },
};
