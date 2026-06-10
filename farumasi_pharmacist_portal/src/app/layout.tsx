import type { Metadata } from "next";
import { Inter } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    template: "%s | FARUMASI Pharmacist",
    default: "FARUMASI — Pharmacist Portal",
  },
  description: "Manage prescriptions, orders, inventory and health content for FARUMASI pharmacies",
  manifest: "/manifest.json",
  themeColor: "#1E9E68",
  appleWebApp: {
    capable: true,
    title: "FARUMASI Rx",
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        <NextTopLoader color="#1e9e68" showSpinner={false} height={3} />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
