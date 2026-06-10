import type { Metadata } from "next";

export const metadata: Metadata = { title: "Product Catalogue" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
