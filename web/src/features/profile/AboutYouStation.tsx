import Link from "next/link";
import type { ReactNode } from "react";

import type { StepStatus } from "@/features/profile/aboutYou";

/**
 * Eine Station von „Über dich".
 *
 * ---------------------------------------------------------------------------
 * EINE KARTE, EIN STATUS, EIN NÄCHSTER SCHRITT
 * ---------------------------------------------------------------------------
 *
 * Die größte Station steht über fünf Erfassungswegen. Sie zeigt trotzdem
 * EINEN Status: Fünf Statuswörter nebeneinander wären eine Rechnung, und
 * „3 von 5 erledigt" ist genau der Fortschrittsbalken, den diese Seite nicht
 * haben soll.
 *
 * Die Unterpunkte stehen darunter als leise Zeile - zum Anspringen, nicht zum
 * Abhaken. Sie tragen ihren eigenen Zustand nur als Wort, ohne Plakette und
 * ohne Farbe.
 *
 * ---------------------------------------------------------------------------
 * DER PAYOFF STEHT ÜBER DEM KNOPF, NICHT DARUNTER
 * ---------------------------------------------------------------------------
 *
 * Erst was entstanden ist, dann was man als Nächstes tun kann. Andersherum
 * liest sich das Entstandene wie eine Belohnung für den Klick.
 *
 * Und er ist klein: ein Satz oder ein kompaktes Bild. Die ausführliche
 * Fassung steht nach dem Erfassen auf der Schrittseite und vollständig auf
 * „Das bist du".
 *
 * ---------------------------------------------------------------------------
 * KEINE NUMMER
 * ---------------------------------------------------------------------------
 *
 * Fünf Stationen, keine Reihenfolge, kein „Station 2". Wer mit den Ressourcen
 * anfangen will, fängt mit den Ressourcen an - eine Nummer würde das zu einem
 * Umweg erklären.
 *
 * ---------------------------------------------------------------------------
 * „FÜR JETZT DURCH" STEHT NICHT HIER
 * ---------------------------------------------------------------------------
 *
 * Die Markierung gehört auf die Seite des Bereichs, nicht auf die Übersicht:
 * Sie ist eine Entscheidung über den Inhalt, und man trifft sie, während man
 * ihn vor sich hat. Eine Station wie „Was du mitbringst" hätte hier ausserdem
 * zwei davon - und zwei Häkchen an einer Karte wären wieder eine Rechnung.
 */

const STATUS_STIL: Record<StepStatus, { punkt: string; text: string }> = {
  // Grau heißt „hier ist noch nichts" - nicht „hier fehlt etwas". Deshalb
  // kein Bernstein und kein Rot: Was offen ist, fehlt nicht am Menschen.
  open: { punkt: "bg-slate-300", text: "text-slate-500" },
  started: { punkt: "bg-violet-400", text: "text-violet-700" },
  doneForNow: { punkt: "bg-emerald-400", text: "text-emerald-700" },
};

export function AboutYouStation({
  id,
  title,
  text,
  status,
  statusLabel,
  payoff,
  substeps,
  cta,
}: {
  id: string;
  title: string;
  text: string;
  status: StepStatus;
  statusLabel: string;
  /** Klein: ein Satz oder ein kompaktes Bild. Darf fehlen. */
  payoff?: ReactNode;
  /** Nur bei der großen Station - sonst wäre es eine Liste mit einem Eintrag. */
  substeps?: { id: string; label: string; status: StepStatus; statusLabel: string; href: string }[];
  /** Genau einer. Mehrere gleichrangige Knöpfe sind keine Empfehlung mehr. */
  cta: { label: string; href: string };
}) {
  const stil = STATUS_STIL[status];

  return (
    <section
      id={id}
      className="scroll-mt-20 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <h2 className="min-w-0 text-lg font-semibold text-slate-950">{title}</h2>
        <p className={`flex shrink-0 items-center gap-2 text-xs font-medium ${stil.text}`}>
          <span aria-hidden className={`h-2 w-2 rounded-full ${stil.punkt}`} />
          {statusLabel}
        </p>
      </div>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{text}</p>

      {payoff ? <div className="mt-4">{payoff}</div> : null}

      {substeps && substeps.length > 0 ? (
        <ul className="mt-4 divide-y divide-slate-100 border-y border-slate-100">
          {substeps.map((substep) => (
            <li key={substep.id}>
              <Link
                href={substep.href}
                className="flex min-h-11 items-center justify-between gap-3 py-1 text-sm text-slate-700 hover:text-slate-950"
              >
                <span className="min-w-0">{substep.label}</span>
                {/* Nur das Wort. Eine zweite Plakettenreihe neben der des
                    Abschnitts wäre die Rechnung, die hier nicht stehen soll. */}
                <span className={`shrink-0 text-xs ${STATUS_STIL[substep.status].text}`}>
                  {substep.statusLabel}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-5">
        <Link
          href={cta.href}
          className="inline-flex min-h-11 items-center rounded-full bg-[color:var(--brand-primary)] px-5 text-sm font-semibold text-slate-900"
        >
          {cta.label}
        </Link>
      </div>
    </section>
  );
}
