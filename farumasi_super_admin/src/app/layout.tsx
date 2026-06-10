import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: {
    template: "%s | FARUMASI Admin",
    default: "FARUMASI Super Admin",
  },
  description: "FARUMASI Ecosystem Command Center",
  manifest: "/manifest.json",
  themeColor: "#1E9E68",
  appleWebApp: {
    capable: true,
    title: "FARUMASI Admin",
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}

