import type { Metadata } from "next";
import { Inter } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "FARUMASI Doctor Portal",
  description: "Clinical workflow platform for healthcare professionals",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <NextTopLoader
          color="#1e9e68"
          height={3}
          showSpinner={false}
          shadow="0 0 10px #1e9e68, 0 0 5px #1e9e68"
        />
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
