/**
 * Centralized environment-flag helpers for the Patient Portal.
 *
 * NEXT_PUBLIC_USE_MOCK=true  -> services should return seeded/local mock data
 * NEXT_PUBLIC_USE_MOCK=false -> services hit the real FastAPI backend (default)
 */
export function isMockMode(): boolean {
  return (process.env.NEXT_PUBLIC_USE_MOCK ?? "false").toLowerCase() === "true";
}

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
