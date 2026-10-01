import type { ReactNode } from "react";

/**
 * Ein Abschnitt von "Das bist du".
 *
 * GEMELDET AM 24.09.2026: "Ich hatte mir jetzt noch mal das Profil angeschaut
 * und ich finde, da muessten viel mehr Sachen zusammengeklappt sein. [...] Es
 * ist viel zu erschlagend und es muesste bitte noch mal ein bisschen sortiert
 * werden. Auch gerne ein bisschen farbig."
 *
 * Vorher standen dreizehn gleich aussehende weisse Kaesten untereinander.
 * Diese Huelle gibt jedem Teil einen Rahmen und eine Nummer.
 *
 * ---------------------------------------------------------------------------
 * AUS VIER SAEULEN WURDEN NEUN ABSCHNITTE - AM 01.10.2026
 * ---------------------------------------------------------------------------
 *
 * Die vier Saeulen trugen sehr verschieden grosse Inhalte, und unter "Was du
 * mitbringst" lagen vier verschiedene Fragen in einem Block. Jetzt tragen
 * `ProfilePart` die drei Teile und diese Huelle die neun Abschnitte darin.
 *
 * Das `eyebrow` ist seitdem freiwillig: Wenn der Teil darueber schon sagt,
 * worum es geht, waere es dasselbe Wort zweimal untereinander.
 *
 * DIE FARBE SAGT "WELCHER TEIL", NICHT "WIE GUT". Das ist der Grund, warum
 * sie nur am Rahmen sitzt - Augenbraue, Randlinie, Zaehler - und nie auf einer
 * Inhaltskarte. Innen bleiben Bernstein und Rose reserviert fuer ihre
 * Bedeutung (Bruchstelle, Luecke); waere der Abschnitt selbst bernsteinfarben,
 * liesse sich beides nicht mehr unterscheiden.
 *
 * ---------------------------------------------------------------------------
 * "ABSCHNITT 4", NICHT "4 VON 9" - SEIT DEM 01.10.2026
 * ---------------------------------------------------------------------------
 *
 * Hier stand bis dahin "4 von 9". Gemeint war eine Position; gelesen wurde
 * ein Fortschritt. "x von y" ist die Schreibweise von Ladebalken, Umfragen
 * und Einrichtungsassistenten - ueberall dort heisst sie "noch fuenf, dann
 * bist du fertig". Auf einer Seite, die zusammenstellt, was jemand ueber sich
 * festgehalten hat, gibt es kein Fertig, und die Gesamtzahl macht aus zwei
 * leeren Abschnitten eine offene Rechnung.
 *
 * Die Nummer bleibt, die Gesamtzahl geht. "Abschnitt 4" sagt, wo man steht,
 * und behauptet nichts ueber den Rest.
 *
 * SIE STEHT ALS AUGENBRAUE, NICHT MEHR ALS PLAKETTE. Eine Zahl in einem
 * eingefaerbten Kreis ist die Form, in der Einrichtungsassistenten ihre
 * Schritte zeigen - und sie war mit 10 px die kleinste Schrift der Seite.
 * Als Zeile in der Farbe des Teils ist sie eine Beschriftung.
 */

export const PILLAR_TONES = ["slate", "indigo", "emerald", "violet"] as const;
export type PillarTone = (typeof PILLAR_TONES)[number];

const TONE: Record<PillarTone, { rule: string; eyebrow: string }> = {
  slate: { rule: "bg-slate-300", eyebrow: "text-slate-500" },
  indigo: { rule: "bg-indigo-400", eyebrow: "text-indigo-600" },
  emerald: { rule: "bg-emerald-400", eyebrow: "text-emerald-700" },
  violet: { rule: "bg-violet-400", eyebrow: "text-violet-600" },
};

export function ProfilePillar({
  id,
  tone,
  step,
  title,
  intro,
  children,
}: {
  id: string;
  tone: PillarTone;
  /**
   * "Abschnitt 2" - als fertiger Text, damit die Zaehlweise uebersetzbar
   * bleibt. OHNE GESAMTZAHL, siehe oben.
   */
  step: string;
  /** Darf fehlen, wenn der Teil darueber denselben Namen traegt. */
  title?: string | null;
  intro?: string | null;
  children: ReactNode;
}) {
  const toneClasses = TONE[tone];

  return (
    <section id={id} className="mt-10 scroll-mt-6 first:mt-8">
      <header className="flex items-start gap-4">
        {/* Die Randlinie traegt die Farbe. Sie ist Schmuck: Alles, was sie
            sagt, steht daneben auch in Worten. */}
        <span aria-hidden className={`mt-1 h-10 w-1 shrink-0 rounded-full ${toneClasses.rule}`} />
        <div className="min-w-0">
          <p
            className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${toneClasses.eyebrow}`}
          >
            {step}
          </p>
          {title ? (
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
          ) : null}
          {intro ? (
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{intro}</p>
          ) : null}
        </div>
      </header>

      {/* Die Saeule ordnet die Abstaende, nicht ihre Teile - sonst haengt
          an jeder Naht eine doppelte Luecke. */}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}
