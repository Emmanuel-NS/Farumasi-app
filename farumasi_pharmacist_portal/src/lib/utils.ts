import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { OrderStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-RW").format(value);
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-RW", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-RW", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready_for_pickup: "Ready",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  failed: "Failed",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-purple-100 text-purple-700",
  ready_for_pickup: "bg-cyan-100 text-cyan-700",
  out_for_delivery: "bg-indigo-100 text-indigo-700",
  delivered: "bg-farumasi-100 text-farumasi-700",
  cancelled: "bg-red-100 text-red-600",
  failed: "bg-red-200 text-red-700",
};

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  broadcast: "Broadcast",
  accepted: "Accepted",
  invoice_sent: "Invoice Sent",
  patient_confirmed: "Confirmed",
  rejected: "Rejected",
  expired: "Expired",
};

export const REQUEST_STATUS_COLORS: Record<string, string> = {
  broadcast: "bg-amber-100 text-amber-700",
  accepted: "bg-farumasi-100 text-farumasi-700",
  invoice_sent: "bg-blue-100 text-blue-700",
  patient_confirmed: "bg-farumasi-100 text-farumasi-700",
  rejected: "bg-red-100 text-red-600",
  expired: "bg-slate-100 text-slate-500",
};
