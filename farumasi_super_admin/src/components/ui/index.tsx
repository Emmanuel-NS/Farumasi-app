"use client";
import { cn } from "@/lib/utils";
import React from "react";

// ─── Button ───────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline" | "success";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
}
export function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...props }: ButtonProps) {
  const variants = {
    primary: "bg-farumasi-600 text-white hover:bg-farumasi-700 shadow-sm",
    secondary: "bg-farumasi-50 text-farumasi-700 hover:bg-farumasi-100",
    ghost: "text-slate-600 hover:bg-slate-100",
    destructive: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
    outline: "border border-slate-200 text-slate-700 hover:bg-slate-50 bg-white",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
  };
  const sizes = {
    xs: "text-[11px] px-2.5 py-1 rounded-md gap-1",
    sm: "text-xs px-3 py-1.5 rounded-lg gap-1.5",
    md: "text-sm px-4 py-2 rounded-lg gap-2",
    lg: "text-sm px-5 py-2.5 rounded-xl gap-2",
  };
  return (
    <button
      disabled={disabled || loading}
      className={cn("inline-flex items-center font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed", variants[variant], sizes[size], className)}
      {...props}
    >
      {loading && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ElementType;
  suffix?: React.ReactNode;
}
export function Input({ label, error, icon: Icon, suffix, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>}
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />}
        <input
          className={cn(
            "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white outline-none focus:ring-2 focus:ring-farumasi-600/30 focus:border-farumasi-600 transition-all",
            Icon && "pl-9",
            suffix && "pr-9",
            error && "border-red-400 focus:ring-red-400/30",
            className
          )}
          {...props}
        />
        {suffix && <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
interface CardProps extends React.HTMLAttributes<HTMLDivElement> { children: React.ReactNode; }
export function Card({ className, children, ...props }: CardProps) {
  return <div className={cn("bg-white rounded-xl border border-slate-100 shadow-sm", className)} {...props}>{children}</div>;
}
export function CardHeader({ className, children, ...props }: CardProps) {
  return <div className={cn("flex items-center justify-between px-5 py-4 border-b border-slate-100", className)} {...props}>{children}</div>;
}
export function CardTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={cn("text-sm font-semibold text-slate-900", className)}>{children}</h3>;
}
export function CardSubtitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <p className={cn("text-xs text-slate-500 mt-0.5", className)}>{children}</p>;
}
export function CardContent({ className, children, ...props }: CardProps) {
  return <div className={cn("p-5", className)} {...props}>{children}</div>;
}

// ─── Badge ────────────────────────────────────────────────────────────────────
interface BadgeProps { children: React.ReactNode; className?: string; variant?: "default" | "success" | "warning" | "error" | "info" | "purple" | "neutral"; }
export function Badge({ children, className, variant = "default" }: BadgeProps) {
  const variants = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    error: "bg-red-50 text-red-700",
    info: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
    neutral: "bg-slate-100 text-slate-500",
  };
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold", variants[variant], className)}>{children}</span>;
}

