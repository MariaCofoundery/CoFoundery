import { AREAS, memberInitials, type ProductProfile } from "@/features/reporting/workstyle/model";
import { overviewMark } from "@/features/reporting/workstyle/narrative";

/**
 * "Auf einen Blick" - eine Darstellung der Antworten, kein Messwert.
 *
 * Phase 10B: Die Verdichtung darf nicht staerker wirken als der Text
 * (`overviewMark`). Ein Punkt erscheint nur, wenn die Antworten eines Bereichs
 * eine Richtung tragen; bei gemischten Antworten zeigt ein gestrichelter
 * Balken die Spannweite - es gibt dann keinen einzelnen Punkt. Bei zu wenigen
 * Antworten erscheint nichts. Kein Radar, kein Gesamtwert.
 */
export function SignatureOverview({
  people,
}: {
  people: { id: string; name: string; profile: ProductProfile }[];
}) {
  const left = (position: number) => `calc(${position * 25}% + ${2 - position * 8}px)`;
  return (
    <figure
      className="ws-overview my-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-violet-50/40 p-5 sm:p-7"
      aria-label="Workstyle Signature"
    >
      <figcaption>
        <h3 className="text-xl font-semibold">
          {people.length === 1 ? "Dein Antwortmuster auf einen Blick" : "Eure Antwortmuster auf einen Blick"}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Ein Punkt erscheint nur, wenn die Antworten eines Bereichs in eine Richtung gehen – er steht auf der mittleren
          der gewählten Antworten. Unterscheiden sich die Antworten je nach Situation, zeigt ein gestrichelter Balken die
          Spannweite. Das ist eine Darstellung der Antworten, kein Messwert. Links und rechts sind gleichwertig, und es
          gibt keinen Gesamtwert.
        </p>
      </figcaption>
      <ul className="my-5 flex flex-wrap gap-4">
        {people.map((p, n) => (
          <li key={p.id} className="flex items-center gap-2 text-sm">
            <span aria-hidden="true" className={`ws-token ws-token-${n % 4}`}>
              {memberInitials(p.name)}
            </span>
            {p.name}
          </li>
        ))}
      </ul>
      <div className="grid gap-5">
        {AREAS.map((area) => {
          const marks = people.map((p) => ({ ...p, mark: overviewMark(p.profile, area.key) }));
          const options = marks.flatMap((m) => (m.mark.kind === "none" ? [] : [m.mark.options]))[0];
          return (
            <section key={area.key} className="ws-lane">
              <h4 className="text-sm font-semibold">{area.team}</h4>
              <div aria-hidden="true" className="relative my-2" style={{ height: people.length * 29 + 4 }}>
                <div className="absolute inset-x-3 top-1/2 border-t border-slate-400" />
                {[0, 1, 2, 3, 4].map((n) => (
                  <span
                    key={n}
                    className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border border-slate-500 bg-white"
                    style={{ left: `calc(${n * 25}% + ${12 - n * 8}px)` }}
                  />
                ))}
                {marks.map((m, n) =>
                  m.mark.kind === "point" ? (
                    <span
                      key={m.id}
                      className={`ws-token ws-token-${n % 4} absolute`}
                      style={{ left: left(m.mark.position), top: n * 29 }}
                    >
                      {memberInitials(m.name)}
                    </span>
                  ) : m.mark.kind === "range" ? (
                    <span
                      key={m.id}
                      className="ws-range absolute"
                      style={{
                        left: left(m.mark.from),
                        width: `calc(${(m.mark.to - m.mark.from) * 25}% - ${(m.mark.to - m.mark.from) * 8}px + 26px)`,
                        top: n * 29,
                      }}
                    >
                      {memberInitials(m.name)}
                    </span>
                  ) : null,
                )}
              </div>
              {options && (
                <div aria-hidden="true" className="mb-2 flex justify-between gap-4 text-xs text-slate-600">
                  <span>{options[0].label}</span>
                  <span className="text-right">{options.at(-1)!.label}</span>
                </div>
              )}
              <p className="text-xs leading-5 text-slate-600">
                {marks
                  .map(
                    (m) =>
                      `${m.name}: ${
                        m.mark.kind === "point"
                          ? m.mark.label
                          : m.mark.kind === "range"
                            ? `je nach Situation von „${m.mark.fromLabel}“ bis „${m.mark.toLabel}“`
                            : "zu wenige Antworten für eine Darstellung"
                      }`,
                  )
                  .join(" · ")}
              </p>
              {area.key === "ORG" && (
                <p className="mt-1 text-xs text-slate-500">
                  Hier nur: nächste Schritte und eigene Zwischenpunkte. Fokus, Unterbrechungen und Planänderungen stehen
                  einzeln im Text.
                </p>
              )}
              {area.key === "EXP" && (
                <p className="mt-1 text-xs text-slate-500">
                  Ohne den „vertrauten Eindruck“ – diese Frage hat ein anderes Antwortformat und steht einzeln im Text.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </figure>
  );
}
