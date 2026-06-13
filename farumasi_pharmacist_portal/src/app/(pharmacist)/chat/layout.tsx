import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Patient Chat" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-6 text-center text-slate-400 text-sm">Loading chat…</div>}>
      {children}
    </Suspense>
  );
}
