import Link from "next/link";
import { type CSSProperties, type ReactNode } from "react";

type Action = {
  href: string;
  label: string;
  variant?: "primary" | "secondary" | "ghost";
};

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  supportingText?: string;
  highlight?: string;
  actions: Action[];
  footer?: ReactNode;
};

function actionClassName(variant: Action["variant"]) {
  if (variant === "secondary") {
    return "inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50";
  }

  if (variant === "ghost") {
    return "inline-flex rounded-lg border border-transparent bg-transparent px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900";
  }

  return "inline-flex rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-[color:var(--brand-primary-hover)]";
}

function CelebrationAccent() {
  const dots = [
    { top: "14%", left: "10%", delay: "0ms" },
    { top: "18%", left: "74%", delay: "240ms" },
    { top: "42%", left: "86%", delay: "520ms" },
    { top: "58%", left: "14%", delay: "680ms" },
    { top: "72%", left: "68%", delay: "340ms" },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.16),transparent_60%)]" />
      <div className="absolute right-6 top-6 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.12),transparent_72%)] blur-xl" />
      {dots.map((dot, index) => (
        <span
          key={`completion-dot-${index}`}
          className="absolute h-2.5 w-2.5 rounded-full bg-white/90 shadow-[0_0_0_3px_rgba(103,232,249,0.18)] animate-pulse"
          style={{
            top: dot.top,
            left: dot.left,
            animationDelay: dot.delay,
            animationDuration: "2.8s",
          }}
        />
      ))}
    </div>
  );
}

export function QuestionnaireCompletionShell({
  eyebrow,
  title,
  description,
  supportingText,
  highlight,
  actions,
  footer,
}: Props) {
  return (
    <main
      className="mx-auto min-h-screen w-full max-w-3xl px-6 py-12"
      style={
        {
          "--brand-primary": "#67e8f9",
          "--brand-primary-hover": "#4fd8eb",
          "--brand-accent": "#7c3aed",
        } as CSSProperties
      }
    >
      <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <CelebrationAccent />

        <div className="relative">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">{title}</h1>
          <p className="mt-4 text-sm leading-7 text-slate-700">{description}</p>
          {supportingText ? (
            <p className="mt-3 text-sm leading-7 text-slate-600">{supportingText}</p>
          ) : null}

          {highlight ? (
            <div className="mt-5 rounded-2xl border border-[color:var(--brand-primary)]/25 bg-[color:var(--brand-primary)]/10 px-4 py-3 text-sm leading-7 text-slate-700">
              {highlight}
            </div>
          ) : null}

          <div className="mt-7 flex flex-wrap gap-3">
            {actions.map((action) => (
              <Link
                key={`${action.href}-${action.label}`}
                href={action.href}
                className={actionClassName(action.variant)}
              >
                {action.label}
              </Link>
            ))}
          </div>

          {footer ? <div className="mt-6">{footer}</div> : null}
        </div>
      </section>
    </main>
  );
}
