import { api } from "@/lib/api";

let cachedClientId: string | null = null;

/** Web OAuth client ID from env or API public config (same as Flutter). */
export async function resolveGoogleClientId(): Promise<string | null> {
  const fromEnv = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  if (fromEnv) return fromEnv;
  if (cachedClientId) return cachedClientId;
  try {
    const { data } = await api.get<{
      oauth?: { google_web_client_id?: string | null };
    }>("/config/public");
    const id = data.oauth?.google_web_client_id?.trim();
    if (id) {
      cachedClientId = id;
      return id;
    }
  } catch {
    // API unreachable — button stays hidden
  }
  return null;
}

export function decodeGoogleCredential(credential: string): {
  email: string;
  name: string;
  sub: string;
} {
  const payload = credential.split(".")[1];
  if (!payload) throw new Error("Invalid Google credential");
  const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  const data = JSON.parse(json) as {
    email?: string;
    name?: string;
    given_name?: string;
    sub?: string;
  };
  const email = data.email?.trim();
  const sub = data.sub?.trim();
  if (!email || !sub) throw new Error("Google account is missing email");
  const name =
    data.name?.trim() ||
    data.given_name?.trim() ||
    email.split("@")[0];
  return { email, name, sub };
}
