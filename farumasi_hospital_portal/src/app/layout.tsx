import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Farumasi Hospital Portal",
  description: "FARUMASI — Hospital Administrative Control Center",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-slate-50">
        <NextTopLoader color="#1e9e68" showSpinner={false} height={3} />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}

