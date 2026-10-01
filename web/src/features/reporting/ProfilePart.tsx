import type { ReactNode } from "react";

import type { PillarTone } from "@/features/reporting/ProfilePillar";

/**
 * Einer der drei Teile von „Das bist du".
 *
 * ---------------------------------------------------------------------------
 * WARUM ES DIESE EBENE GIBT
 * ---------------------------------------------------------------------------
 *
 * Die Seite hatte vier Säulen und sehr verschieden große Inhalte: „Wie du
 * arbeitest" war der längste Teil des Produkts, „Wer du bist" sechs Zeilen.
 * Neun Abschnitte verteilen das gleichmäßiger — aber neun Überschriften
 * untereinander sind wieder eine Wand.
 *
 * Drei Teile mit je zwei bis fünf Abschnitten sind der Kompromiss: Der Teil
 * sagt, worum es gerade geht, der Abschnitt sagt, was darin steht.
 *
 * ---------------------------------------------------------------------------
 * DIE FARBE SAGT „WELCHER TEIL", NICHT „WIE GUT"
 * ---------------------------------------------------------------------------
 *
 * Dieselbe Regel wie bei `ProfilePillar`, und aus demselben Grund: Innen
 * bleiben Bernstein und Rose für ihre Bedeutung reserviert. Deshalb trägt der
 * Teil die Farbe nur an der Augenbraue und am Strich darunter.
 *
 * KEINE NUMMER MIT GESAMTZAHL hier. Die Abschnitte tragen sie — „1 von 9"
 * sagt, wo man steht. „Teil 1 von 3" daneben wäre eine zweite Zählung über
 * dieselbe Seite.
 */
export function ProfilePart({
  id,
  tone,
  eyebrow,
  title,
  children,
}: {
  id: string;
  tone: PillarTone;
  /** „Teil I" - als fertiger Text, damit die Zählweise übersetzbar bleibt. */
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  const farbe = EYEBROW_TONE[tone];

  return (
    <section id={id} className="mt-14 scroll-mt-6 first:mt-10">
      <header className="border-b border-slate-200 pb-3">
        <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${farbe}`}>
          {eyebrow}
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
      </header>

      {children}
    </section>
  );
}

const EYEBROW_TONE: Record<PillarTone, string> = {
  slate: "text-slate-500",
  indigo: "text-indigo-600",
  emerald: "text-emerald-700",
  violet: "text-violet-600",
};
