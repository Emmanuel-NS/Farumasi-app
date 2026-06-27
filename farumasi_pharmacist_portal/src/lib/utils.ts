import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { OrderStatus } from "@/types";
import {
  formatDate as formatDateFromApi,
  formatDateTime as formatDateTimeFromApi,
  parseApiDateTime,
  timeAgo as timeAgoFromApi,
  timeAgoLabel as timeAgoLabelFromApi,
} from "@/lib/datetime";

export { parseApiDateTime } from "@/lib/datetime";

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

export function formatPriceRange(min: number, max: number): string {
  const fmt = (n: number) => new Intl.NumberFormat("en-RW").format(n);
  return min === max ? `RWF ${fmt(min)}` : `RWF ${fmt(min)} – ${fmt(max)}`;
}

export function timeAgo(dateStr: string, nowMs?: number): string {
  return timeAgoFromApi(dateStr, nowMs);
}

export function timeAgoLabel(dateStr: string, nowMs?: number): string {
  return timeAgoLabelFromApi(dateStr, nowMs);
}

export function formatDate(dateStr: string): string {
  return formatDateFromApi(dateStr);
}

export function formatDateTime(dateStr: string): string {
  return formatDateTimeFromApi(dateStr);
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
