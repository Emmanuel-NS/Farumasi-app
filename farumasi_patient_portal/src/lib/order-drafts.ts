import type { CheckoutProgress, CheckoutStep } from "@/lib/checkout-progress";

export interface OrderDraft {
  id: string;
  savedAt: number;
  step: CheckoutStep;
  rxId: string | null;
  recId: string | null;
  cartKey: string;
  itemLabels: string[];
  itemCount: number;
  resumeUrl: string;
}

const DRAFTS_KEY = "farumasi_order_drafts";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_DRAFTS = 5;

const STEP_LABELS: Record<CheckoutStep, string> = {
  cart: "Cart",
  pharmacy: "Choose pharmacy",
  details: "Delivery details",
  payment: "Payment",
  confirmed: "Complete",
};

export function orderDraftStepLabel(step: CheckoutStep): string {
  return STEP_LABELS[step] ?? step;
}

function draftId(cartKey: string, rxId: string | null, recId: string | null): string {
  return `${cartKey}|${rxId ?? ""}|${recId ?? ""}`;
}

function buildResumeUrl(rxId: string | null, recId: string | null): string {
  if (!rxId) return "/cart";
  const params = new URLSearchParams({ rx: rxId });
  if (recId) params.set("rec", recId);
  return `/cart?${params.toString()}`;
}

function readDrafts(): OrderDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as OrderDraft[];
    const fresh = list.filter((d) => Date.now() - d.savedAt <= MAX_AGE_MS);
    if (fresh.length !== list.length) {
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(fresh));
    }
    return fresh;
  } catch {
    return [];
  }
}

function writeDrafts(drafts: OrderDraft[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts.slice(0, MAX_DRAFTS)));
  } catch {
    /* quota */
  }
}

/** Save or update a checkout draft once the patient leaves the cart step. */
export function syncOrderDraft(progress: CheckoutProgress, itemLabels: string[]): void {
  if (typeof window === "undefined") return;

  const id = draftId(progress.cartKey, progress.rxId, progress.recId);

  if (progress.step === "confirmed" || progress.step === "cart") {
    removeOrderDraft(progress.cartKey, progress.rxId, progress.recId);
    return;
  }

  const draft: OrderDraft = {
    id,
    savedAt: Date.now(),
    step: progress.step,
    rxId: progress.rxId,
    recId: progress.recId,
    cartKey: progress.cartKey,
    itemLabels,
    itemCount: itemLabels.length,
    resumeUrl: buildResumeUrl(progress.rxId, progress.recId),
  };

  const next = readDrafts().filter((d) => d.id !== id);
  next.unshift(draft);
  writeDrafts(next);
}

export function listOrderDrafts(): OrderDraft[] {
  return readDrafts().sort((a, b) => b.savedAt - a.savedAt);
}

export function removeOrderDraft(
  cartKey: string,
  rxId: string | null,
  recId: string | null,
): void {
  const id = draftId(cartKey, rxId, recId);
  writeDrafts(readDrafts().filter((d) => d.id !== id));
}

export function removeOrderDraftById(id: string): void {
  writeDrafts(readDrafts().filter((d) => d.id !== id));
}

export function clearAllOrderDrafts(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DRAFTS_KEY);
}

export function orderDraftSummary(draft: OrderDraft): string {
  const labels = draft.itemLabels.filter(Boolean);
  if (labels.length === 0) {
    return `${draft.itemCount} item${draft.itemCount === 1 ? "" : "s"}`;
  }
  if (labels.length <= 2) return labels.join(", ");
  return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
}
