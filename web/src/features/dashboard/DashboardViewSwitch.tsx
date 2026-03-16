import Link from "next/link";

type DashboardViewSwitchProps = {
  activeView: "founder" | "advisor";
  hasFounder: boolean;
  hasAdvisor: boolean;
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
}: DashboardViewSwitchProps) {
  if (!(hasFounder && hasAdvisor)) {
    return null;
  }

  return (
    <nav
      aria-label="Ansicht wechseln"
      className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-100/85 p-1"
    >
      <Link href="/dashboard" className={linkClassName(activeView === "founder")}>
        Founder
      </Link>
      <Link href="/advisor/dashboard" className={linkClassName(activeView === "advisor")}>
        Advisor
      </Link>
    </nav>
  );
}
