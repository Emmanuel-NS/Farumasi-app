import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { OrderStatus, ProductStatus, RequestStatus, WithdrawalStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"
).replace(/\/api\/v1\/?$/, "");

export function mediaUrl(path?: string | null): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export function orderDisplayCode(orderId: string, orderCode?: string | null): string {
  if (orderCode?.trim()) return orderCode.trim();
  return `FRM-${orderId.slice(0, 8).toUpperCase()}`;
}

export function formatRWF(amount: number): string {
  return new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency: "RWF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactRWF(amount: number): string {
  if (amount >= 1_000_000) return `RWF ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `RWF ${(amount / 1_000).toFixed(0)}K`;
  return `RWF ${amount}`;
}

export function formatDate(iso: string, short = false): string {
  return new Date(iso).toLocaleDateString("en-RW", {
    year: "numeric",
    month: short ? "short" : "long",
    day: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-RW", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const orderStatusConfig: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-blue-100 text-blue-700 border-blue-200" },
  accepted: { label: "Accepted", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200" },
  preparing: { label: "Preparing", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  ready_for_pickup: { label: "Ready for Pickup", color: "bg-teal-100 text-teal-700 border-teal-200" },
  out_for_delivery: { label: "Out for Delivery", color: "bg-orange-100 text-orange-700 border-orange-200" },
  delivered: { label: "Delivered", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700 border-green-200" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-600 border-gray-200" },
  failed: { label: "Failed", color: "bg-red-100 text-red-700 border-red-200" },
};

export const productStatusConfig: Record<ProductStatus, { label: string; color: string }> = {
  available: { label: "Available", color: "bg-green-100 text-green-700 border-green-200" },
  unavailable: { label: "Unavailable", color: "bg-gray-100 text-gray-600 border-gray-200" },
  low_stock: { label: "Low Stock", color: "bg-amber-100 text-amber-700 border-amber-200" },
  out_of_stock: { label: "Out of Stock", color: "bg-red-100 text-red-700 border-red-200" },
  suspended: { label: "Suspended", color: "bg-red-100 text-red-700 border-red-200" },
  pending_update: { label: "Pending Update", color: "bg-purple-100 text-purple-700 border-purple-200" },
};

export const requestStatusConfig: Record<RequestStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-600 border-gray-200" },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-700 border-blue-200" },
  under_review: { label: "Under Review", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  requires_info: { label: "Info Required", color: "bg-orange-100 text-orange-700 border-orange-200" },
  more_info_required: { label: "Info Required", color: "bg-orange-100 text-orange-700 border-orange-200" },
  approved: { label: "Approved", color: "bg-green-100 text-green-700 border-green-200" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200" },
};

export const withdrawalStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  approved: { label: "Approved", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  processing: { label: "Processing", color: "bg-blue-100 text-blue-700 border-blue-200" },
  paid: { label: "Paid", color: "bg-green-100 text-green-700 border-green-200" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700 border-green-200" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200" },
};
