import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
  colorClass?: string;
}

export function StatusBadge({ status, className, colorClass }: StatusBadgeProps) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold", colorClass, className)}>
      {status}
    </span>
  );
}
