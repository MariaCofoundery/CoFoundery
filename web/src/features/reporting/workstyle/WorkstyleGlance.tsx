import { AREAS, type AreaKey, type ProductProfile } from "@/features/reporting/workstyle/model";
import { AREA_POLES, glanceSentence, overviewMark, type OverviewMark } from "@/features/reporting/workstyle/narrative";

/**
 * "Deine Arbeitsweise auf einen Blick" / "Euer Zusammenspiel auf einen Blick"
 * (Phase 11.7B, ersetzt die "Workstyle Signature").
 *
 * Eine Karte je Bereich mit kurzen, gleichwertigen Polen. Je Person eine
 * eigene Spur - auch bei zwei Personen; Name direkt an der Spur, keine
 * Kuerzel als alleinige Kennzeichnung.
 *
 * Logik unveraendert (`overviewMark`): Punkt nur bei getragener Richtung,
 * weicher Balken "je nach Situation" bei gemischten Antworten, leere Linie
 * bei zu wenigen Antworten. Kein Radar, kein Gesamtwert, kein Prozent.
 */
type Person = { id: string; name: string; profile: ProductProfile };

const at = (position: number) => `${position * 25}%`;

function poleFor(area: AreaKey, position: number) {
  return position <= 1 ? AREA_POLES[area].left : position >= 3 ? AREA_POLES[area].right : "in der Mitte";
}

function describe(area: AreaKey, mark: OverviewMark) {
  if (mark.kind === "point") return `klare Richtung: ${poleFor(area, mark.position)}`;
  if (mark.kind === "range") return `je nach Situation, zwischen „${poleFor(area, mark.from)}“ und „${poleFor(area, mark.to)}“`;
  return "noch zu wenige Antworten";
}

function Track({ area, mark, name }: { area: AreaKey; mark: OverviewMark; name: string | null }) {
  return (
    <div className="ws-glance-track">
      {name ? <p className="truncate text-xs font-medium text-slate-700">{name}</p> : null}
      <div className="relative mx-2 h-6" aria-hidden="true">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-slate-300" />
        {[0, 1, 2, 3, 4].map((n) => (
          <span key={n} className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-300" style={{ left: at(n) }} />
        ))}
        {mark.kind === "point" ? (
          <span className="ws-glance-point absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600 ring-4 ring-violet-100" style={{ left: at(mark.position) }} />
        ) : mark.kind === "range" ? (
          <span
            className="ws-glance-range absolute top-1/2 h-3 -translate-y-1/2 rounded-full border border-violet-300 bg-gradient-to-r from-violet-200/80 to-cyan-200/80"
            style={{ left: `calc(${at(mark.from)} - 6px)`, width: `calc(${(mark.to - mark.from) * 25}% + 12px)` }}
          />
        ) : null}
      </div>
      <span className="sr-only">{`${name ? `${name}: ` : ""}${describe(area, mark)}`}</span>
      {/* Bei einer Person sagt der Satz darunter dasselbe - dann keine Doppelung. */}
      {name && mark.kind === "none" ? <p className="text-xs text-slate-400">Noch zu wenige Antworten</p> : null}
      {name && mark.kind === "range" ? <p className="text-xs text-slate-500">je nach Situation</p> : null}
    </div>
  );
}

export function WorkstyleGlance({
  people,
  title,
  intro,
  sentences,
  headingId = "ws-glance-title",
}: {
  people: Person[];
  title: string;
  intro?: string;
  /** Ein Satz je Bereich; ohne Angabe der Kurzsatz aus der Einzelperspektive. */
  sentences?: Partial<Record<AreaKey, string>>;
  headingId?: string;
}) {
  const many = people.length > 1;
  return (
    <section aria-labelledby={headingId} className="ws-glance">
      <h2 id={headingId} className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
      {intro ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{intro}</p> : null}
      <div className="ws-glance-grid mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {AREAS.map((area) => (
          <article key={area.key} className="ws-glance-card rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <h3 className="text-sm font-semibold text-slate-950">{area.team}</h3>
            <div className="mt-2 flex justify-between gap-4 text-xs leading-4 text-slate-500">
              <span className="max-w-[48%]">{AREA_POLES[area.key].left}</span>
              <span className="max-w-[48%] text-right">{AREA_POLES[area.key].right}</span>
            </div>
            <div className={`mt-2 grid ${many ? "gap-2" : "gap-1"}`}>
              {people.map((p) => (
                <Track key={p.id} area={area.key} mark={overviewMark(p.profile, area.key)} name={many ? p.name : null} />
              ))}
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              {sentences?.[area.key] ?? (people[0] ? glanceSentence(people[0].profile, area.key) : null)}
            </p>
          </article>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Punkt: Die Antworten gehen in eine Richtung. Weicher Balken: je nach Situation. Leere Linie: noch zu wenige
        Antworten. Links und rechts sind gleichwertig – es gibt keinen Gesamtwert und keine Rangfolge.
      </p>
    </section>
  );
}
