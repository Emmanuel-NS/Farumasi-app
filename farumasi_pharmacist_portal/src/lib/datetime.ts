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

export function timeAgo(dateStr: string): string {
  const d = parseApiDateTime(dateStr);
  if (!d) return "";

  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function formatDate(dateStr: string): string {
  const d = parseApiDateTime(dateStr);
  if (!d) return "";
  return d.toLocaleDateString("en-RW", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(dateStr: string): string {
  const d = parseApiDateTime(dateStr);
  if (!d) return "";
  return d.toLocaleString("en-RW", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
