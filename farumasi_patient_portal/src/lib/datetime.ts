/**
 * Parse timestamps from the FARUMASI API for display in the user's local timezone.
 *
 * - ISO strings with Z or ±offset are parsed as-is.
 * - Naive datetimes (no offset) are treated as UTC — matching PostgreSQL timestamptz / server storage.
 * - Date-only strings (YYYY-MM-DD) are midnight UTC.
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

export function timeAgo(date: Date | string, nowMs: number = Date.now()): string {
  const d = parseApiDateTime(date);
  if (!d) return "";

  const diff = nowMs - d.getTime();
  if (diff < 0) return "Just now";

  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;

  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;

  return formatDateLocal(d);
}

export function formatDateLocal(
  date: Date | string,
  locale = "en-RW",
): string {
  const d = parseApiDateTime(date);
  if (!d) return "";
  return d.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTimeLocal(
  date: Date | string,
  locale = "en-RW",
): string {
  const d = parseApiDateTime(date);
  if (!d) return "";
  return d.toLocaleString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTimeLocal(date: Date | string, locale = "en-RW"): string {
  const d = parseApiDateTime(date);
  if (!d) return "";
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}
