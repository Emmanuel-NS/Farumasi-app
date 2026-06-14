import type { Metadata } from "next";

export const metadata: Metadata = { title: "Consult a Doctor" };

export default function ConsultLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">{children}</div>
  );
}
