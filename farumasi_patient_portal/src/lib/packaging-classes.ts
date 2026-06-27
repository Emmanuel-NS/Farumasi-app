/** Packaging class catalogue — complements product_type (medicine, device, etc.). */

export type PackagingClassValue =
  | "tablets_capsules"
  | "sachets"
  | "ampoules_vials"
  | "liquid_bottle"
  | "ointment_gel_cream"
  | "eye_ear_nose_drops"
  | "inhaler_spray"
  | "other";

export type SellMode = "pack" | "partial";

export const PACKAGING_CLASSES: {
  value: PackagingClassValue;
  label: string;
  partial: boolean;
  defaultUnit: string;
  hint?: string;
}[] = [
  {
    value: "tablets_capsules",
    label: "Tablets / Capsules",
    partial: true,
    defaultUnit: "tablet",
    hint: "Sell by individual tablet/capsule; set minimum order (e.g. 5 tablets).",
  },
  {
    value: "sachets",
    label: "Sachets",
    partial: true,
    defaultUnit: "sachet",
    hint: "Sell individual sachets from a box (e.g. ORS).",
  },
  {
    value: "ampoules_vials",
    label: "Ampoules / Vials",
    partial: true,
    defaultUnit: "ampoule",
    hint: "Sell single ampoules or vials from a manufacturer pack.",
  },
  {
    value: "liquid_bottle",
    label: "Liquid / Bottle",
    partial: false,
    defaultUnit: "",
    hint: "Whole bottle only — cannot pour partial amounts.",
  },
  {
    value: "ointment_gel_cream",
    label: "Ointment / Gel / Cream",
    partial: false,
    defaultUnit: "",
    hint: "Whole tube only.",
  },
  {
    value: "eye_ear_nose_drops",
    label: "Eye / Ear / Nose Drops",
    partial: false,
    defaultUnit: "",
    hint: "Sterile sealed unit — whole bottle only.",
  },
  {
    value: "inhaler_spray",
    label: "Inhaler / Spray",
    partial: false,
    defaultUnit: "",
    hint: "Fixed-dose device — whole unit only.",
  },
  {
    value: "other",
    label: "Other (fixed pack)",
    partial: false,
    defaultUnit: "",
  },
];

export function packagingLabel(value?: string | null): string {
  return PACKAGING_CLASSES.find((c) => c.value === value)?.label ?? "Not classified";
}

export function cartLineKey(productId: string, sellMode: SellMode): string {
  return `${productId}:${sellMode}`;
}

export function oppositeSellMode(sellMode: SellMode): SellMode {
  return sellMode === "pack" ? "partial" : "pack";
}

export function lineUnitLabel(
  sellMode: SellMode,
  partialUnitName?: string,
  unitsPerPack?: number,
): string {
  if (sellMode === "partial") return partialUnitName ?? "unit";
  if (unitsPerPack && unitsPerPack > 1) return `pack (${unitsPerPack} units)`;
  return "pack";
}
