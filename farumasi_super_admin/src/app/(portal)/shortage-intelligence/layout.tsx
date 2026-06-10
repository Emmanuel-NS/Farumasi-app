import type { Metadata } from "next";

export const metadata: Metadata = { title: "Shortage Intelligence" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
