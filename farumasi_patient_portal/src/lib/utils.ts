import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  formatDateLocal,
  formatDateTimeLocal,
  parseApiDateTime,
  timeAgo as timeAgoFromApi,
} from "@/lib/datetime";

export { formatDateLocal, formatDateTimeLocal, parseApiDateTime } from "@/lib/datetime";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function formatPrice(amount: number, currency = "RWF"): string {
  return `${currency} ${amount.toLocaleString()}`;
}

export function timeAgo(date: Date | string): string {
  return timeAgoFromApi(date);
}

export function formatDate(date: Date | string): string {
  return formatDateLocal(date);
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_review: "Pending Review",
  finding_pharmacy: "Finding Pharmacy",
  pharmacy_accepted: "Pharmacy Accepted",
  payment_pending: "Payment Pending",
  ready_for_pickup: "Ready for Pickup",
  driver_assigned: "Driver Assigned",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending_review: "bg-amber-100 text-amber-700",
  finding_pharmacy: "bg-blue-100 text-blue-700",
  pharmacy_accepted: "bg-teal-100 text-teal-700",
  payment_pending: "bg-orange-100 text-orange-700",
  ready_for_pickup: "bg-purple-100 text-purple-700",
  driver_assigned: "bg-indigo-100 text-indigo-700",
  out_for_delivery: "bg-orange-100 text-orange-700",
  delivered: "bg-farumasi-100 text-farumasi-700",
  cancelled: "bg-red-100 text-red-700",
};
