import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    template: "%s | FARUMASI Rider",
    default: "FARUMASI — Rider App",
  },
  description: "Manage your deliveries with FARUMASI",
  themeColor: "#1E9E68",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased bg-slate-50 min-h-screen">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
