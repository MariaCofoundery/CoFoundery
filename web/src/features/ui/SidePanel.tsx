import Link from "next/link";
import { EscapeCloses } from "@/features/ui/EscapeCloses";

/**
 * Ein Panel von rechts (am Handy von unten) fuer Formulare und Termine (Entwurf 05.11.2026): man bleibt auf der Seite,
 * statt auf eine lange Formularseite zu springen. Der Schliessen-Weg ist ein Link auf dieselbe Seite ohne das
 * Panel - auch ohne Skript bedienbar; Escape schliesst ebenfalls.
 *
 * "modal": liegt ueber der Seite. "column": steht am Rechner neben dem Inhalt, am Handy als Blatt von unten.
 */
export function SidePanel({
  variant = "modal",
  closeHref,
  closeLabel,
  titleId,
  eyebrow,
  children,
  footer,
  formAction,
}: {
  variant?: "modal" | "column";
  closeHref: string;
  closeLabel: string;
  titleId: string;
  eyebrow?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Ein Formular um Inhalt und Fuss: so liegt der Speichern-Knopf unten fest und gehoert doch zum Formular. */
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  const modal = variant === "modal";
  return (
    <>
      <EscapeCloses href={closeHref} />
      {/* Hintergrund: beim Modal immer, bei der Spalte nur am Handy. */}
      <Link href={closeHref} aria-label={closeLabel} tabIndex={-1} className={`fixed inset-0 z-[55] bg-[#14152B]/45 print:hidden ${modal ? "" : "lg:hidden"}`} />
      <section
        role="dialog"
        aria-modal={modal ? "true" : undefined}
        aria-labelledby={titleId}
        className={`fixed inset-x-0 bottom-0 top-16 z-[56] flex flex-col overflow-hidden rounded-t-[26px] bg-white shadow-[0_-12px_40px_rgba(20,21,43,0.2)] print:hidden ${
          modal
            ? "sm:inset-y-0 sm:left-auto sm:right-0 sm:top-0 sm:w-full sm:max-w-[640px] sm:rounded-none sm:shadow-[-24px_0_48px_rgba(20,21,43,0.18)]"
            : "lg:static lg:top-auto lg:z-auto lg:w-[26rem] lg:shrink-0 lg:self-start lg:rounded-[20px] lg:border lg:border-slate-200 lg:shadow-[0_12px_32px_rgba(23,23,58,0.08)] xl:w-[28rem]"
        }`}
      >
        <div className="flex items-center justify-between gap-3 px-5 pb-1 pt-3 sm:px-7 sm:pt-5">
          <span className="text-[13px] font-bold uppercase tracking-[0.06em] text-violet-800">{eyebrow}</span>
          <Link href={closeHref} aria-label={closeLabel} className="grid h-10 w-10 place-items-center rounded-[10px] text-slate-700 hover:bg-slate-100">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </Link>
        </div>
        {(() => {
          const body = (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
              {footer ? <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-3.5 sm:px-7">{footer}</div> : null}
            </>
          );
          return formAction ? (
            <form action={formAction} className="flex min-h-0 flex-1 flex-col">
              {body}
            </form>
          ) : (
            body
          );
        })()}
      </section>
    </>
  );
}
