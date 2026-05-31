"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("farumasi_rider_token");
    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  return <>{children}</>;
}
