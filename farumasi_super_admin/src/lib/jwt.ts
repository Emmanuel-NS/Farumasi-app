/** Decode JWT payload (base64url-safe for browser atob). */
export function decodeJwtPayload<T extends Record<string, unknown> = Record<string, unknown>>(
  token: string,
): T {
  const part = token.split(".")[1];
  if (!part) throw new Error("Invalid token");
  const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return JSON.parse(atob(padded)) as T;
}
