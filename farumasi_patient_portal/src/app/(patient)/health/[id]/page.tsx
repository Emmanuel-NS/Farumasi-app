"use client";

import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";

export default function ArticleDetailPage() {
  const router = useRouter();

  // No health articles backend endpoint yet - show placeholder
  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#F9FAFB] text-slate-500">
      <BookOpen className="w-16 h-16 text-slate-200 mb-4" />
      <p className="font-medium">Health article content coming soon.</p>
      <button
        onClick={() => router.back()}
        className="mt-4 text-farumasi-600 font-medium text-sm hover:underline"
      >
        Back to Health
      </button>
    </div>
  );
}
