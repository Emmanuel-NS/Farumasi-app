import { cn } from "@/lib/utils";
import type { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";

// ── Button ────────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
}

const btnVariants = {
  primary:   "bg-farumasi-600 text-white hover:bg-farumasi-700 shadow-sm",
  secondary: "bg-farumasi-50 text-farumasi-700 hover:bg-farumasi-100 border border-farumasi-200",
  ghost:     "text-slate-600 hover:bg-slate-100",
  danger:    "bg-red-600 text-white hover:bg-red-700",
  outline:   "border border-slate-200 text-slate-700 hover:bg-slate-50",
};

const btnSizes = {
  sm: "text-xs px-3 py-1.5 gap-1.5",
  md: "text-sm px-4 py-2 gap-2",
  lg: "text-base px-5 py-2.5 gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  iconPosition = "left",
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
        btnVariants[variant],
        btnSizes[size],
        className
      )}
    >
      {loading && (
        <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {!loading && icon && iconPosition === "left" && icon}
      {children}
      {!loading && icon && iconPosition === "right" && icon}
    </button>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  wrapperClassName?: string;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  wrapperClassName,
  className,
  id,
  ...props
}: InputProps) {
  return (
    <div className={cn("flex flex-col gap-1", wrapperClassName)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
          {props.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          id={id}
          {...props}
          className={cn(
            "w-full rounded-lg border border-slate-200 bg-white text-sm text-slate-900",
            "px-3 py-2 placeholder:text-slate-400",
            "focus:outline-none focus:ring-2 focus:ring-farumasi-500 focus:border-transparent",
            "disabled:bg-slate-50 disabled:text-slate-500",
            leftIcon && "pl-9",
            rightIcon && "pr-9",
            error && "border-red-400 focus:ring-red-400",
            className
          )}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

// ── Textarea ──────────────────────────────────────────────────────────────────
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

export function Textarea({ label, error, hint, wrapperClassName, className, id, ...props }: TextareaProps) {
  return (
    <div className={cn("flex flex-col gap-1", wrapperClassName)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
          {props.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <textarea
        id={id}
        {...props}
        className={cn(
          "w-full rounded-lg border border-slate-200 bg-white text-sm text-slate-900",
          "px-3 py-2 placeholder:text-slate-400 resize-y min-h-[80px]",
          "focus:outline-none focus:ring-2 focus:ring-farumasi-500 focus:border-transparent",
          "disabled:bg-slate-50 disabled:text-slate-500",
          error && "border-red-400",
          className
        )}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────────────────────
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ label, error, hint, wrapperClassName, className, options, placeholder, id, ...props }: SelectProps) {
  return (
    <div className={cn("flex flex-col gap-1", wrapperClassName)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
          {props.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <select
        id={id}
        {...props}
        className={cn(
          "w-full rounded-lg border border-slate-200 bg-white text-sm text-slate-900",
          "px-3 py-2",
          "focus:outline-none focus:ring-2 focus:ring-farumasi-500 focus:border-transparent",
          "disabled:bg-slate-50",
          error && "border-red-400",
          className
        )}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg" | "none";
}

export function Card({ children, className, padding = "md" }: CardProps) {
  const pads = { sm: "p-4", md: "p-5", lg: "p-6", none: "" };
  return (
    <div className={cn("bg-white rounded-xl border border-slate-100 shadow-sm", pads[padding], className)}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 mb-4", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn("text-base font-semibold text-slate-800", className)}>{children}</h3>;
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-slate-100", className)} />;
}

// ── Empty State ───────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3">
      {icon && <div className="text-slate-300 mb-1">{icon}</div>}
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {description && <p className="text-sm text-slate-400 max-w-xs">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ── Warning Banner ────────────────────────────────────────────────────────────
interface WarningBannerProps {
  severity: "critical" | "warning" | "info" | "success";
  title: string;
  message?: string;
  icon?: ReactNode;
  className?: string;
}

const warningColors = {
  critical: "bg-red-50 border-red-200 text-red-800",
  warning:  "bg-amber-50 border-amber-200 text-amber-800",
  info:     "bg-blue-50 border-blue-200 text-blue-800",
  success:  "bg-green-50 border-green-200 text-green-800",
};

export function WarningBanner({ severity, title, message, icon, className }: WarningBannerProps) {
  return (
    <div className={cn("rounded-lg border px-4 py-3 flex gap-3", warningColors[severity], className)}>
      {icon && <div className="flex-shrink-0 mt-0.5">{icon}</div>}
      <div>
        <p className="text-sm font-medium">{title}</p>
        {message && <p className="text-xs mt-0.5 opacity-80">{message}</p>}
      </div>
    </div>
  );
}
