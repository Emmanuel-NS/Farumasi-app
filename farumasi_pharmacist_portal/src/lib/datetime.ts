/**
 * Parse timestamps from the FARUMASI API for display in the user's local timezone.
 */
export function parseApiDateTime(
  value: Date | string | null | undefined,
): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  if (/[zZ]$/.test(raw) || /[+-]\d{2}:\d{2}$/.test(raw)) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const normalized = raw.includes("T") ? `${raw}Z` : `${raw}T00:00:00Z`;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function timeAgoShort(dateStr: string, nowMs: number = Date.now()): string {
  const d = parseApiDateTime(dateStr);
  if (!d) return "";

  const diff = nowMs - d.getTime();
  if (diff < 0) return "just now";
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  return `${Math.floor(days / 30)}mo`;
}

export function timeAgo(dateStr: string, nowMs: number = Date.now()): string {
  const short = timeAgoShort(dateStr, nowMs);
  if (!short || short === "just now") return "just now";
  return `${short} ago`;
}

/** Relative time with trailing "ago" for prose, e.g. "2h ago". */
export function timeAgoLabel(dateStr: string, nowMs: number = Date.now()): string {
  return timeAgo(dateStr, nowMs);
}

export function formatDate(dateStr: string): string {
  const d = parseApiDateTime(dateStr);
  if (!d) return "";
  return d.toLocaleDateString("en-RW", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(dateStr: string): string {
  const d = parseApiDateTime(dateStr);
  if (!d) return "";
  return d.toLocaleString("en-RW", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
