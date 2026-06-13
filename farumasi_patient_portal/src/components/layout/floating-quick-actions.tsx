"use client";

import { usePathname, useRouter } from "next/navigation";
import { ShoppingCart, FileUp } from "lucide-react";
import { useCartLineCount } from "@/store/cart-store";
import { useAuthStore } from "@/store/auth-store";
import { useTranslation } from "@/lib/translations";

interface FloatingQuickActionsProps {
  onCartClick: () => void;
}

export function FloatingQuickActions({ onCartClick }: FloatingQuickActionsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslation();
  const cartCount = useCartLineCount();
  const isGuest = useAuthStore((s) => s.isGuest);

  if (pathname.startsWith("/auth") || pathname === "/cart") {
    return null;
  }

  const handleUploadRx = () => {
    if (isGuest) {
      router.push("/auth/login");
      return;
    }
    router.push("/prescriptions?tab=upload");
  };

  return (
    <div
      className="fixed z-40 flex flex-col items-center gap-3 pointer-events-none"
      style={{
        bottom: "max(1.25rem, env(safe-area-inset-bottom))",
        right: "max(1rem, env(safe-area-inset-right))",
      }}
      aria-label="Quick actions"
    >
      <button
        type="button"
        onClick={handleUploadRx}
        className="pointer-events-auto w-[58px] h-[58px] sm:w-14 sm:h-14 rounded-full bg-blue-600 shadow-[0_4px_14px_rgba(37,99,235,0.35)] flex flex-col items-center justify-center gap-0.5 hover:bg-blue-700 active:scale-95 transition-all"
        title={t.nav_upload_rx}
        aria-label={t.nav_upload_rx}
      >
        <FileUp className="w-5 h-5 text-white" />
        <span className="text-[8px] font-bold text-white leading-none">Rx</span>
      </button>

      <button
        type="button"
        onClick={onCartClick}
        className="pointer-events-auto relative w-[58px] h-[58px] sm:w-14 sm:h-14 rounded-full bg-farumasi-600 shadow-[0_4px_14px_rgba(30,158,104,0.35)] flex items-center justify-center hover:bg-farumasi-700 active:scale-95 transition-all"
        title={t.nav_cart}
        aria-label={t.nav_cart}
      >
        <ShoppingCart className="w-6 h-6 text-white" />
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#F6F8FB]">
            {cartCount > 99 ? "99+" : cartCount}
          </span>
        )}
      </button>
    </div>
  );
}
