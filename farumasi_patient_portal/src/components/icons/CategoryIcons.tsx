"use client";
/**
 * Custom healthcare category icons for Farumasi.
 * Each icon is a minimal SVG designed to be clear at 16–36 px.
 * Consistent style: viewBox="0 0 24 24", fill="none", stroke="currentColor",
 * strokeWidth 1.5, round caps/joins.
 */
import React from "react";

export type CategoryIconComponent = React.ComponentType<{ className?: string }>;

export interface CategoryIconDef {
  name: string;
  Icon: CategoryIconComponent;
  label: string;
}

/** Internal factory — wraps static SVG children in a consistent container */
function makeIcon(
  displayName: string,
  children: React.ReactNode,
): CategoryIconComponent {
  const C = ({ className }: { className?: string }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
  C.displayName = displayName;
  return C;
}

/* ── 1. General / All ─────────────────────────────────────────────────────── */
export const IconGeneral = makeIcon("IconGeneral", <>
  <circle cx="12" cy="12" r="9" />
  <path d="M12 7v10M7 12h10" />
</>);

/* ── 2. First Aid Kit ─────────────────────────────────────────────────────── */
export const IconFirstAid = makeIcon("IconFirstAid", <>
  <rect x="3" y="7" width="18" height="13" rx="2" />
  <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
  <path d="M12 11v6M9 14h6" />
</>);

/* ── 3. Pain Relief ───────────────────────────────────────────────────────── */
export const IconPainRelief = makeIcon("IconPainRelief", <>
  <path d="M13 2L4 13h7.5L10 22l10-11.5H13L13 2z" />
</>);

/* ── 4. Antibiotics / Anti-bacterial ─────────────────────────────────────── */
export const IconAntibiotics = makeIcon("IconAntibiotics", <>
  <circle cx="12" cy="12" r="3.5" />
  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  <path d="M5.64 5.64l2.12 2.12M16.24 16.24l2.12 2.12M5.64 18.36l2.12-2.12M16.24 7.76l2.12-2.12" />
  <path d="M12 10v-1.5M14.5 12H16M12 14v1.5M9.5 12H8" strokeWidth="2.2" />
</>);

/* ── 5. Prescription / Rx ─────────────────────────────────────────────────── */
export const IconPrescription = makeIcon("IconPrescription", <>
  <rect x="4" y="2" width="16" height="20" rx="2" />
  <path d="M8 7h3.5a2.5 2.5 0 010 5H8V7z" />
  <path d="M11.5 12l3 5.5" />
  <path d="M8 16h4" />
</>);

/* ── 6. Vitamins / Capsule ────────────────────────────────────────────────── */
export const IconVitamins = makeIcon("IconVitamins", <>
  <rect x="2" y="9" width="20" height="6" rx="3" />
  <line x1="12" y1="9" x2="12" y2="15" />
  <circle cx="6" cy="5.5" r="1" fill="currentColor" stroke="none" />
  <circle cx="10" cy="4.5" r="1" fill="currentColor" stroke="none" />
  <circle cx="14" cy="4.5" r="1" fill="currentColor" stroke="none" />
  <circle cx="18" cy="5.5" r="1" fill="currentColor" stroke="none" />
</>);

/* ── 7. Cold & Flu ────────────────────────────────────────────────────────── */
export const IconColdFlu = makeIcon("IconColdFlu", <>
  <circle cx="12" cy="10" r="5" />
  <circle cx="10" cy="9" r="0.6" fill="currentColor" stroke="none" />
  <circle cx="14" cy="9" r="0.6" fill="currentColor" stroke="none" />
  <path d="M10 12c.6.8 1.6.8 4 0" />
  <path d="M9 15l-1.5 7M15 15l1.5 7" />
  <path d="M11.5 16l-.5 6M12.5 16l.5 6" />
</>);

/* ── 8. Fever / Thermometer ───────────────────────────────────────────────── */
export const IconFever = makeIcon("IconFever", <>
  <path d="M14 14.76V4a2 2 0 00-4 0v10.76a4 4 0 104 0z" />
  <path d="M12 17v-5" />
  <path d="M18 8h1.5M18 11h1.5M18 14h1.5" />
</>);

/* ── 9. Skincare / Dermatology ────────────────────────────────────────────── */
export const IconSkincare = makeIcon("IconSkincare", <>
  <circle cx="12" cy="10" r="5" />
  <circle cx="10.5" cy="9" r="0.6" fill="currentColor" stroke="none" />
  <circle cx="13.5" cy="9" r="0.6" fill="currentColor" stroke="none" />
  <path d="M10 12c.5.8 1.5.8 4 0" />
  <path d="M12 15v2" />
  <path d="M17.5 3.5l1.5-1.5M19 3.5l-1.5-1.5M19 3L17.5 4.5" strokeWidth="2" strokeLinecap="round" />
</>);

/* ── 10. Eye Care ─────────────────────────────────────────────────────────── */
export const IconEyeCare = makeIcon("IconEyeCare", <>
  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
  <circle cx="12" cy="12" r="3" />
  <circle cx="13.2" cy="11" r=".8" fill="currentColor" stroke="none" />
</>);

/* ── 11. Ear Care ─────────────────────────────────────────────────────────── */
export const IconEarCare = makeIcon("IconEarCare", <>
  <path d="M6 12a6 6 0 1112 0c0 3.5-1.5 6-3.5 7.5-.8.6-1.5 1-1.5 2.5v0a1 1 0 01-2 0c0-1.5-.7-2-1.5-2.5" />
  <path d="M13.5 12a1.5 1.5 0 10-3 0c0 1.5 1.5 2 1.5 4" />
</>);

/* ── 12. Dental / Oral Health ─────────────────────────────────────────────── */
export const IconDental = makeIcon("IconDental", <>
  <path d="M9 2c-2 0-3.5 1.5-3.5 3.5 0 2 .6 4.2.8 6.5l.7 7c0 1 .6 2.5 2.5 2.5 1.2 0 1.8-1 2.3-2.5L12 18l.7 1.5c.5 1.5 1.1 2.5 2.3 2.5 1.9 0 2.5-1.5 2.5-2.5l.7-7c.2-2.3.8-4.5.8-6.5C19 3.5 17.5 2 15.5 2c-.7 0-1.4.3-2 .7A2.5 2.5 0 0012 2.5a2.5 2.5 0 00-1.5-.3C9.9 2.3 9.5 2 9 2z" />
</>);

/* ── 13. Hair Care ────────────────────────────────────────────────────────── */
export const IconHairCare = makeIcon("IconHairCare", <>
  <path d="M8 3c-1 3.5-2.5 7-2.5 11" />
  <path d="M12 2.5c-1 3.5-1.5 8-1.5 12" />
  <path d="M16 3c1 3.5 2.5 7 2.5 11" />
  <path d="M6 21c2-2 9-2 12 0" />
</>);

/* ── 14. Wound Care / Bandage ─────────────────────────────────────────────── */
export const IconWoundCare = makeIcon("IconWoundCare", <>
  <rect x="2" y="9.5" width="20" height="5" rx="2.5" />
  <line x1="12" y1="9.5" x2="12" y2="14.5" />
  <circle cx="5.5" cy="12" r="1.3" />
  <circle cx="18.5" cy="12" r="1.3" />
</>);

/* ── 15. Sexual Health ────────────────────────────────────────────────────── */
export const IconSexualHealth = makeIcon("IconSexualHealth", <>
  <path d="M12 21C7 16 3 13.5 3 9.5a5 5 0 0110-1.5A5 5 0 0121 9.5c0 4-4 6.5-9 11.5z" />
  <path d="M9.5 9.5l2 2 3.5-3" />
</>);

/* ── 16. Women's Health ───────────────────────────────────────────────────── */
export const IconWomensHealth = makeIcon("IconWomensHealth", <>
  <circle cx="12" cy="8" r="5" />
  <path d="M12 13v9M9 19h6" />
  <path d="M10 6c.5-1.2 1.2-1.5 2-1.5" />
</>);

/* ── 17. Men's Health ─────────────────────────────────────────────────────── */
export const IconMensHealth = makeIcon("IconMensHealth", <>
  <circle cx="10" cy="14" r="6" />
  <path d="M15 9l5-5M20 4V9M15 4h5" />
</>);

/* ── 18. Mother & Baby ────────────────────────────────────────────────────── */
export const IconMotherBaby = makeIcon("IconMotherBaby", <>
  <circle cx="8.5" cy="4.5" r="2.5" />
  <path d="M6 8.5L4.5 21h8L11 8.5" />
  <circle cx="17" cy="8.5" r="2" />
  <path d="M15.5 12.5l-1 9h6l-1-9" />
</>);

/* ── 19. Pediatrics / Child ───────────────────────────────────────────────── */
export const IconPediatrics = makeIcon("IconPediatrics", <>
  <circle cx="12" cy="5" r="3" />
  <path d="M9 9.5l-3.5 3.5h13l-3.5-3.5" />
  <path d="M9 9.5L5 13M15 9.5l4 3.5" />
  <path d="M10 16l-1.5 6h7L14 16" />
</>);

/* ── 20. Geriatric / Elderly Care ─────────────────────────────────────────── */
export const IconGeriatric = makeIcon("IconGeriatric", <>
  <circle cx="10" cy="4" r="2.5" />
  <path d="M7.5 8l-1.5 13h8L12.5 8" />
  <path d="M15 9.5c2 1.5 3 4 3 6.5M18 16l-2.5 5.5" />
</>);

/* ── 21. Heart Health / Cardiac ──────────────────────────────────────────── */
export const IconHeartHealth = makeIcon("IconHeartHealth", <>
  <path d="M12 21C7 16 3 13.5 3 9.5a5 5 0 0110-1.5A5 5 0 0121 9.5c0 4-4 6.5-9 11.5z" />
  <path d="M7 12h2l1.5-3 2 6 1.5-3H17" />
</>);

/* ── 22. Blood Pressure ───────────────────────────────────────────────────── */
export const IconBloodPressure = makeIcon("IconBloodPressure", <>
  <path d="M5 12a7 7 0 0114 0" />
  <path d="M12 12l-3-5" strokeWidth="2.2" />
  <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
  <rect x="3" y="16" width="18" height="5" rx="2.5" />
  <path d="M9 18.5h6" />
</>);

/* ── 23. Diabetes / Blood Glucose ─────────────────────────────────────────── */
export const IconDiabetes = makeIcon("IconDiabetes", <>
  <path d="M12 3c-1.2 2.5-6 6-6 9.5a6 6 0 0012 0C18 9 13.2 5.5 12 3z" />
  <path d="M9.5 13l2 2 3.5-3.5" />
</>);

/* ── 24. Respiratory / Lungs ──────────────────────────────────────────────── */
export const IconRespiratory = makeIcon("IconRespiratory", <>
  <path d="M12 3v5.5" />
  <path d="M7.5 8.5c-2.5 2-4.5 5-4.5 7.5C3 18.5 4.5 20 6 20h2c1.5 0 2.5-1 2.5-2.5V14" />
  <path d="M16.5 8.5c2.5 2 4.5 5 4.5 7.5C21 18.5 19.5 20 18 20h-2c-1.5 0-2.5-1-2.5-2.5V14" />
</>);

/* ── 25. Digestive Health ─────────────────────────────────────────────────── */
export const IconDigestive = makeIcon("IconDigestive", <>
  <path d="M7 5C4.5 5 3 7 3 10c0 2.5 1 5 2 6.5L6.5 20c.5 1 1.5 2 3 2s2-1 2.5-2.5c.5-1.5.5-3 1.5-4.5 1-1.5 2.5-2 3-3.5.5-1.5.5-3-1-4.5C14 5.5 12 5 10 5.5" />
  <path d="M14 5.5c.5-.5 1-.5 1.5.5.5 1 .5 2-.5 2.5" />
</>);

/* ── 26. Kidney Health ────────────────────────────────────────────────────── */
export const IconKidney = makeIcon("IconKidney", <>
  <path d="M9 4C6 4 4 6.5 4 10c0 6 4 10 6 11.5.8.7 1.8 1 2.5 1s1.7-.3 2.5-1C17 19 20 15 20 9c0-3-1.5-5-4-5-1.2 0-2.2.5-2.5 1.2C13 4.5 12 4 11 4c-.7 0-1.3.2-2 0" />
  <path d="M9 4c-.5.8-.8 2-.8 3.5" />
</>);

/* ── 27. Liver Health ─────────────────────────────────────────────────────── */
export const IconLiver = makeIcon("IconLiver", <>
  <path d="M5 13C5 8.5 8.5 4 13 4c3.5 0 6.5 2 7 5.5-1 6-6 11-11.5 11C5.5 20.5 5 18 5 13z" />
  <path d="M9 7.5c1.5 3 4 5 8.5 6" />
</>);

/* ── 28. Bone & Joint ─────────────────────────────────────────────────────── */
export const IconBoneJoint = makeIcon("IconBoneJoint", <>
  <circle cx="5.5" cy="8.5" r="2.5" />
  <circle cx="5.5" cy="15.5" r="2.5" />
  <circle cx="18.5" cy="8.5" r="2.5" />
  <circle cx="18.5" cy="15.5" r="2.5" />
  <rect x="8" y="10.5" width="8" height="3" rx="1.5" />
</>);

/* ── 29. Spine / Back ─────────────────────────────────────────────────────── */
export const IconSpine = makeIcon("IconSpine", <>
  <rect x="8" y="2" width="8" height="3" rx="1" />
  <rect x="8" y="7" width="8" height="3" rx="1" />
  <rect x="8" y="12" width="8" height="3" rx="1" />
  <rect x="8" y="17" width="8" height="3" rx="1" />
  <line x1="12" y1="5" x2="12" y2="7" />
  <line x1="12" y1="10" x2="12" y2="12" />
  <line x1="12" y1="15" x2="12" y2="17" />
</>);

/* ── 30. Mental Health / Neurology ───────────────────────────────────────── */
export const IconMentalHealth = makeIcon("IconMentalHealth", <>
  <path d="M12 5c-2.5 0-4.5 2-4.5 4.5 0 1.5.7 2.8 1.7 3.7L12 16l2.8-2.8c1-1 1.7-2.2 1.7-3.7C16.5 7 14.5 5 12 5z" />
  <path d="M7.5 9.5C6 10.2 5 11.5 5 13c0 2 1.5 3.2 3 3.5" />
  <path d="M16.5 9.5c1.5.7 2.5 2 2.5 3.5 0 2-1.5 3.2-3 3.5" />
  <path d="M9.5 19h5M12 16v3.5" />
</>);

/* ── 31. Sleep & Rest ─────────────────────────────────────────────────────── */
export const IconSleep = makeIcon("IconSleep", <>
  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
  <circle cx="17.5" cy="5.5" r=".9" fill="currentColor" stroke="none" />
  <circle cx="20" cy="8.5" r=".6" fill="currentColor" stroke="none" />
</>);

/* ── 32. Allergy ──────────────────────────────────────────────────────────── */
export const IconAllergy = makeIcon("IconAllergy", <>
  <circle cx="12" cy="12" r="3" />
  <ellipse cx="12" cy="5.5" rx="1.5" ry="3" />
  <ellipse cx="12" cy="18.5" rx="1.5" ry="3" />
  <ellipse cx="5.5" cy="12" rx="3" ry="1.5" />
  <ellipse cx="18.5" cy="12" rx="3" ry="1.5" />
  <ellipse cx="7.4" cy="7.4" rx="1.5" ry="3" transform="rotate(45 7.4 7.4)" />
  <ellipse cx="16.6" cy="16.6" rx="1.5" ry="3" transform="rotate(45 16.6 16.6)" />
  <ellipse cx="7.4" cy="16.6" rx="1.5" ry="3" transform="rotate(-45 7.4 16.6)" />
  <ellipse cx="16.6" cy="7.4" rx="1.5" ry="3" transform="rotate(-45 16.6 7.4)" />
</>);

/* ── 33. Immune System ────────────────────────────────────────────────────── */
export const IconImmune = makeIcon("IconImmune", <>
  <path d="M12 2l7 3v5c0 5-3 9-7 11C8 19 5 15 5 10V5l7-3z" />
  <path d="M12 8v4M10 10h4" />
</>);

/* ── 34. Weight Loss / Metabolism ─────────────────────────────────────────── */
export const IconWeightLoss = makeIcon("IconWeightLoss", <>
  <circle cx="12" cy="6" r="3" />
  <path d="M9 10l-2 11h10l-2-11" />
  <path d="M9 17l3 2 3-2" />
  <path d="M12 15.5v2" strokeWidth="2.2" />
</>);

/* ── 35. Nutrition / Diet ─────────────────────────────────────────────────── */
export const IconNutrition = makeIcon("IconNutrition", <>
  <path d="M12 4C7.5 4 4 8 4 12.5S7.5 21 12 21s8-4 8-8.5S16.5 4 12 4z" />
  <path d="M14 2.5c-1 1.5-2.5 1.5-2 1" />
  <line x1="12" y1="4" x2="12" y2="7" />
</>);

/* ── 36. Fitness / Exercise ───────────────────────────────────────────────── */
export const IconFitness = makeIcon("IconFitness", <>
  <line x1="6.5" y1="12" x2="17.5" y2="12" />
  <rect x="2" y="9.5" width="4.5" height="5" rx="2" />
  <rect x="17.5" y="9.5" width="4.5" height="5" rx="2" />
  <rect x="5" y="11" width="2" height="2" rx="1" />
  <rect x="17" y="11" width="2" height="2" rx="1" />
</>);

/* ── 37. Hydration / Water ────────────────────────────────────────────────── */
export const IconHydration = makeIcon("IconHydration", <>
  <path d="M12 3C8.5 8.5 5 12 5 15.5a7 7 0 0014 0C19 12 15.5 8.5 12 3z" />
  <path d="M9.5 16.5a3.5 3.5 0 005 0" />
</>);

/* ── 38. Mobility Aids / Wheelchair ──────────────────────────────────────── */
export const IconMobility = makeIcon("IconMobility", <>
  <circle cx="12" cy="4.5" r="2" />
  <path d="M11 7.5L9 15h6l2 5.5" />
  <circle cx="11" cy="21" r="2.5" />
  <path d="M15 15h4" />
</>);

/* ── 39. Medical Devices / ECG Monitor ───────────────────────────────────── */
export const IconDevices = makeIcon("IconDevices", <>
  <rect x="2" y="7" width="20" height="13" rx="2" />
  <path d="M6 12h2l2-4 2 8 1.5-5 1 2h3" />
  <path d="M8 4h8M10 4v3M14 4v3" />
</>);

/* ── 40. Chronic Care / Long-term Medication ─────────────────────────────── */
export const IconChronicCare = makeIcon("IconChronicCare", <>
  <rect x="3" y="4" width="18" height="18" rx="2" />
  <path d="M16 2v4M8 2v4M3 10h18" />
  <circle cx="15.5" cy="15.5" r="2" />
  <path d="M8 14h4M8 17h5" />
</>);

/* ── 41. Supplements / Vitamins Bottle ───────────────────────────────────── */
export const IconSupplements = makeIcon("IconSupplements", <>
  <path d="M9 2h6l1.5 4H7.5L9 2z" />
  <rect x="6" y="6" width="12" height="16" rx="2" />
  <path d="M10 11h4M12 9v6" />
  <path d="M9 17c.5-.5 1.5-.5 3 .5" />
</>);

/* ── 42. Reproductive / Uterus ────────────────────────────────────────────── */
export const IconReproductive = makeIcon("IconReproductive", <>
  <path d="M12 12V21" />
  <ellipse cx="12" cy="9" rx="4" ry="5" />
  <path d="M8 14.5c-1.5 1-2.5 2.5-2.5 4" />
  <path d="M16 14.5c1.5 1 2.5 2.5 2.5 4" />
  <circle cx="7" cy="20" r="1.5" />
  <circle cx="17" cy="20" r="1.5" />
</>);

/* ── 43. Thyroid ──────────────────────────────────────────────────────────── */
export const IconThyroid = makeIcon("IconThyroid", <>
  <ellipse cx="8" cy="12" rx="4.5" ry="6" />
  <ellipse cx="16" cy="12" rx="4.5" ry="6" />
  <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
</>);

/* ── 44. Cancer Care / Oncology ───────────────────────────────────────────── */
export const IconCancerCare = makeIcon("IconCancerCare", <>
  <path d="M12 4c-1.2 0-2 .8-2 2v2L7 13c-1 2-.5 4 1 5s3.5.5 4.5-1L12 17l-.5 1c-1 1.5-.5 3.5 1 4.5s3.5 0 4-2l4-10C22 9 21 7 19.5 7S17 8 16.5 9l-2.5-3V6c0-1.2-.8-2-2-2z" />
</>);

/* ── 45. Pharmacy / Mortar & Pestle ──────────────────────────────────────── */
export const IconPharmacy = makeIcon("IconPharmacy", <>
  <ellipse cx="12" cy="17" rx="7" ry="4" />
  <path d="M5 17l-1.5-8h17L19 17" />
  <path d="M14 9c1-2.5 3-3.5 4.5-3.5" />
  <line x1="17" y1="4.5" x2="19.5" y2="3" strokeWidth="2.2" />
</>);

/* ── 46. Infectious Disease / Antiviral ───────────────────────────────────── */
export const IconInfectious = makeIcon("IconInfectious", <>
  <circle cx="12" cy="12" r="4" />
  <path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21M5.64 5.64l2.5 2.5M15.86 15.86l2.5 2.5M5.64 18.36l2.5-2.5M15.86 8.14l2.5-2.5" />
  <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
</>);

/* ── 47. Neurology / Brain ────────────────────────────────────────────────── */
export const IconNeurology = makeIcon("IconNeurology", <>
  <path d="M9 3c-1 .5-2 2-2 4 0 1 .3 2 1 2.5" />
  <path d="M15 3c1 .5 2 2 2 4 0 1-.3 2-1 2.5" />
  <path d="M7 9.5c-1.5.5-3 2-3 4 0 2 1.5 3.5 3.5 3.5" />
  <path d="M17 9.5c1.5.5 3 2 3 4 0 2-1.5 3.5-3.5 3.5" />
  <path d="M7.5 17C8 19 10 21 12 21s4-2 4.5-4" />
  <path d="M9 3c.5 1 2.5 3 3 5M15 3c-.5 1-2.5 3-3 5" />
  <path d="M12 8v4" />
</>);

/* ── 48. Dermatology / Skin Conditions ───────────────────────────────────── */
export const IconDermatology = makeIcon("IconDermatology", <>
  <path d="M3 12a9 9 0 1018 0 9 9 0 00-18 0z" />
  <circle cx="12" cy="9" r="1.2" fill="currentColor" stroke="none" />
  <circle cx="9" cy="13" r="1.2" fill="currentColor" stroke="none" />
  <circle cx="15" cy="13" r="1.2" fill="currentColor" stroke="none" />
  <circle cx="12" cy="16" r="1.2" fill="currentColor" stroke="none" />
</>);

/* ── 49. Syringe / Injection ──────────────────────────────────────────────── */
export const IconSyringe = makeIcon("IconSyringe", <>
  <path d="M19 5l-2-2-2 2 2 2 2-2z" />
  <path d="M15 7L5 17M13 5l4 4" />
  <path d="M5 17l-2 2M3 19l1 1M5 17l1 1" />
  <path d="M11 11l-1 1M13 9l-1 1" />
  <line x1="7.5" y1="14.5" x2="9.5" y2="12.5" />
</>);

/* ── 50. Others / Miscellaneous ───────────────────────────────────────────── */
export const IconOthers = makeIcon("IconOthers", <>
  <circle cx="5" cy="5" r="1.5" fill="currentColor" stroke="none" />
  <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
  <circle cx="19" cy="5" r="1.5" fill="currentColor" stroke="none" />
  <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
  <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
  <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
  <circle cx="5" cy="19" r="1.5" fill="currentColor" stroke="none" />
  <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
  <circle cx="19" cy="19" r="1.5" fill="currentColor" stroke="none" />
</>);

/* ── Exported icon registry ───────────────────────────────────────────────── */
export const HEALTHCARE_CATEGORY_ICONS: CategoryIconDef[] = [
  /* Core clinical */
  { name: "general",         Icon: IconGeneral,         label: "General / All"          },
  { name: "first-aid",       Icon: IconFirstAid,        label: "First Aid"              },
  { name: "pain-relief",     Icon: IconPainRelief,      label: "Pain Relief"            },
  { name: "prescription",    Icon: IconPrescription,    label: "Prescription / Rx"      },
  { name: "syringe",         Icon: IconSyringe,         label: "Injection / Syringe"    },
  { name: "antibiotics",     Icon: IconAntibiotics,     label: "Antibiotics"            },
  { name: "infectious",      Icon: IconInfectious,      label: "Infectious Disease"     },
  { name: "immune",          Icon: IconImmune,          label: "Immune System"          },
  { name: "allergy",         Icon: IconAllergy,         label: "Allergy"                },
  { name: "chronic-care",    Icon: IconChronicCare,     label: "Chronic Care"           },
  { name: "devices",         Icon: IconDevices,         label: "Medical Devices"        },
  { name: "pharmacy",        Icon: IconPharmacy,        label: "Pharmacy"               },

  /* Vitamins & supplements */
  { name: "vitamins",        Icon: IconVitamins,        label: "Vitamins"               },
  { name: "supplements",     Icon: IconSupplements,     label: "Supplements Bottle"     },

  /* Symptoms & conditions */
  { name: "fever",           Icon: IconFever,           label: "Fever / Temperature"    },
  { name: "cold-flu",        Icon: IconColdFlu,         label: "Cold & Flu"             },
  { name: "wound-care",      Icon: IconWoundCare,       label: "Wound Care / Bandage"   },
  { name: "diabetes",        Icon: IconDiabetes,        label: "Diabetes"               },
  { name: "blood-pressure",  Icon: IconBloodPressure,   label: "Blood Pressure"         },
  { name: "weight-loss",     Icon: IconWeightLoss,      label: "Weight Loss"            },
  { name: "sleep",           Icon: IconSleep,           label: "Sleep & Rest"           },
  { name: "cancer-care",     Icon: IconCancerCare,      label: "Cancer Care"            },

  /* Body systems */
  { name: "heart-health",    Icon: IconHeartHealth,     label: "Heart Health"           },
  { name: "respiratory",     Icon: IconRespiratory,     label: "Respiratory / Lungs"    },
  { name: "digestive",       Icon: IconDigestive,       label: "Digestive Health"       },
  { name: "kidney",          Icon: IconKidney,          label: "Kidney Health"          },
  { name: "liver",           Icon: IconLiver,           label: "Liver Health"           },
  { name: "bone-joint",      Icon: IconBoneJoint,       label: "Bone & Joint"           },
  { name: "spine",           Icon: IconSpine,           label: "Spine / Back"           },
  { name: "neurology",       Icon: IconNeurology,       label: "Neurology"              },
  { name: "mental-health",   Icon: IconMentalHealth,    label: "Mental Health"          },
  { name: "thyroid",         Icon: IconThyroid,         label: "Thyroid"                },
  { name: "reproductive",    Icon: IconReproductive,    label: "Reproductive Health"    },

  /* Senses & external */
  { name: "eye-care",        Icon: IconEyeCare,         label: "Eye Care"               },
  { name: "ear-care",        Icon: IconEarCare,         label: "Ear Care"               },
  { name: "dental",          Icon: IconDental,          label: "Dental / Oral"          },
  { name: "skincare",        Icon: IconSkincare,        label: "Skincare"               },
  { name: "dermatology",     Icon: IconDermatology,     label: "Dermatology"            },
  { name: "hair-care",       Icon: IconHairCare,        label: "Hair Care"              },

  /* Gender & age */
  { name: "womens-health",   Icon: IconWomensHealth,    label: "Women's Health"         },
  { name: "mens-health",     Icon: IconMensHealth,      label: "Men's Health"           },
  { name: "sexual-health",   Icon: IconSexualHealth,    label: "Sexual Health"          },
  { name: "mother-baby",     Icon: IconMotherBaby,      label: "Mother & Baby"          },
  { name: "pediatrics",      Icon: IconPediatrics,      label: "Pediatrics"             },
  { name: "geriatric",       Icon: IconGeriatric,       label: "Geriatric Care"         },

  /* Lifestyle & wellness */
  { name: "nutrition",       Icon: IconNutrition,       label: "Nutrition"              },
  { name: "fitness",         Icon: IconFitness,         label: "Fitness"                },
  { name: "hydration",       Icon: IconHydration,       label: "Hydration"              },
  { name: "mobility",        Icon: IconMobility,        label: "Mobility Aids"          },

  /* Catch-all */
  { name: "others",          Icon: IconOthers,          label: "Others / Miscellaneous" },
];