// ─── Table ────────────────────────────────────────────────────────────────────
export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("overflow-x-auto", className)}><table className="w-full text-sm">{children}</table></div>;
}
export function Thead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-slate-50 border-b border-slate-100">{children}</thead>;
}
export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap", className)}>{children}</th>;
}
export function Td({ children, className, colSpan }: { children: React.ReactNode; className?: string; colSpan?: number }) {
  return <td colSpan={colSpan} className={cn("px-4 py-3 text-slate-700 border-b border-slate-50 align-middle", className)}>{children}</td>;
}
export function Tr({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return <tr className={cn("hover:bg-slate-50/80 transition-colors", onClick && "cursor-pointer", className)} onClick={onClick}>{children}</tr>;
}

// ─── Empty State ──────────────────────────────────────────────────────────────
interface EmptyStateProps { icon: React.ElementType; title: string; description?: string; action?: React.ReactNode; }
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
        <Icon className="w-6 h-6 text-slate-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon?: React.ElementType;
  color?: string;
  bg?: string;
  sublabel?: string;
}
export function StatCard({ label, value, change, icon: Icon, color = "text-slate-900", bg = "bg-white", sublabel }: StatCardProps) {
  return (
    <Card className={cn(bg, "p-4")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 font-medium truncate">{label}</p>
          <p className={cn("text-2xl font-bold mt-1 leading-none", color)}>{value}</p>
          {sublabel && <p className="text-[11px] text-slate-400 mt-1">{sublabel}</p>}
        </div>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
            <Icon className={cn("w-4 h-4", color)} />
          </div>
        )}
      </div>
      {change !== undefined && (
        <div className={cn("flex items-center gap-1 mt-2 text-[11px] font-semibold", change >= 0 ? "text-emerald-600" : "text-red-500")}>
          <span>{change >= 0 ? "↑" : "↓"}</span>
          <span>{Math.abs(change)}% vs last period</span>
        </div>
      )}
    </Card>
  );
}

// ─── Page Header ──────────────────────────────────────────────────────────────
interface PageHeaderProps { title: string; subtitle?: string; children?: React.ReactNode; breadcrumb?: string; }
export function PageHeader({ title, subtitle, children, breadcrumb }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 pb-1">
      <div>
        {breadcrumb && <p className="text-xs text-slate-400 mb-1 font-medium">{breadcrumb}</p>}
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}

// ─── Search Input ─────────────────────────────────────────────────────────────
interface SearchInputProps { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; }
export function SearchInput({ value, onChange, placeholder = "Search...", className }: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" /></svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white outline-none focus:ring-2 focus:ring-farumasi-600/30 focus:border-farumasi-600 transition-all"
      />
    </div>
  );
}

// ─── Filter Tabs ──────────────────────────────────────────────────────────────
interface FilterTabsProps<T extends string> { options: T[]; value: T; onChange: (v: T) => void; counts?: Record<string, number>; }
export function FilterTabs<T extends string>({ options, value, onChange, counts }: FilterTabsProps<T>) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            "text-xs font-semibold px-3 py-1.5 rounded-full transition-colors whitespace-nowrap",
            value === opt ? "bg-farumasi-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          )}
        >
          {opt}{counts && counts[opt] !== undefined ? ` (${counts[opt]})` : ""}
        </button>
      ))}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
interface ModalProps { open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: "sm" | "md" | "lg"; }
export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  if (!open) return null;
  const sizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative bg-white rounded-2xl shadow-2xl w-full", sizes[size])}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Status Dot ───────────────────────────────────────────────────────────────
export function StatusDot({ status }: { status: string }) {
  const color = status === "Active" || status === "Connected" || status === "Approved" ? "bg-emerald-500"
    : status === "Pending" || status === "In Review" ? "bg-amber-500"
    : status === "Error" || status === "Rejected" || status === "Suspended" ? "bg-red-500"
    : "bg-slate-400";
  return <span className={cn("inline-block w-2 h-2 rounded-full shrink-0", color)} />;
}

// ─── Progress Bar ────────────────────────────────────────────────────────────
export function ProgressBar({ value, max = 100, color = "bg-farumasi-500", className }: { value: number; max?: number; color?: string; className?: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn("w-full h-1.5 bg-slate-100 rounded-full overflow-hidden", className)}>
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Select ──────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { label?: string; }
export function Select({ label, className, children, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>}
      <select className={cn("border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white outline-none focus:ring-2 focus:ring-farumasi-600/30 focus:border-farumasi-600 transition-all", className)} {...props}>
        {children}
      </select>
    </div>
  );
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────
export function Tooltip({ children, tip }: { children: React.ReactNode; tip: string }) {
  return (
    <div className="relative group inline-flex">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50">
        <div className="bg-slate-900 text-white text-[11px] rounded-lg px-2.5 py-1 whitespace-nowrap shadow-lg">{tip}</div>
      </div>
    </div>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
