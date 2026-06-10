import type { Metadata } from "next";

export const metadata: Metadata = { title: "Consult a Doctor" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
