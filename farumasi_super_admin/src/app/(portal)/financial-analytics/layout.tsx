import type { Metadata } from "next";

export const metadata: Metadata = { title: "Financial Analytics" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
