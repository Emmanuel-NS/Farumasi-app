export const PAYOUT_METHODS = [
  {
    value: "bank_transfer",
    label: "Bank Transfer",
    accountLabel: "Bank account number",
    accountPlaceholder: "e.g. 1234567890",
  },
  {
    value: "mobile_money",
    label: "MTN Mobile Money",
    accountLabel: "MTN MoMo phone number",
    accountPlaceholder: "+250 7XX XXX XXX",
  },
  {
    value: "momo_code",
    label: "MTN MoMo Code",
    accountLabel: "MoMo Pay / merchant code",
    accountPlaceholder: "e.g. merchant ID or pay code",
  },
  {
    value: "airtel_money",
    label: "Airtel Money",
    accountLabel: "Airtel Money phone number",
    accountPlaceholder: "+250 7XX XXX XXX",
  },
] as const;

export type PayoutMethodValue = (typeof PAYOUT_METHODS)[number]["value"];

export function payoutMethodLabel(value: string): string {
  return PAYOUT_METHODS.find((m) => m.value === value)?.label ?? value.replace(/_/g, " ");
}

export function selectedPayoutMethod(value: string) {
  return PAYOUT_METHODS.find((m) => m.value === value) ?? PAYOUT_METHODS[0];
}
