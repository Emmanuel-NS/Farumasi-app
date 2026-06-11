/** Normalize insurance provider names for fuzzy matching. */
function normInsuranceName(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

/** Whether a pharmacy accepts the Rx insurance provider (by name). */
export function pharmacyAcceptsRxInsurance(
  supportedInsurances: string[],
  rxProvider: string | null | undefined,
): boolean {
  if (!rxProvider || supportedInsurances.length === 0) return false;
  const rx = normInsuranceName(rxProvider);
  return supportedInsurances.some((name) => {
    const n = normInsuranceName(name);
    return n === rx || n.includes(rx) || rx.includes(n);
  });
}

export function calcInsuranceSaving(fullPrice: number, discountPct: number): number {
  if (fullPrice <= 0 || discountPct <= 0) return 0;
  return Math.round(fullPrice * discountPct / 100);
}

export function priceAfterInsurance(fullPrice: number, discountPct: number): number {
  return fullPrice - calcInsuranceSaving(fullPrice, discountPct);
}
