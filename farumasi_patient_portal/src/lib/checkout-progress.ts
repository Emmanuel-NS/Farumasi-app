import type { PaymentMethodId } from "@/components/cart/payment-checkout";

export type CheckoutStep = "cart" | "pharmacy" | "details" | "payment" | "confirmed";

export interface ManualPaymentDraft {
  proofUrls: string[];
  note: string;
  claimedRef: string;
}

/** Order created but manual proof not yet submitted — resume on return. */
export interface PendingManualOrder {
  orderId: string;
  orderCode: string;
  amount: number;
  accessCode: string;
}

export interface CheckoutProgress {
  v: 1;
  savedAt: number;
  rxId: string | null;
  recId: string | null;
  cartKey: string;
  step: CheckoutStep;
  selectedPharmacyId: string | null;
  fulfillment: "delivery" | "pickup";
  name: string;
  phone: string;
  district: string;
  deliveryHood: string;
  notes: string;
  deferDeliveryFee: boolean;
  paymentMethod: PaymentMethodId;
  manualDraft: ManualPaymentDraft;
  pendingManualOrder: PendingManualOrder | null;
}

const STORAGE_KEY = "farumasi_checkout_progress";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const EMPTY_MANUAL_DRAFT: ManualPaymentDraft = {
  proofUrls: [],
  note: "",
  claimedRef: "",
};

export function loadCheckoutProgress(
  cartKey: string,
  rxId: string | null,
  recId: string | null,
): CheckoutProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as CheckoutProgress;
    if (data.v !== 1) return null;
    if (Date.now() - data.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (data.cartKey !== cartKey) return null;
    if ((data.rxId ?? null) !== (rxId ?? null)) return null;
    if ((data.recId ?? null) !== (recId ?? null)) return null;
    if (data.step === "confirmed") return null;
    return {
      ...data,
      manualDraft: data.manualDraft ?? EMPTY_MANUAL_DRAFT,
      pendingManualOrder: data.pendingManualOrder ?? null,
    };
  } catch {
    return null;
  }
}

export function saveCheckoutProgress(progress: CheckoutProgress): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...progress, savedAt: Date.now() }),
    );
  } catch {
    /* quota exceeded — ignore */
  }
}

export function clearCheckoutProgress(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
