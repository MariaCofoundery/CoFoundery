import Link from "next/link";

export type AccessStatePanelAction = { href: string; label: string };

const PRIMARY_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2";
const SECONDARY_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2";

/**
 * Phase 12C.1C: Ein ruhiger Zustand statt der englischen Standard-404.
 *
 * Sagt, was los ist, und bietet einen Weg weiter - sonst nichts. Keine Inhalte,
 * keine Namen, kein Grund, den die Person nicht ohnehin kennen darf.
 */
export function AccessStatePanel({
  eyebrow,
  title,
  body,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  actions: AccessStatePanelAction[];
  children?: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <section
        role="status"
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:p-8"
      >
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p>
        ) : null}
        <h1 className="mt-2 break-words text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          {title}
        </h1>
        {body ? <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{body}</p> : null}
        {children}
        {actions.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {actions.map((action, index) => (
              <Link
                key={action.href}
                href={action.href}
                className={index === 0 ? PRIMARY_CLASS : SECONDARY_CLASS}
              >
                {action.label}
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
