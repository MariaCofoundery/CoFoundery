import deCopy from "../../../../messages/de/capability.json";
import enCopy from "../../../../messages/en/capability.json";
import type { AppLocale } from "@/i18n/config";

const labels = (locale: AppLocale) => locale === "en" ? enCopy : deCopy;
const text = (locale: AppLocale, de: string, en: string) => locale === "en" ? en : de;
import { componentRows, type CapabilityPerson } from "@/features/reporting/workstyle/componentsModel";
import type { CapabilityArea } from "@/features/capability/capabilityTypes";

const areaName = (key: string, locale: AppLocale) =>
  (labels(locale).areaLabels as Record<string, string>)[key] ?? key;
const familyName = (key: string, locale: AppLocale) =>
  (labels(locale).families as Record<string, string>)[key] ?? key;

/** Ab "Wiederholt angewandt" (Stufe 4) - dieselbe Tiefe wie im Profil (DEPTH_LEVEL). Selbstauskunft, keine Pruefung. */
const EXPERIENCED = 4;

/** Erfahrung als Textchip - eigene Angabe (application_level 1-5). */
function experienceChip(level: number | null, locale: AppLocale): string | null {
  if (level === null || level === undefined) return null;
  return level >= EXPERIENCED ? text(locale, "viel Erfahrung", "Extensive experience") : level >= 2 ? text(locale, "etwas Erfahrung", "Some experience") : text(locale, "noch keine Praxis", "No practical experience yet");
}

/** Verantwortungswunsch als Textchip - nur `own` heisst "moechte verantworten". */
const WISH: Record<string, string> = {
  own: "möchte verantworten",
  contribute: "möchte beitragen",
  grow_into: "möchte hineinwachsen",
  prefer_other: "lieber jemand anderes",
  prefer_external: "lieber extern",
  unclear: "noch offen",
};

const WISH_EN: Record<string, string> = {
  own: "Wants to take responsibility", contribute: "Wants to contribute", grow_into: "Wants to grow into this",
  prefer_other: "Would prefer someone else", prefer_external: "Would prefer external support", unclear: "Still open",
};

type Row = ReturnType<typeof componentRows>[number];

/** Bereiche, die Klaerung brauchen - dieselbe Quelle wie die Gespraechskarten. */
export function openResponsibilityRows(people: CapabilityPerson[], areas: CapabilityArea[]) {
  return componentRows(people, areas).filter(
    (r) => r.cells.some((c) => c.entry) && (r.states.includes("OPEN_INTERNAL") || r.states.includes("MULTI_COVERED")),
  );
}

function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "accent" }) {
  return (
    <span
      className={`ws-chip inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        tone === "accent" ? "border-violet-200 bg-violet-50 text-violet-900" : "border-slate-200 bg-slate-50 text-slate-700"
      }`}
    >
      {children}
    </span>
  );
}

