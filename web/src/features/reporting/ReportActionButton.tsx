import Link from "next/link";
import { type ReactNode } from "react";

type ReportActionButtonProps = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "utility";
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
};

const BASE_CLASS =
  "inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-medium transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] cursor-pointer";

const VARIANT_CLASS: Record<NonNullable<ReportActionButtonProps["variant"]>, string> = {
  primary:
    "border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] text-slate-900 hover:bg-[color:var(--brand-primary-hover)]",
  secondary:
    "border-[color:var(--brand-accent)] bg-[color:var(--brand-accent)] text-white hover:bg-[#6d28d9]",
  utility:
    "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
};

export function ReportActionButton({
  children,
  href,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
  disabled = false,
}: ReportActionButtonProps) {
  const disabledClass = disabled
    ? "pointer-events-none cursor-not-allowed opacity-50 hover:translate-y-0 hover:shadow-none"
    : "";
  const classes = `${BASE_CLASS} ${VARIANT_CLASS[variant]} ${disabledClass} ${className}`.trim();

  if (href) {
    return (
      <Link href={href} className={classes} aria-disabled={disabled}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes} disabled={disabled}>
      {children}
    </button>
  );
}
