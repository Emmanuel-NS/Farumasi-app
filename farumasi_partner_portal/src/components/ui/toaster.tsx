"use client";

import { useEffect, useState } from "react";
import { toast as toastLib, type Toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";

const icons = {
  success: <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />,
  error: <XCircle className="w-4 h-4 shrink-0 text-red-500" />,
  info: <Info className="w-4 h-4 shrink-0 text-blue-500" />,
  warning: <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />,
};

const colors = {
  success: "bg-white border-emerald-200",
  error: "bg-white border-red-200",
  info: "bg-white border-blue-200",
  warning: "bg-white border-amber-200",
};

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsub = toastLib.subscribe(setToasts);
    return unsub;
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-start gap-3 rounded-xl border shadow-lg px-4 py-3 min-w-[280px] max-w-[380px]",
            "animate-fade-in",
            colors[t.type]
          )}
        >
          {icons[t.type]}
          <p className="text-sm text-foreground flex-1 leading-snug">{t.message}</p>
        </div>
      ))}
    </div>
  );
}
