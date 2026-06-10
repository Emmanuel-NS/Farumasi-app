import type { Metadata } from "next";

export const metadata: Metadata = { title: "Business Intelligence" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
