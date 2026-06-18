import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: {
    template: "%s | FARUMASI Rider",
    default: "FARUMASI — Rider App",
  },
  description: "Accept deliveries, navigate pickups, and confirm drop-offs for FARUMASI",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "FARUMASI Rider",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
    shortcut: "/favicon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1E9E68",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased bg-slate-50 min-h-screen">
        <PwaRegister />
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
