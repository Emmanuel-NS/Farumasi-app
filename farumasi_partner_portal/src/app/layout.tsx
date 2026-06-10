import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import NextTopLoader from "nextjs-toploader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: "%s | FARUMASI Partner",
    default: "FARUMASI Partner Portal",
  },
  description: "Pharmacy and partner companies management portal — FARUMASI Rwanda",
  manifest: "/manifest.json",
  themeColor: "#1E9E68",
  appleWebApp: {
    capable: true,
    title: "FARUMASI Partner",
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NextTopLoader color="#1E9E68" height={3} showSpinner={false} shadow="0 0 10px #1E9E68,0 0 5px #1E9E68" />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
