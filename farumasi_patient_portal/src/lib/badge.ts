/** Formats notification badge counts: 1–9 as-is, 10+ as "9+". */
export function formatNotificationBadge(count: number): string {
  if (count <= 0) return "";
  if (count > 9) return "9+";
  return String(count);
}
