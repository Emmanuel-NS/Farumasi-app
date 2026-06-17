import type { Metadata } from "next";
import { Inter } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "sonner";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: {
    template: "%s | FARUMASI",
    default: "FARUMASI — Patient Portal",
  },
  description: "Your trusted pharmacy and healthcare coordination platform",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "FARUMASI",
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <PwaRegister />
        <NextTopLoader color="#1e9e68" height={3} showSpinner={false} shadow="0 0 10px #1e9e68" />
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
