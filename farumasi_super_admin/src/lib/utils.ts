import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs));
}

export function formatRWF(amount: number): string {
  return `RWF ${amount.toLocaleString("en-RW")}`;
}

export function formatDate(dateStr: string): string {
  try { return format(parseISO(dateStr), "MMM d, yyyy"); } catch { return dateStr; }
}

export function formatDateTime(dateStr: string): string {
  try { return format(parseISO(dateStr), "MMM d, yyyy HH:mm"); } catch { return dateStr; }
}

export function timeAgo(dateStr: string): string {
  try { return formatDistanceToNow(parseISO(dateStr), { addSuffix: true }); } catch { return dateStr; }
}

export function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export function getRateColor(rate: number): string {
  if (rate >= 90) return "text-emerald-600";
  if (rate >= 75) return "text-amber-600";
  return "text-red-600";
}

export function userStatusColor(status: string): string {
  switch (status) {
    case "Active": return "bg-emerald-50 text-emerald-700";
    case "Pending Verification": return "bg-amber-50 text-amber-700";
    case "Restricted": return "bg-orange-50 text-orange-700";
    case "Suspended": return "bg-red-50 text-red-700";
    case "Archived": return "bg-slate-100 text-slate-500";
    default: return "bg-slate-100 text-slate-600";
  }
}

export function verificationStatusColor(status: string): string {
  switch (status) {
    case "Approved": return "bg-emerald-50 text-emerald-700";
    case "In Review": return "bg-blue-50 text-blue-700";
    case "Pending": return "bg-amber-50 text-amber-700";
    case "Rejected": return "bg-red-50 text-red-700";
    case "Suspended": return "bg-orange-50 text-orange-700";
    default: return "bg-slate-100 text-slate-600";
  }
}

export function requestStatusColor(status: string): string {
  switch (status) {
    case "Approved": return "bg-emerald-50 text-emerald-700";
    case "Under Review": return "bg-blue-50 text-blue-700";
    case "Submitted": return "bg-farumasi-50 text-farumasi-700";
    case "Draft": return "bg-slate-100 text-slate-600";
    case "Rejected": return "bg-red-50 text-red-700";
    case "Suspended": return "bg-orange-50 text-orange-700";
    case "Requires More Information": return "bg-amber-50 text-amber-700";
    default: return "bg-slate-100 text-slate-600";
  }
}

export function severityColor(severity: string): string {
  switch (severity) {
    case "Critical": return "bg-red-100 text-red-700";
    case "High": return "bg-orange-100 text-orange-700";
    case "Medium": return "bg-amber-100 text-amber-700";
    case "Low": return "bg-blue-100 text-blue-700";
    case "Info": return "bg-slate-100 text-slate-600";
    default: return "bg-slate-100 text-slate-600";
  }
}

export function orderStatusColor(status: string): string {
  switch (status) {
    case "Delivered": return "bg-emerald-50 text-emerald-700";
    case "Out for Delivery": return "bg-blue-50 text-blue-700";
    case "Processing": case "Ready": return "bg-farumasi-50 text-farumasi-700";
    case "Confirmed": return "bg-indigo-50 text-indigo-700";
    case "Pending": return "bg-amber-50 text-amber-700";
    case "Cancelled": case "Failed": return "bg-red-50 text-red-700";
    default: return "bg-slate-100 text-slate-600";
  }
}

export function withdrawalStatusColor(status: string): string {
  switch (status) {
    case "Processed": return "bg-emerald-50 text-emerald-700";
    case "Approved": return "bg-blue-50 text-blue-700";
    case "Under Review": return "bg-amber-50 text-amber-700";
    case "Pending": return "bg-slate-100 text-slate-600";
    case "Rejected": return "bg-red-50 text-red-700";
    default: return "bg-slate-100 text-slate-600";
  }
}

export function stockLevelColor(level: string): string {
  switch (level) {
    case "Good": case "Adequate": return "text-emerald-600";
    case "Low": return "text-amber-600";
    case "Critical": case "Out of Stock": return "text-red-600";
    default: return "text-slate-600";
  }
}
