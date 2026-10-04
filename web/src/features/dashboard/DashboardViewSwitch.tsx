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
};

function linkClassName(active: boolean) {
  return `rounded-full px-3 py-1.5 text-sm font-medium transition ${
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
}: DashboardViewSwitchProps) {
  const t = useTranslations("navigation");

  if (!(hasFounder && hasAdvisor)) {
    return null;
  }

  return (
    <nav
      aria-label={t("viewSwitchLabel")}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200/80 bg-slate-100/85 p-1"
    >
      <Link
        href="/dashboard"
        aria-current={activeView === "founder" ? "true" : undefined}
        onClick={() => onSelect?.("founder")}
        className={linkClassName(activeView === "founder")}
      >
        {t("viewFounder")}
      </Link>
      <Link
        href="/advisor/dashboard"
        aria-current={activeView === "advisor" ? "true" : undefined}
        onClick={() => onSelect?.("advisor")}
        className={linkClassName(activeView === "advisor")}
      >
        {t("viewAdvisor")}
      </Link>
    </nav>
  );
}
