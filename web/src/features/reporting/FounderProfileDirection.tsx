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
 * KEINE HERKUNFT, KEINE BELEGE, KEINE ERZÄHLUNGEN. Auf der Profilseite steht
 * neben jeder Aussage, ob sie selbst geschrieben oder aus einem Vorschlag
 * entstanden ist - dort ist das wichtig, weil man dort entscheidet. Hier ist
 * es erledigt: Es sind ihre Aussagen, alle gleich. Und die Geschichten aus dem
 * Gespräch bleiben, wo sie hingehören, genauso wie bei den Fähigkeiten.
 */
export function FounderProfileDirection({
  statements,
  facets,
  copy,
}: {
  statements: DirectionStatement[];
  facets: readonly DirectionFacet[];
  copy: {
    title: string;
    intro: string;
    facetLabel: (facet: string) => string;
  };
}) {
  if (statements.length === 0) return null;

  // In der Reihenfolge der Rubriken, nicht in der des Eintragens - und nur
  // die, in denen etwas steht.
  const groups = facets
    .map((facet) => ({
      facet,
      statements: statements.filter((statement) => statement.facet === facet),
    }))
    .filter((group) => group.statements.length > 0);

  return (
    <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-6 print:rounded-none print:border-none print:px-0">
      <h2 className="text-base font-semibold text-slate-900">{copy.title}</h2>
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
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
