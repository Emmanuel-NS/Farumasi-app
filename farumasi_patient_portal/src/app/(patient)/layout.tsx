"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { RightPanel } from "@/components/layout/right-panel";
import { FloatingQuickActions } from "@/components/layout/floating-quick-actions";
import { PatientRoleGuard } from "@/components/shared/patient-role-guard";
import { hydrateLanguage } from "@/store/language-store";
import { TranslationProvider } from "@/components/providers/translation-provider";
import { useAuthStore } from "@/store/auth-store";

const MOBILE_NAV_MQ = "(max-width: 639px)";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const hydrateAuth = useAuthStore((s) => s.hydrateAuth);
  const hydratedOnce = useRef(false);

  useEffect(() => setPortalReady(true), []);

  useEffect(() => {
    hydrateLanguage();
    if (hydratedOnce.current) return;
    hydratedOnce.current = true;
    hydrateAuth();
  }, [hydrateAuth]);

  const closePanel = useCallback(() => setActivePanel(null), []);

  // Close mobile drawer and side panels after navigation
  useEffect(() => {
    setMobileNavOpen(false);
    closePanel();
  }, [pathname, closePanel]);

  useEffect(() => {
    if (!mobileNavOpen && !activePanel) return;
    const isMobile = typeof window !== "undefined" && window.matchMedia(MOBILE_NAV_MQ).matches;
    if (!isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen, activePanel]);

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  const handleMenuToggle = useCallback(() => {
    if (typeof window !== "undefined" && window.matchMedia(MOBILE_NAV_MQ).matches) {
      setMobileNavOpen((open) => !open);
    } else {
      setCollapsed((c) => !c);
    }
  }, []);

  const togglePanel = (panel: string) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
    closeMobileNav();
  };

  const mobileNavPortal =
    portalReady && mobileNavOpen
      ? createPortal(
          <div
            className="fixed top-[72px] left-0 right-0 bottom-0 z-[100] sm:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Main navigation"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/45"
              aria-label="Close menu"
              onClick={closeMobileNav}
            />
            <aside className="absolute inset-y-0 left-0 z-10 w-[min(280px,88vw)] shadow-2xl">
              <Sidebar collapsed={false} onNavigate={closeMobileNav} />
            </aside>
          </div>,
          document.body,
        )
      : null;

  const isConsultPage =
    pathname === "/consult" || pathname.startsWith("/consult/");

  const mobilePanelPortal =
    portalReady && activePanel
      ? createPortal(
          <div
            className="fixed top-[72px] left-0 right-0 bottom-0 z-[100] sm:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Side panel"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/45"
              aria-label="Close panel"
              onClick={closePanel}
            />
            <RightPanel activePanel={activePanel} onClose={closePanel} overlay />
          </div>,
          document.body,
        )
      : null;

  return (
    <TranslationProvider>
    <PatientRoleGuard>
      <div className="flex flex-col h-screen overflow-hidden bg-farumasi-600">
        <Topbar
          collapsed={collapsed}
          mobileNavOpen={mobileNavOpen}
          onToggle={handleMenuToggle}
          onNotifClick={() => togglePanel("notifications")}
          onCartClick={() => togglePanel("cart")}
          onHelpClick={() => togglePanel("help")}
          activePanel={activePanel}
        />

        {mobileNavPortal}
        {mobilePanelPortal}

        <div
          className={cn(
            "flex flex-1 min-h-0 overflow-hidden",
            mobileNavOpen && "max-sm:pointer-events-none max-sm:touch-none",
          )}
        >
          {/* Desktop sidebar */}
          <div className="hidden sm:flex">
            <Sidebar collapsed={collapsed} />
            <div className="w-3.5 bg-farumasi-600 flex items-center justify-center cursor-col-resize shrink-0">
              <div className="h-9 w-1 rounded-full bg-white/30 flex flex-col justify-evenly items-center gap-1">
                <span className="block w-0.5 h-0.5 rounded-full bg-white" />
                <span className="block w-0.5 h-0.5 rounded-full bg-white" />
                <span className="block w-0.5 h-0.5 rounded-full bg-white" />
              </div>
            </div>
          </div>

          <div className={cn("flex flex-1 min-w-0 overflow-hidden", activePanel ? "sm:gap-3" : "")}>
            <main
              className={cn(
                "flex-1 min-w-0 overflow-y-auto scrollbar-hide bg-[#F6F8FB]",
                "rounded-tl-[20px] sm:rounded-tl-[32px]",
                isConsultPage
                  ? "flex flex-1 h-0 min-h-0 flex-col overflow-hidden pb-0"
                  : "pb-28 sm:pb-32",
                activePanel ? "sm:rounded-tr-[24px]" : "",
                mobileNavOpen && "max-sm:overflow-hidden",
              )}
            >
              {children}
            </main>

            {activePanel && (
              <div className="hidden sm:block shrink-0">
                <RightPanel activePanel={activePanel} onClose={closePanel} />
              </div>
            )}
          </div>
        </div>

        <FloatingQuickActions onCartClick={() => togglePanel("cart")} />
      </div>
    </PatientRoleGuard>
    </TranslationProvider>
  );
}
