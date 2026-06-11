/** Short-lived in-memory cache to avoid duplicate GETs during navigation. */
const store = new Map<string, { expires: number; value: unknown }>();

export function cacheGet<T>(key: string): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    store.delete(key);
    return null;
  }
  return hit.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expires: Date.now() + ttlMs });
}

export async function cacheThrough<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const cached = cacheGet<T>(key);
  if (cached != null) return cached;
  const value = await loader();
  cacheSet(key, value, ttlMs);
  return value;
}