function AreaBlock({ row, locale }: { row: Row; locale: AppLocale }) {
  const withEntry = row.cells.filter((c) => c.entry);
  const without = row.cells.filter((c) => !c.entry).map((c) => c.name);
  return (
    <article className="ws-text-card rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{familyName(row.area.family_id, locale)}</p>
      <h4 className="mt-0.5 text-base font-semibold text-slate-950">{areaName(row.area.area_id, locale)}</h4>
      <ul className="mt-3 space-y-2">
        {withEntry.map((c) => {
          const experience = experienceChip(c.entry!.application_level, locale);
          const wish = c.entry!.ownership_wish ? (locale === "en" ? WISH_EN : WISH)[c.entry!.ownership_wish] : null;
          return (
            <li key={c.personId} className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="min-w-[5rem] text-sm font-medium text-slate-900">{c.name}</span>
              <span className="flex flex-wrap gap-1.5">
                {experience ? <Chip>{experience}</Chip> : null}
                {wish ? <Chip tone={c.entry!.ownership_wish === "own" ? "accent" : "neutral"}>{wish}</Chip> : null}
                {!experience && !wish ? <span className="text-xs text-slate-500">{text(locale, "Bereich angegeben, ohne Stufe und Wunsch", "Area added without an experience level or responsibility preference")}</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
      {without.length > 0 && <p className="mt-2 text-xs text-slate-400">{text(locale, "Keine Angabe:", "No entry:")} {without.join(", ")}</p>}
    </article>
  );
}

/**
 * Faehigkeiten & Verantwortung im Teamreport (Phase 11.7B).
 *
 * Drei getrennte Achsen, nie verrechnet:
 * - Erfahrung (application_level): was jemand nach eigener Angabe anwenden kann,
 * - Verantwortungswunsch (ownership_wish): nur `own` heisst "moechte verantworten",
 * - Sourcing (capability_areas.sourcing): ob ein Bereich intern liegen sollte.
 * Eine vereinbarte Rolle entsteht erst im Founder Setup.
 *
 * Aufbau: A) "Wo Verantwortung noch offen ist" (kompakt), B) "Wer was
 * mitbringt" mit Textchips statt Symbolen - prominent nur Bereiche mit einem
 * Verantwortungswunsch, viel Erfahrung oder offener Verantwortung, alle
 * weiteren eingeklappt. Personen ohne Angabe nur als grauer Einzeiler.
 *
 * Phase 11.7B.1: dieselbe Komponente auf /teams/[id]/roles (`heading={false}`,
 * die Seite traegt den Titel selbst) - keine zweite Darstellung.
 */
export function ComponentMatrix({
  people,
  areas,
  heading = true,
  locale = "de",
}: {
  people: CapabilityPerson[];
  areas: CapabilityArea[];
  heading?: boolean;
  locale?: AppLocale;
}) {
  const allRows = componentRows(people, areas);
  const rows = allRows.filter((r) => r.cells.some((c) => c.entry));
  const open = rows.filter((r) => r.states.includes("OPEN_INTERNAL") || r.states.includes("MULTI_COVERED") ||
    (r.externalPreference.length > 0 && r.sourcing === "internal_only"));
  const relevant = rows.filter(
    (r) => open.includes(r) || r.owners.length > 0 || r.cells.some((c) => (c.entry?.application_level ?? 0) >= EXPERIENCED),
  );
  const further = rows.filter((r) => !relevant.includes(r));
  const families = (list: Row[]) => [...new Set(list.map((r) => r.area.family_id))].flatMap((f) => list.filter((r) => r.area.family_id === f));
  const empty = allRows.length - rows.length;
  return (
    <section className="space-y-6" id="komponenten" aria-labelledby={heading ? "ws-components-title" : undefined}>
      <div>
        {heading ? (
          <h2 id="ws-components-title" className="text-2xl font-semibold tracking-tight text-slate-950">{text(locale, "Fähigkeiten & Verantwortung", "Skills and responsibilities")}</h2>
        ) : null}
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          {text(locale,
            "Was ihr nach eigener Angabe mitbringt und was ihr verantworten möchtet – getrennt nebeneinander. Erfahrung ist kein Verantwortungswunsch, ein Verantwortungswunsch ist noch keine Rolle, und „extern lösbar“ sagt nichts über eure Kompetenz. Vereinbart wird im Founder Setup.",
            "Your self-reported experience and the responsibilities you would like to take on, shown separately. Experience does not imply a responsibility preference, and a preference is not an agreed role. External support being an option says nothing about your skills. Agreements are made in Founder Setup.")}
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm">{text(locale, "Es sind noch keine Angaben zu Fähigkeiten sichtbar.", "No skills entries are visible yet.")}</p>
      ) : (
        <>
          <div>
            <h3 className="text-lg font-semibold text-slate-950">{text(locale, "Wo Verantwortung noch offen ist", "Responsibilities to discuss")}</h3>
            {open.length ? (
              <ul className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
                {open.map((row) => (
                  <li key={row.area.area_id} className="ws-text-card px-4 py-3 text-sm leading-6">
                    <span className="font-semibold text-slate-950">{areaName(row.area.area_id, locale)}</span>
                    <span className="text-slate-700">
                      {" – "}
                      {row.states.includes("OPEN_INTERNAL")
                        ? text(locale, "bisher möchte es niemand verantworten", "No one has indicated that they want to take responsibility yet")
                        : row.states.includes("MULTI_COVERED")
                          ? `${text(locale, "mehrere möchten es verantworten:", "Several people would like to take responsibility:")} ${row.owners.map((o) => o.name).join(", ")}`
                          : locale === "en" ? `${row.externalPreference.join(", ")} would prefer external support; this area is classified as internal` : `${row.externalPreference.join(", ")} ${row.externalPreference.length === 1 ? "möchte" : "möchten"} es lieber extern lösen; der Bereich ist als intern einzuordnen`}
                      {row.sourcing === "component" || row.sourcing === "depends" ? text(locale, " · extern denkbar", " · external support is an option") : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-600">{text(locale, "In den Bereichen mit Angaben ist keine Verantwortung offen.", "No responsibilities are open in the areas with entries.")}</p>
            )}
          </div>

          {relevant.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-950">{text(locale, "Wer was mitbringt", "What each person brings")}</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {families(relevant).map((row) => (
                  <AreaBlock key={row.area.area_id} row={row} locale={locale} />
                ))}
              </div>
            </div>
          )}

          {further.length > 0 && (
            <details className="ws-details rounded-2xl border border-slate-200 bg-white/70 p-4">
              <summary className="cursor-pointer text-sm font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2">
                {text(locale, "Weitere Bereiche mit Angaben", "More areas with entries")} ({further.length})
              </summary>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {families(further).map((row) => (
                  <AreaBlock key={row.area.area_id} row={row} locale={locale} />
                ))}
              </div>
            </details>
          )}

          <p className="text-sm leading-6 text-slate-600">
            {empty > 0 ? locale === "en" ? `There are no entries for ${empty} other areas. This does not mean anything is missing. ` : `Zu ${empty} weiteren Bereichen hat niemand etwas angegeben – das heißt nicht, dass etwas fehlt. ` : ""}
            {text(locale, "Alle Angaben sind Selbstauskünfte. „Extern denkbar“ ist eine Eigenschaft des Bereichs und heißt noch nicht, dass etwas beauftragt ist.", "All entries are self-reported. External support being an option is a property of the area; it does not mean anyone has been commissioned.")}
          </p>
        </>
      )}
    </section>
  );
}
