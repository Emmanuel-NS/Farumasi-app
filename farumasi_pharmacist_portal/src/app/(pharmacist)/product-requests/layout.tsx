import type { Metadata } from "next";

export const metadata: Metadata = { title: "Product Requests" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
