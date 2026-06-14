import type { BackendArticle } from "@/lib/mappers/articles.mapper";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const API_ORIGIN = API_BASE.replace(/\/api\/v\d+\/?$/, "");

export function absoluteMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (url.startsWith("/")) return `${API_ORIGIN}${url}`;
  return `${API_ORIGIN}/${url}`;
}

export function siteOrigin(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

/** Public article fetch for SEO / Open Graph (no auth). */
export async function fetchArticleMeta(idOrSlug: string): Promise<BackendArticle | null> {
  const slugPath = `${API_BASE}/articles/slug/${encodeURIComponent(idOrSlug)}`;
  const idPath = `${API_BASE}/articles/${encodeURIComponent(idOrSlug)}`;

  try {
    const bySlug = await fetch(slugPath, { next: { revalidate: 300 } });
    if (bySlug.ok) return (await bySlug.json()) as BackendArticle;
  } catch {
    /* try id */
  }

  try {
    const byId = await fetch(idPath, { next: { revalidate: 300 } });
    if (byId.ok) return (await byId.json()) as BackendArticle;
  } catch {
    /* not found */
  }

  return null;
}
