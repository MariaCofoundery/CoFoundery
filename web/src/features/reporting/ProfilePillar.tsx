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
 * NUMMERIERT, weil eine Nummer sagt "neun Abschnitte, du bist beim zweiten" -
 * und genau das fehlte: Die Seite hatte keinen erkennbaren Anfang und kein
 * Ende. Es ist eine Position, kein Fortschritt: Es steht nirgends, wie viele
 * davon "erledigt" sind.
 */

export const PILLAR_TONES = ["slate", "indigo", "emerald", "violet"] as const;
export type PillarTone = (typeof PILLAR_TONES)[number];

const TONE: Record<PillarTone, { rule: string; eyebrow: string; badge: string }> = {
  slate: {
    rule: "bg-slate-300",
    eyebrow: "text-slate-500",
    badge: "bg-slate-100 text-slate-600",
  },
  indigo: {
    rule: "bg-indigo-400",
    eyebrow: "text-indigo-600",
    badge: "bg-indigo-50 text-indigo-700",
  },
  emerald: {
    rule: "bg-emerald-400",
    eyebrow: "text-emerald-700",
    badge: "bg-emerald-50 text-emerald-700",
  },
  violet: {
    rule: "bg-violet-400",
    eyebrow: "text-violet-600",
    badge: "bg-violet-50 text-violet-700",
  },
};

export function ProfilePillar({
  id,
  tone,
  step,
  eyebrow,
  title,
  intro,
  children,
}: {
  id: string;
  tone: PillarTone;
  /** "2 von 9" - als fertiger Text, damit die Zaehlweise uebersetzbar bleibt. */
  step: string;
  /** Darf fehlen, wenn der Teil darueber schon sagt, worum es geht. */
  eyebrow?: string | null;
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
            className={`flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] ${toneClasses.eyebrow}`}
          >
            {eyebrow ? <span>{eyebrow}</span> : null}
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium tracking-normal ${toneClasses.badge}`}
            >
              {step}
            </span>
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
