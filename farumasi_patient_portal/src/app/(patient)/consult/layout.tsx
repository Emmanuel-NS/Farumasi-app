import type { Metadata } from "next";

export const metadata: Metadata = { title: "Consult a Doctor" };

export default function ConsultLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
  );
}
