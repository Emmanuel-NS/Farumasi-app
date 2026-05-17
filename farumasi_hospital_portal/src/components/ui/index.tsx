import { cn } from "@/lib/utils";

// ─── Button ───────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline";
  size?: "sm" | "md" | "lg";
}

export function Button({ variant = "primary", size = "md", className, children, ...props }: ButtonProps) {
  const variants = {
    primary: "bg-farumasi-600 text-white hover:bg-farumasi-700 shadow-sm",
    secondary: "bg-farumasi-50 text-farumasi-700 hover:bg-farumasi-100",
    ghost: "text-slate-600 hover:bg-slate-100",
    destructive: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
    outline: "border border-slate-200 text-slate-700 hover:bg-slate-50",
  };
  const sizes = {
    sm: "text-xs px-3 py-1.5 rounded-lg gap-1.5",
    md: "text-sm px-4 py-2 rounded-lg gap-2",
    lg: "text-sm px-5 py-2.5 rounded-xl gap-2",
  };
  return (
    <button
      className={cn("inline-flex items-center font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed", variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ElementType;
}

export function Input({ label, error, icon: Icon, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
        <input
          className={cn(
            "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white outline-none focus:ring-2 focus:ring-farumasi-600/30 focus:border-farumasi-600 transition-all",
            Icon && "pl-9",
            error && "border-red-400 focus:ring-red-400/30",
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <select
        className={cn("border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white outline-none focus:ring-2 focus:ring-farumasi-600/30 focus:border-farumasi-600 transition-all", className)}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div className={cn("bg-white rounded-xl border border-slate-100 shadow-sm", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: CardProps) {
  return (
    <div className={cn("flex items-center justify-between px-5 py-4 border-b border-slate-100", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children }: CardProps) {
  return (
    <h3 className={cn("text-base font-semibold text-slate-900", className)}>
      {children}
    </h3>
  );
}

export function CardContent({ className, children }: CardProps) {
  return (
    <div className={cn("p-5", className)}>
      {children}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "success" | "warning" | "error" | "info";
}

export function Badge({ children, className, variant = "default" }: BadgeProps) {
  const variants = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    error: "bg-red-50 text-red-700",
    info: "bg-blue-50 text-blue-700",
  };
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", variants[variant], className)}>
      {children}
    </span>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, icon: Icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-slate-400" />
        </div>
      )}
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description && <p className="text-sm text-slate-400 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── Loading spinner ──────────────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("w-6 h-6 rounded-full border-2 border-farumasi-200 border-t-farumasi-600 animate-spin", className)} />
  );
}

// ─── Table components ─────────────────────────────────────────────────────────
export function Table({ children, className }: CardProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-slate-50 border-b border-slate-100">{children}</thead>;
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn("text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={cn("px-4 py-3 text-slate-700 border-b border-slate-50 align-middle", className)}>
      {children}
    </td>
  );
}

export function Tr({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <tr className={cn("hover:bg-slate-50 transition-colors", onClick && "cursor-pointer", className)} onClick={onClick}>
      {children}
    </tr>
  );
}
