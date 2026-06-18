"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bike, Wallet, LogOut } from "lucide-react";

export function RiderBottomNav() {
  const pathname = usePathname();
  const items = [
    { href: "/deliveries", label: "Deliveries", icon: Bike },
    { href: "/earnings", label: "Earnings", icon: Wallet },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 safe-area-pb">
      <div className="max-w-lg mx-auto flex justify-around">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 text-xs font-semibold ${
                active ? "text-farumasi-600" : "text-slate-400"
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem("farumasi_rider_token");
            localStorage.removeItem("farumasi_rider_refresh");
            localStorage.removeItem("farumasi_rider_user");
            window.location.href = "/login";
          }}
          className="flex flex-col items-center gap-0.5 px-4 py-1 text-xs font-semibold text-slate-400"
        >
          <LogOut className="w-5 h-5" />
          Sign out
        </button>
      </div>
    </nav>
  );
}
