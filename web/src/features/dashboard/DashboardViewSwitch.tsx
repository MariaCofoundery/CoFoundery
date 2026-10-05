"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { WorkContext } from "@/features/navigation/workContext";

type DashboardViewSwitchProps = {
  activeView: WorkContext;
  hasFounder: boolean;
  hasAdvisor: boolean;
  /**
   * Merkt sich den gewaehlten Arbeitskontext (siehe workContext.ts). Reine
   * Darstellung: Die Links fuehren auf dieselben Seiten wie vorher, und jede
   * dieser Seiten prueft ihren Zugang selbst.
   */
  onSelect?: (view: WorkContext) => void;
  compact?: boolean;
};

function linkClassName(active: boolean, compact: boolean) {
  // compact: im Kopf am Rechner - dort ist der Wechsel ein Werkzeug neben
  // anderen, nicht die Hauptnavigation, und darf diese nicht verdraengen.
  return `whitespace-nowrap rounded-full font-medium transition ${compact ? "px-2.5 py-1 text-[13px]" : "px-3 py-1.5 text-sm"} ${
    active
      ? "bg-[color:var(--brand-primary)] text-slate-900 shadow-[0_8px_18px_rgba(103,232,249,0.22)]"
      : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
  }`;
}

export function DashboardViewSwitch({
  activeView,
  hasFounder,
  hasAdvisor,
  onSelect,
  compact = false,
}: DashboardViewSwitchProps) {
  const t = useTranslations("navigation");

  if (!(hasFounder && hasAdvisor)) {
    return null;
  }

  return (
    <nav
      aria-label={t("viewSwitchLabel")}
      className={`inline-flex shrink-0 items-center rounded-full border border-slate-200/80 bg-slate-100/85 ${compact ? "gap-0.5 p-0.5" : "gap-1 p-1"}`}
    >
      <Link
        href="/dashboard"
        aria-current={activeView === "founder" ? "true" : undefined}
        onClick={() => onSelect?.("founder")}
        className={linkClassName(activeView === "founder", compact)}
      >
        {t("viewFounder")}
      </Link>
      <Link
        href="/advisor/dashboard"
        aria-current={activeView === "advisor" ? "true" : undefined}
        onClick={() => onSelect?.("advisor")}
        className={linkClassName(activeView === "advisor", compact)}
      >
        {t("viewAdvisor")}
      </Link>
    </nav>
  );
}
