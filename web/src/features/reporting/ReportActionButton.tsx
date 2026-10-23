import Link from "next/link";
import { type ReactNode } from "react";

type ReportActionButtonProps = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "utility";
  className?: string;
  type?: "button" | "submit" | "reset";
  /**
   * Schickt dasselbe Formular an eine andere Serveraktion.
   *
   * Gebraucht, wo zwei Handlungen auf DENSELBEN Feldern arbeiten - im Founder
   * Setup speichert ein Knopf die Notiz, der andere macht daraus einen
   * Vorschlag. Zwei Formulare haetten zwei Textfelder mit demselben Inhalt
   * bedeutet, und genau das war dort vorher das Problem.
   */
  formAction?: (formData: FormData) => void | Promise<void>;
  disabled?: boolean;
};

// `min-h-11`: 44 px. Gemessen am 01.10.2026 waren es 42 - knapp unter der
// Groesse, die man am Telefon zuverlaessig trifft.
const BASE_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-xl border px-[18px] py-2.5 text-[15px] font-semibold transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] cursor-pointer";

const VARIANT_CLASS: Record<NonNullable<ReportActionButtonProps["variant"]>, string> = {
  // Seit den Konzeptboards: Hauptknopf mit Verlauf und weisser Schrift, ruhige Knoepfe in Grau-Violett.
  primary:
    "border-transparent bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] text-white hover:opacity-90",
  secondary:
    "border-transparent bg-[#efeafd] text-[#4a2fb8] hover:bg-[#e4dcfb]",
  utility:
    "border-transparent bg-[#f1f0f7] text-[#0b1f3a] hover:bg-[#e9e7f4]",
};

export function ReportActionButton({
  children,
  href,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
  formAction,
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
    <button
      type={type}
      onClick={onClick}
      formAction={formAction}
      className={classes}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
