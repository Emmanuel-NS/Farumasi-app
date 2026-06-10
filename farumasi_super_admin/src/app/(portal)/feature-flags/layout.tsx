import type { Metadata } from "next";

export const metadata: Metadata = { title: "Feature Flags" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
