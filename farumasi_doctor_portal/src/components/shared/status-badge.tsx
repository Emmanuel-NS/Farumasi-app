import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  label: string;
  className?: string;
  size?: "sm" | "md";
  dot?: boolean;
}

export function StatusBadge({ label, className, size = "sm", dot = false }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium rounded-full",
        size === "sm" ? "text-xs px-2.5 py-1" : "text-sm px-3 py-1",
        className
      )}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {label}
    </span>
  );
}
