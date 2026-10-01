import type { PersonStrength } from "@/features/capability/strengthData";

/**
 * Deine Arbeitsweise - im Gesamtbild.
 *
 * NACHGETRAGEN AM 24.09.2026. Maria: "Wo sehe ich das mit den Soft Skills?"
 * Antwort war: auf der Profilseite, aber nicht im Gesamtbild - und das war
 * inkonsequent. Das Gesamtbild ist die Seite, die man weitergibt; wenn
 * Arbeitsweisen irgendwo hingehören, dann dorthin.
 *
 * BEIDE BLICKE STEHEN DA, der eigene und die vermutete Außensicht. Das ist der
 * Ertrag des Perspektivwechsels: "manchmal / oft" sagt mehr als eine Zahl, und
 * wer es liest, sieht sofort, worüber zu sprechen wäre.
 *
 * DER HINWEIS AUF DEN UNTERSCHIED STEHT HIER NICHT. Auf der eigenen
 * Profilseite ist "hier siehst du dich anders, als du andere vermutest" eine
 * Einladung zum Nachdenken. In einer Fassung, die man weitergibt, läse sich
 * derselbe Satz wie ein Befund über einen Menschen - und das ist er nicht.
 *
 * ---------------------------------------------------------------------------
 * `limit` UND `originLabel` - SEIT DEM 01.10.2026
 * ---------------------------------------------------------------------------
 *
 * Zwei Dichten aus einer Liste, nicht zwei Listen: Die Zusammenfassung zeigt
 * die ersten, der Aufklapper alle - und dort zusätzlich, woher ein Satz
 * stammt. In der Zusammenfassung stünde die Herkunft an jedem Satz und machte
 * aus Aussagen eine Liste von Fußnoten.
 *
 * KEINE RANGFOLGE. Begrenzt wird in der Reihenfolge, in der die Sätze
 * entstanden sind - es gibt keine "wichtigste Stärke", und eine Begrenzung
 * darf keine erfinden.
 */
export function FounderProfileStrengths({
  strengths,
  copy,
  limit,
  originLabel,
}: {
  strengths: PersonStrength[];
  copy: {
    title?: string | null;
    intro?: string | null;
    self: string;
    reflected: (who: string) => string;
    frequency: (value: string) => string;
    group: (value: string) => string;
    unanswered: string;
  };
  /** Höchstens so viele - ohne Angabe alle. */
  limit?: number;
  /** Nur im Aufklapper gesetzt: "von dir geschrieben", "Vorschlag, bestätigt". */
  originLabel?: (origin: PersonStrength["origin"]) => string;
}) {
  if (strengths.length === 0) return null;

  const gezeigt = limit === undefined ? strengths : strengths.slice(0, limit);

  return (
    <section className="page-section rounded-2xl border border-slate-200/80 bg-white/95 p-6 print:rounded-none print:border-none print:px-0">
      {copy.title ? (
        <h2 className="text-base font-semibold text-slate-900">{copy.title}</h2>
      ) : null}
      {copy.intro ? (
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-700">{copy.intro}</p>
      ) : null}

      <ul className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
        {gezeigt.map((strength) => (
          <li key={strength.id} className="py-3">
            <p className="text-sm font-medium text-slate-950">{strength.statement}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {copy.self}:{" "}
              {strength.selfFrequency ? copy.frequency(strength.selfFrequency) : copy.unanswered}
              {strength.reflectedFrequency && strength.reflectedWho ? (
                <>
                  {" · "}
                  {copy.reflected(copy.group(strength.reflectedWho))}:{" "}
                  {copy.frequency(strength.reflectedFrequency)}
                </>
              ) : null}
              {/* Woher der Satz stammt - nur im Aufklapper. Es ist eine
                  Auskunft über die Entstehung, keine über die Aussage. */}
              {originLabel ? (
                <>
                  {" · "}
                  {originLabel(strength.origin)}
                </>
              ) : null}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
