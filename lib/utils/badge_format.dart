/// Formats notification badge counts: 1–9 as-is, 10+ as "9+".
String formatBadgeCount(int count) {
  if (count <= 0) return '';
  if (count > 9) return '9+';
  return '$count';
}
