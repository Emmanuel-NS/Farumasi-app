import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { InsuranceProvider, PrescriptionStatus, FulfillmentStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Currency ──────────────────────────────────────────────────────────────────
export function formatRWF(amount: number): string {
  return new Intl.NumberFormat("rw-RW", {
    style: "currency",
    currency: "RWF",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactRWF(amount: number): string {
  if (amount >= 1_000_000) return `RWF ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `RWF ${(amount / 1_000).toFixed(0)}K`;
  return `RWF ${amount}`;
}

// ── Date ──────────────────────────────────────────────────────────────────────
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-RW", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-RW", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ── Status colours ────────────────────────────────────────────────────────────
export function getPrescriptionStatusColor(status: PrescriptionStatus): string {
  switch (status) {
    case "Draft":               return "bg-slate-100 text-slate-700";
    case "Pending":             return "bg-amber-100 text-amber-700";
    case "Sent":                return "bg-blue-100 text-blue-700";
    case "PartiallyFulfilled":  return "bg-orange-100 text-orange-700";
    case "Fulfilled":           return "bg-green-100 text-green-700";
    case "Expired":             return "bg-red-100 text-red-700";
    case "Cancelled":           return "bg-gray-100 text-gray-600";
    default:                    return "bg-gray-100 text-gray-600";
  }
}

export function getFulfillmentStatusColor(status: FulfillmentStatus): string {
  switch (status) {
    case "Pending":             return "bg-amber-100 text-amber-700";
    case "Dispatched":          return "bg-blue-100 text-blue-700";
    case "PartiallyFulfilled":  return "bg-orange-100 text-orange-700";
    case "Fulfilled":           return "bg-green-100 text-green-700";
    case "Substituted":         return "bg-purple-100 text-purple-700";
    case "Failed":              return "bg-red-100 text-red-700";
    default:                    return "bg-gray-100 text-gray-600";
  }
}

export function getInsuranceBadgeColor(provider: InsuranceProvider): string {
  switch (provider) {
    case "RSSB":    return "bg-green-100 text-green-800";
    case "MMI":     return "bg-blue-100 text-blue-800";
    case "RAMA":    return "bg-purple-100 text-purple-800";
    case "Radiant": return "bg-teal-100 text-teal-800";
    case "Britam":  return "bg-indigo-100 text-indigo-800";
    case "UAP":     return "bg-cyan-100 text-cyan-800";
    case "NONE":    return "bg-gray-100 text-gray-600";
    default:        return "bg-gray-100 text-gray-600";
  }
}

// ── AI Scoring ────────────────────────────────────────────────────────────────
export function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-amber-600";
  if (score >= 40) return "text-orange-600";
  return "text-red-600";
}

export function getScoreBgColor(score: number): string {
  if (score >= 80) return "bg-green-100 text-green-700";
  if (score >= 60) return "bg-amber-100 text-amber-700";
  if (score >= 40) return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

export function getStockColor(level: "High" | "Medium" | "Low" | "Out"): string {
  switch (level) {
    case "High":   return "text-green-600";
    case "Medium": return "text-amber-600";
    case "Low":    return "text-orange-600";
    case "Out":    return "text-red-600";
  }
}

export function getStockBg(level: "High" | "Medium" | "Low" | "Out"): string {
  switch (level) {
    case "High":   return "bg-green-100 text-green-700";
    case "Medium": return "bg-amber-100 text-amber-700";
    case "Low":    return "bg-orange-100 text-orange-700";
    case "Out":    return "bg-red-100 text-red-700";
  }
}

// ── Initials ──────────────────────────────────────────────────────────────────
export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// ── Prescription number generator ────────────────────────────────────────────
export function generatePrescriptionNumber(): string {
  const year = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 90000) + 10000;
  return `RX-${year}-${seq.toString().padStart(5, "0")}`;
}
