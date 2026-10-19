import type { AppLocale } from "@/i18n/config";
import { workstyleAreas, workstylePoles, reportText } from "./display";
import { type AreaKey, type ProductProfile } from "@/features/reporting/workstyle/model";
import { glanceSentence, overviewMark, situationDots, type OverviewMark, type SituationDot } from "@/features/reporting/workstyle/narrative";

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

function poleFor(area: AreaKey, position: number, locale: AppLocale) {
  return position <= 1 ? workstylePoles(locale)[area].left : position >= 3 ? workstylePoles(locale)[area].right : reportText(locale, "in der Mitte", "in the middle");
}

function describe(area: AreaKey, mark: OverviewMark, locale: AppLocale) {
  if (mark.kind === "point") return locale === "en" ? `Consistent direction: ${poleFor(area, mark.position, locale)}` : `klare Richtung: ${poleFor(area, mark.position, locale)}`;
  if (mark.kind === "range") return locale === "en" ? `Depends on the situation, between “${poleFor(area, mark.from, locale)}” and “${poleFor(area, mark.to, locale)}”` : `je nach Situation, zwischen „${poleFor(area, mark.from, locale)}“ und „${poleFor(area, mark.to, locale)}“`;
  return reportText(locale, "noch zu wenige Antworten", "Not enough responses yet");
}

function Track({ area, mark, name, locale, dots = [] }: { area: AreaKey; mark: OverviewMark; name: string | null; locale: AppLocale; dots?: SituationDot[] }) {
  return (
    <div className="ws-glance-track">
      {name ? <p className="truncate text-xs font-medium text-slate-700">{name}</p> : null}
      <div className="relative mx-2 h-6" aria-hidden="true">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-slate-300" />
        {[0, 1, 2, 3, 4].map((n) => (
          <span key={n} className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-300" style={{ left: at(n) }} />
        ))}
        {mark.kind === "point" ? (
          <span
            className={`ws-glance-point absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-violet-100 ${dots.length > 0 ? "bg-violet-200" : "bg-violet-600"}`}
            style={{ left: at(mark.position) }}
          />
        ) : mark.kind === "range" ? (
          <span
            className="ws-glance-range absolute top-1/2 h-3 -translate-y-1/2 rounded-full border border-violet-300 bg-gradient-to-r from-violet-200/80 to-cyan-200/80"
            style={{ left: `calc(${at(mark.from)} - 6px)`, width: `calc(${(mark.to - mark.from) * 25}% + 12px)` }}
          />
        ) : null}
        {/* Jede beantwortete Situation ein Punkt: Haeufung = durchgehend, Streuung = je nach Situation.
            Mehrere Situationen auf derselben Stufe stehen leicht versetzt nebeneinander. */}
        {dots.map((dot, index) => {
          const same = dots.filter((other) => other.position === dot.position);
          const offset = (same.indexOf(dot) - (same.length - 1) / 2) * 9;
          return (
            <span
              key={dot.itemKey}
              data-situation-dot={dot.itemKey}
              title={`${dot.situation}: ${dot.answer}`}
              className="ws-glance-dot absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border border-white bg-violet-700"
              style={{ left: `calc(${at(dot.position)} + ${offset}px - 5px)`, zIndex: index + 1 }}
            />
          );
        })}
      </div>
      {dots.length > 0 ? (
        <ul className="sr-only">
          {dots.map((dot) => (
            <li key={dot.itemKey}>{`${dot.situation}: ${dot.answer}`}</li>
          ))}
        </ul>
      ) : null}
      <span className="sr-only">{`${name ? `${name}: ` : ""}${describe(area, mark, locale)}`}</span>
      {/* Bei einer Person sagt der Satz darunter dasselbe - dann keine Doppelung. */}
      {name && mark.kind === "none" ? <p className="text-xs text-slate-400">{reportText(locale, "Noch zu wenige Antworten", "Not enough responses yet")}</p> : null}
      {name && mark.kind === "range" ? <p className="text-xs text-slate-500">{reportText(locale, "je nach Situation", "Depends on the situation")}</p> : null}
    </div>
  );
}

export function WorkstyleGlance({
  people,
  locale = "de",
  title,
  intro,
  sentences,
  headingId = "ws-glance-title",
}: {
  people: Person[];
  locale?: AppLocale;
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
        {workstyleAreas(locale).map((area) => (
          <article key={area.key} className="ws-glance-card rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <h3 className="text-sm font-semibold text-slate-950">{area.team}</h3>
            <div className="mt-2 flex justify-between gap-4 text-xs leading-4 text-slate-500">
              <span className="max-w-[48%]">{workstylePoles(locale)[area.key].left}</span>
              <span className="max-w-[48%] text-right">{workstylePoles(locale)[area.key].right}</span>
            </div>
            <div className={`mt-2 grid ${many ? "gap-2" : "gap-1"}`}>
              {people.map((p) => (
                <Track locale={locale} key={p.id} area={area.key} mark={overviewMark(p.profile, area.key, locale)} name={many ? p.name : null} dots={many ? [] : situationDots(p.profile, area.key, locale)} />
              ))}
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              {sentences?.[area.key] ?? (people[0] ? glanceSentence(people[0].profile, area.key, locale) : null)}
            </p>
          </article>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        {reportText(locale, "Kleine Punkte: je eine beantwortete Situation. Großer Punkt: Die Antworten gehen in eine Richtung. Weicher Balken: je nach Situation. Leere Linie: noch zu wenige Antworten. Links und rechts sind gleichwertig – es gibt keinen Gesamtwert und keine Rangfolge.", "Small dots: one answered situation each. Large dot: responses point in one direction. Soft bar: responses depend on the situation. Empty line: not enough responses yet. Neither end is better. There is no overall score or ranking.")}
      </p>
    </section>
  );
}
