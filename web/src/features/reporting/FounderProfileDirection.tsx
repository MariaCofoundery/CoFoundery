import type { DirectionFacet } from "@/features/direction/directionInterviewGuide";
import type { DirectionStatement } from "@/features/direction/directionStatementData";

/**
 * Was mir wichtig ist - die vierte Säule des Founderprofils.
 *
 * GEWÜNSCHT AM 22.09.2026: "Das Interview gehört auch auf die
 * Gesamtbild-Seite." Es fehlte die ganze Perspektive: Das Profil zeigte, wer
 * jemand ist, wie er arbeitet und was er mitbringt - aber nicht, was ihn
 * antreibt.
 *
 * NUR BESTÄTIGTE AUSSAGEN, und das ist keine Einschränkung, sondern der
 * Grund, warum sie hier stehen dürfen: Ein Vorschlag eines Modells ist keine
 * Aussage über einen Menschen, solange der Mensch ihn nicht bestätigt hat. Was
 * hier steht, hat die Person selbst geschrieben oder ausdrücklich übernommen.
 *
 * KEINE BELEGE, KEINE ERZÄHLUNGEN. Die Geschichten aus dem Gespräch bleiben,
 * wo sie hingehören - genauso wie bei den Fähigkeiten.
 *
 * ---------------------------------------------------------------------------
 * DIE HERKUNFT STEHT IM AUFKLAPPER, SEIT DEM 01.10.2026
 * ---------------------------------------------------------------------------
 *
 * Sie stand hier gar nicht: "Es sind ihre Aussagen, alle gleich." Das stimmt
 * für die Zusammenfassung - neben jedem Satz gelesen, wäre die Herkunft eine
 * Fußnote an einer Aussage und keine Aussage mehr.
 *
 * Im Aufklapper ist es umgekehrt. Wer dort nachsieht, will wissen, woher
 * etwas kommt: selbst geschrieben, aus einem Gespräch bestätigt oder
 * umformuliert. `origin` liegt in der Tabelle, und es nicht zu zeigen hieße,
 * eine Auskunft zurückzuhalten, die der Person gehört.
 *
 * ---------------------------------------------------------------------------
 * `limitPerFacet` - DIE ZWEITE DICHTE
 * ---------------------------------------------------------------------------
 *
 * Je Rubrik höchstens so viele. KEINE RANGFOLGE: begrenzt wird in der
 * Reihenfolge, in der die Sätze entstanden sind. Welcher der wichtigste ist,
 * sagt dieses Modell nicht - und eine Begrenzung darf es nicht erfinden.
 */
export function FounderProfileDirection({
  statements,
  facets,
  copy,
  limitPerFacet,
  originLabel,
}: {
  statements: DirectionStatement[];
  facets: readonly DirectionFacet[];
  /** Je Rubrik höchstens so viele - ohne Angabe alle. */
  limitPerFacet?: number;
  /** Nur im Aufklapper gesetzt. */
  originLabel?: (origin: DirectionStatement["origin"]) => string;
  copy: {
  /**
   * Die Ueberschrift darf fehlen: Im Gesamtbild traegt sie die Saeule
   * (`ProfilePillar`), und zweimal dasselbe uebereinander liest sich wie ein
   * Fehler. `null` heisst "steht schon darueber", nicht "hat keinen Namen".
   */
    title?: string | null;
    intro: string;
    facetLabel: (facet: string) => string;
  };
}) {
  if (statements.length === 0) return null;

  // In der Reihenfolge der Rubriken, nicht in der des Eintragens - und nur
  // die, in denen etwas steht.
  const groups = facets
    .map((facet) => {
      const darin = statements.filter((statement) => statement.facet === facet);
      return {
        facet,
        statements: limitPerFacet === undefined ? darin : darin.slice(0, limitPerFacet),
      };
    })
    .filter((group) => group.statements.length > 0);

  return (
    <section className="page-section rounded-2xl border border-slate-200/80 bg-white/95 p-6 print:rounded-none print:border-none print:px-0">
      {copy.title ? (
        <h2 className="text-base font-semibold text-slate-900">{copy.title}</h2>
      ) : null}
      <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-700">{copy.intro}</p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {groups.map((group) => (
          <div key={group.facet}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {copy.facetLabel(group.facet)}
            </h3>
            <ul className="mt-2 space-y-1">
              {group.statements.map((statement) => (
                <li key={statement.id} className="text-sm leading-6 text-slate-900">
                  {statement.statement}
                  {originLabel ? (
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                      {originLabel(statement.origin)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
