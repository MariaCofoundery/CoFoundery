import Link from "next/link";
import { archiveHint, type TransitionDecision } from "@/features/instruments/v21/transitionV21";

/**
 * Beide Fassungen im Dashboard - mit dem, was daran hängt.
 *
 * ---------------------------------------------------------------------------
 * „NICHTS GEHT VERLOREN“ MUSS MAN SEHEN KÖNNEN
 * ---------------------------------------------------------------------------
 *
 * Wir sagen an drei Stellen, dass der bisherige Report erhalten bleibt. Wenn
 * er danach nirgends auftaucht, ist das eine Behauptung. Deshalb steht er hier
 * mit einem Link - auch und gerade bei jemandem, der zur neuen Fassung
 * gewechselt ist.
 *
 * ---------------------------------------------------------------------------
 * DIE VERBINDUNGEN GEHÖREN ZUR FASSUNG
 * ---------------------------------------------------------------------------
 *
 * Ein Vergleich läuft nur innerhalb einer Fassung. Wer zwei Mitgründer hat,
 * von denen einer gewechselt ist und einer nicht, hat zwei Vergleiche an zwei
 * Orten - und es gibt keinen Ort, an dem beide zusammen stehen könnten, ohne
 * zu lügen. Also stehen sie getrennt, je unter ihrer Fassung.
 */

export type ArchiveConnection = {
  userId: string;
  label: string;
  /** Hat diese Person dieselbe Fassung abgegeben? */
  ready: boolean;
};

type Props = {
  decision: TransitionDecision;
  previous: { submitted: boolean; reportHref: string | null };
  next: { started: boolean; submitted: boolean };
  connectionsNext: ArchiveConnection[];
};

export function VersionArchiveCard({ decision, previous, next, connectionsNext }: Props) {
  return (
    <section
      id="dashboard-block-versions"
      className="dashboard-fade-up mb-8 scroll-mt-28 rounded-[28px] border border-slate-200/80 bg-white/96 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-6"
      aria-labelledby="dashboard-versions-title"
    >
      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
        Dein Test
      </p>
      <h2 id="dashboard-versions-title" className="mt-2 text-2xl font-semibold text-slate-950">
        Beide Fassungen
      </h2>
      <p className="mt-2 text-sm leading-7 text-slate-600">{archiveHint(decision)}</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-sm font-medium text-slate-900">Bisherige Fassung</p>
          <p className="mt-1 text-xs text-slate-500">
            {previous.submitted
              ? "abgegeben, vollständig ausgewertet"
              : "noch nicht abgegeben"}
          </p>
          {previous.reportHref ? (
            <Link href={previous.reportHref} className="mt-3 inline-block text-sm text-slate-900 underline">
              Zum bisherigen Report
            </Link>
          ) : (
            <Link href="/me/base" className="mt-3 inline-block text-sm text-slate-900 underline">
              Zum bisherigen Fragebogen
            </Link>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-sm font-medium text-slate-900">
            Neue Fassung
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-normal text-amber-900">
              im Test
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {next.submitted
              ? "abgegeben — noch keine Auswertung, nur Antworten und Vergleich"
              : next.started
                ? "angefangen"
                : "noch nicht ausgefüllt"}
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link href="/founder-alignment/pilot" className="text-slate-900 underline">
              {next.started ? "Weiter ausfüllen" : "Ausprobieren"}
            </Link>
            {next.submitted && (
              <>
                <Link href="/founder-alignment/pilot/report" className="text-slate-900 underline">
                  Deine Antworten
                </Link>
                <Link href="/founder-alignment/pilot/discovery" className="text-slate-900 underline">
                  Wonach du suchst
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {next.submitted && (
        <div className="mt-5 rounded-2xl border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-900">Vergleiche zur neuen Fassung</p>
          {connectionsNext.length === 0 ? (
            <p className="mt-1 text-sm text-slate-600">
              Noch niemand, mit dem du verbunden bist, hat die neue Fassung abgegeben und
              dir freigegeben. Vergleichen könnt ihr euch erst, wenn ihr beide dieselbe
              Fassung ausgefüllt habt.
            </p>
          ) : (
            <ul className="mt-2 space-y-1">
              {connectionsNext.map((connection) => (
                <li key={connection.userId} className="text-sm">
                  {connection.ready ? (
                    <Link
                      href={`/founder-alignment/pilot/compare/${connection.userId}`}
                      className="text-slate-900 underline"
                    >
                      mit {connection.label} vergleichen
                    </Link>
                  ) : (
                    <span className="text-slate-500">
                      {connection.label} — hat die neue Fassung noch nicht freigegeben
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Link
        href="/founder-alignment/versionen"
        className="mt-4 inline-block text-sm text-slate-600 underline"
      >
        Was sich zwischen den Fassungen unterscheidet
      </Link>
    </section>
  );
}
