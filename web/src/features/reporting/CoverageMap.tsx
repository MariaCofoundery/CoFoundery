import {
  COVERAGE_STATES,
  type CoverageState,
  type FounderProfileCoverage as Coverage,
} from "@/features/reporting/founderProfileCoverage";

/**
 * Die Deckungskarte, gezeichnet.
 *
 * Heisst `CoverageMap` und nicht `FounderProfileCoverage`, weil daneben die
 * Rechnung `founderProfileCoverage.ts` liegt - zwei Dateinamen, die sich nur
 * in der Gross- und Kleinschreibung unterscheiden, sind auf einem Mac
 * dieselbe Datei.
 *
 * Die Begruendung, warum das ein Balken aus Bereichen ist und kein Netzdiagramm,
 * steht bei der Rechnung in `founderProfileCoverage.ts`. Hier nur die Folgen
 * davon fuer das Bild:
 *
 * DER BALKEN IST SCHMUCK, DIE ZAHLEN SIND DER INHALT. Er ist `aria-hidden`, und
 * dieselbe Auskunft steht als Text daneben. Wer mit einem Screenreader liest
 * oder Farben nicht unterscheidet, verliert nichts.
 *
 * DIE FARBEN SIND EINE HELLIGKEITSREIHE, KEINE AMPEL. Von kraeftig ("dazu ist
 * alles beantwortet") bis blass ("darueber habe ich nichts gesagt"). Gruen und
 * Rot nebeneinander wuerden aus einer Auskunft ueber den Umfang des Gespraechs
 * ein Zeugnis machen.
 */

const STATE_COLOR: Record<CoverageState, string> = {
  answered: "bg-emerald-400",
  levelled: "bg-emerald-200",
  named: "bg-slate-300",
  unspoken: "bg-slate-100",
};

export function CoverageMap({
  coverage,
  copy,
}: {
  coverage: Coverage;
  copy: {
    title: string;
    intro: string;
    familyLabel: (familyId: string) => string;
    stateLabel: (state: CoverageState) => string;
    /** "3 von 7 Bereichen" je Familie. */
    familyCount: (entered: number, total: number) => string;
    familyUnspoken: string;
    basis: string;
    /** Welche Rollen abgedeckt sind - nach Faltin. */
    rolesTitle: string;
    rolesIntro: string;
    rolesNone: string;
    rolesOpen: (count: number) => string;
    rolesCaveat: string;
    areaLabel: (areaId: string) => string;
  };
}) {
  if (coverage.enteredCount === 0) return null;

  return (
    <div className="page-section rounded-2xl border border-slate-200/80 bg-white/95 p-6 print:rounded-none print:border-none print:px-0">
      <h3 className="text-base font-semibold text-slate-900">{copy.title}</h3>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{copy.intro}</p>

      <ul className="mt-5 grid gap-2">
        {coverage.families.map((family) => {
          const isUnspoken = family.enteredCount === 0;

          return (
            <li
              key={family.familyId}
              className="grid gap-1 rounded-xl px-1 py-2 sm:grid-cols-[13rem_1fr_9rem] sm:items-center sm:gap-4"
            >
              <p
                className={`text-sm font-medium ${isUnspoken ? "text-slate-400" : "text-slate-900"}`}
              >
                {copy.familyLabel(family.familyId)}
              </p>

              {/* Ein Balken aus den einzelnen Bereichen der Familie - nicht
                  ein Balken, der zu Prozent gefuellt ist. Der Unterschied ist
                  der zwischen "drei von sieben besprochen" und "43 %". */}
              <div aria-hidden className="flex h-2 gap-0.5 overflow-hidden rounded-full">
                {family.areas.map((area) => (
                  <span
                    key={area.areaId}
                    className={`h-2 flex-1 ${STATE_COLOR[area.state]}`}
                  />
                ))}
              </div>

              <p
                className={`text-xs leading-5 sm:text-right ${
                  isUnspoken ? "text-slate-400" : "text-slate-600"
                }`}
              >
                {isUnspoken
                  ? copy.familyUnspoken
                  : copy.familyCount(family.enteredCount, family.areas.length)}
              </p>
            </li>
          );
        })}
      </ul>

      <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-5 text-slate-600">
        {COVERAGE_STATES.map((state) => (
          <li key={state} className="flex items-center gap-1.5">
            <span aria-hidden className={`h-2 w-4 rounded-full ${STATE_COLOR[state]}`} />
            {copy.stateLabel(state)}
          </li>
        ))}
      </ul>

      {/* ------------------------------------------------------------------
          Welche Rollen abgedeckt sind.

          NACH FALTIN, und erst zwei Bedingungen zusammen sagen etwas: Der
          Bereich gehoert ins Team - was einkaufbar ist, braucht dort
          niemanden -, UND die Person will ihn verantworten. Etwas zu koennen
          ist nicht dasselbe wie es zu uebernehmen.

          KEINE NOTE. Die Anwendungsstufe wird hier nicht verrechnet; eine
          "Rollendeckung" mit einer Zahl waere wieder eine Bewertung von
          Menschen. Es ist eine Liste, keine Punktzahl.
          ------------------------------------------------------------------ */}
      <div className="mt-6 border-t border-slate-200 pt-5">
        <h3 className="text-sm font-semibold text-slate-900">{copy.rolesTitle}</h3>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{copy.rolesIntro}</p>

        {coverage.roles.covered.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {coverage.roles.covered.map((areaId) => (
              <li
                key={areaId}
                className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-900"
              >
                {copy.areaLabel(areaId)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm leading-6 text-slate-500">{copy.rolesNone}</p>
        )}

        {/* Besprochen, gehoert ins Team - und niemand will es uebernehmen.
            Das ist keine Luecke im Menschen, sondern eine offene Frage im
            Vorhaben, und sie gehoert genannt. */}
        {coverage.roles.spokenNotOwned.length > 0 ? (
          <p className="mt-3 text-xs leading-5 text-slate-500">
            {copy.rolesOpen(coverage.roles.spokenNotOwned.length)}
          </p>
        ) : null}

        <p className="mt-3 text-xs leading-5 text-slate-500">{copy.rolesCaveat}</p>
      </div>

      {/* Worauf die Karte beruht, gehoert darunter - sonst liest sie sich als
          Befund ueber einen Menschen statt als Auskunft ueber den Umfang
          seiner eigenen Angaben. */}
      <p className="mt-4 text-xs leading-5 text-slate-500">{copy.basis}</p>
    </div>
  );
}
