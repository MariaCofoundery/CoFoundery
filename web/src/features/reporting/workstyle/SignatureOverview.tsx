import {
  AREAS,
  memberInitials,
  displayPosition,
  type ProductProfile,
} from "@/features/reporting/workstyle/model";
export function SignatureOverview({
  people,
}: {
  people: { id: string; name: string; profile: ProductProfile }[];
}) {
  return (
    <figure
      className="ws-overview my-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-violet-50/40 p-5 sm:p-7"
      aria-label="Workstyle Signature"
    >
      <figcaption>
        <h3 className="text-xl font-semibold">
          {people.length === 1 ? "Dein Antwortmuster" : "Eure Antwortmuster"}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Die Übersicht zeigt die mittlere gewählte Antwortkategorie in
          vergleichbar formulierten Situationen. Die einzelnen Antworten und
          qualitativen Präferenzen stehen darunter. Keine Norm und keine
          Bewertung.
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
          const responses = people.map((p) => ({
            ...p,
            position: displayPosition(p.profile, area.key),
          }));
          const options = responses.find((p) => p.position)?.position?.options;
          return (
            <section key={area.key} className="ws-lane">
              <h4 className="text-sm font-semibold">{area.team}</h4>
              <div
                aria-hidden="true"
                className="relative my-2"
                style={{ height: people.length * 29 + 4 }}
              >
                <div className="absolute inset-x-3 top-1/2 border-t border-slate-400" />
                {[0, 1, 2, 3, 4].map((n) => (
                  <span
                    key={n}
                    className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border border-slate-500 bg-white"
                    style={{ left: `calc(${n * 25}% + ${12 - n * 8}px)` }}
                  />
                ))}
                {responses.map((p, n) =>
                  p.position ? (
                    <span
                      key={p.id}
                      className={`ws-token ws-token-${n % 4} absolute`}
                      style={{
                        left: `calc(${p.position.position * 25}% + ${2 - p.position.position * 8}px)`,
                        top: n * 29,
                      }}
                    >
                      {memberInitials(p.name)}
                    </span>
                  ) : null,
                )}
              </div>
              {options && (
                <div
                  aria-hidden="true"
                  className="mb-2 flex justify-between gap-4 text-xs text-slate-600"
                >
                  <span>{options[0].label}</span>
                  <span className="text-right">{options.at(-1)!.label}</span>
                </div>
              )}
              <p className="text-xs leading-5 text-slate-600">
                {responses
                  .map(
                    (p) =>
                      `${p.name}: ${p.position?.label ?? "noch kein zusammenfassbares Muster"}`,
                  )
                  .join(" · ")}
              </p>
              {area.key === "ORG" && (
                <p className="mt-1 text-xs text-slate-500">
                  Hier: nächste Schritte und Zwischenstände. Planänderungen und
                  Prioritäten werden separat beschrieben.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </figure>
  );
}
