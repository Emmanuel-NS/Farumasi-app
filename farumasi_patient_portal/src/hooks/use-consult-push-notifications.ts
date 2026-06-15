"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { showFarumasiBrowserNotification } from "@/lib/browser-notifications";
import { useAuthStore } from "@/store/auth-store";

interface ApiConsultMessage {
  id: string;
  sender_id: string;
  content?: string;
  is_read?: boolean;
  attachment_type?: string | null;
  attachment_name?: string | null;
}

interface ApiConsultation {
  id: string;
  pharmacist_id: string;
  messages?: ApiConsultMessage[];
}

function messagePreview(m: ApiConsultMessage): string {
  const text = (m.content ?? "").trim();
  if (text) return text.length > 120 ? `${text.slice(0, 117)}…` : text;
  if (m.attachment_type === "image") return "Sent a photo";
  if (m.attachment_type === "product") return m.attachment_name ?? "Shared a product";
  if (m.attachment_name) return `Sent ${m.attachment_name}`;
  return "New message";
}

/**
 * Browser notifications for pharmacist consult replies — FARUMASI logo as icon.
 * Mirrors Flutter consult push behavior (not listed in the in-app notification feed).
 */
export function useConsultPushNotifications(): void {
  const pathname = usePathname();
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const isGuest = useAuthStore((s) => s.isGuest);
  const seenIds = useRef(new Set<string>());
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (!userId || isGuest) {
      seenIds.current.clear();
      bootstrapped.current = false;
      return;
    }
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    let cancelled = false;

    const poll = async () => {
      try {
        const { data } = await api.get<{ items?: ApiConsultation[] }>("/consultations/", {
          params: { limit: 50 },
        });
        if (cancelled) return;

        const onConsultPage =
          pathname === "/consult" || pathname.startsWith("/consult/");
        const tabVisible = document.visibilityState === "visible";

        for (const consult of data.items ?? []) {
          for (const m of consult.messages ?? []) {
            if (m.sender_id === userId || m.is_read) continue;

            if (!bootstrapped.current) {
              seenIds.current.add(m.id);
              continue;
            }
            if (seenIds.current.has(m.id)) continue;

            seenIds.current.add(m.id);

            // Skip popup when user is actively on the consult screen with tab focused.
            if (tabVisible && onConsultPage) continue;

            showFarumasiBrowserNotification(
              "Message from your pharmacist",
              messagePreview(m),
              {
                tag: `consult-${m.id}`,
                onClick: () => router.push("/consult"),
              },
            );
          }
        }
        bootstrapped.current = true;
      } catch {
        /* retry next tick */
      }
    };

    void poll();
    const id = window.setInterval(() => void poll(), 30_000);

    const onVis = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [userId, isGuest, pathname, router]);
}
