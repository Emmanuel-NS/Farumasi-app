import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format, parseISO, differenceInDays } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs));
}

// ─── Formatters ───────────────────────────────────────────────────────────────
export function formatRWF(amount: number): string {
  return new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency: "RWF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-RW").format(n);
}

export function formatPercent(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}

export function formatDate(iso: string): string {
  try {
    return format(parseISO(iso), "dd MMM yyyy");
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string): string {
  try {
    return format(parseISO(iso), "dd MMM yyyy HH:mm");
  } catch {
    return iso;
  }
}

export function timeAgo(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

export function daysUntil(iso: string): number {
  try {
    return differenceInDays(parseISO(iso), new Date());
  } catch {
    return 0;
  }
}

// ─── Initials ─────────────────────────────────────────────────────────────────
export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// ─── Status helpers ───────────────────────────────────────────────────────────
export function doctorStatusColor(status: string): string {
  const map: Record<string, string> = {
    Active: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    "Pending Verification": "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    Restricted: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    Suspended: "bg-red-50 text-red-700 ring-1 ring-red-200",
    Archived: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
  };
  return map[status] ?? "bg-slate-100 text-slate-500";
}

export function prescriptionStatusColor(status: string): string {
  const map: Record<string, string> = {
    Fulfilled: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    Sent: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    Pending: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    "Partially Fulfilled": "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    Failed: "bg-red-50 text-red-700 ring-1 ring-red-200",
    Expired: "bg-slate-100 text-slate-400 ring-1 ring-slate-200",
  };
  return map[status] ?? "bg-slate-100 text-slate-500";
}

export function fulfillmentStatusColor(status: string): string {
  const map: Record<string, string> = {
    Fulfilled: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    "Partially Fulfilled": "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    Failed: "bg-red-50 text-red-700 ring-1 ring-red-200",
    Pending: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    Cancelled: "bg-slate-100 text-slate-400 ring-1 ring-slate-200",
  };
  return map[status] ?? "bg-slate-100 text-slate-500";
}

export function severityColor(severity: string): string {
  const map: Record<string, string> = {
    Critical: "bg-red-50 text-red-700 ring-1 ring-red-200",
    High: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    Medium: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    Low: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    Warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    Info: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    Success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  };
  return map[severity] ?? "bg-slate-100 text-slate-500";
}

export function complianceStatusColor(status: string): string {
  const map: Record<string, string> = {
    Compliant: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    Pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    "Non-Compliant": "bg-red-50 text-red-700 ring-1 ring-red-200",
    Expired: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
  };
  return map[status] ?? "bg-slate-100 text-slate-500";
}

export function referralStatusColor(status: string): string {
  const map: Record<string, string> = {
    Pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    Accepted: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    Completed: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    Cancelled: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
    Rejected: "bg-red-50 text-red-700 ring-1 ring-red-200",
  };
  return map[status] ?? "bg-slate-100 text-slate-500";
}

export function priorityColor(priority: string): string {
  const map: Record<string, string> = {
    Urgent: "bg-red-50 text-red-700 ring-1 ring-red-200",
    High: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    Normal: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    Low: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
  };
  return map[priority] ?? "bg-slate-100 text-slate-500";
}

export function stockLevelColor(level: string): string {
  const map: Record<string, string> = {
    Good: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    Low: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    Critical: "bg-red-50 text-red-700 ring-1 ring-red-200",
  };
  return map[level] ?? "bg-slate-100 text-slate-500";
}

export function notificationTypeIcon(type: string): string {
  const map: Record<string, string> = {
    Alert: "🔴",
    Warning: "🟡",
    Info: "🔵",
    Success: "🟢",
  };
  return map[type] ?? "⚪";
}

// ─── Calculations ─────────────────────────────────────────────────────────────
export function calcRate(fulfilled: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((fulfilled / total) * 1000) / 10;
}

export function getRateColor(rate: number): string {
  if (rate >= 95) return "text-emerald-600";
  if (rate >= 85) return "text-amber-600";
  return "text-red-600";
}

export function getRateBarColor(rate: number): string {
  if (rate >= 95) return "bg-emerald-500";
  if (rate >= 85) return "bg-amber-500";
  return "bg-red-500";
}

// ─── Search helper ────────────────────────────────────────────────────────────
export function matchesSearch(obj: Record<string, unknown>, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  return Object.values(obj).some((v) => {
    if (typeof v === "string") return v.toLowerCase().includes(q);
    if (typeof v === "number") return String(v).includes(q);
    return false;
  });
}
