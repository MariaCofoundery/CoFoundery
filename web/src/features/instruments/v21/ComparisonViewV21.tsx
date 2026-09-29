import type { ComparisonV21 } from "@/features/instruments/v21/comparisonDataV21";
import type { ItemComparison } from "@/features/instruments/v21/comparisonV21";
import type { ReadoutEntry } from "@/features/instruments/v21/readoutV21";

/**
 * Zwei Menschen nebeneinander.
 *
 * ---------------------------------------------------------------------------
 * KEINE ZAHL, KEINE AMPEL, KEINE SORTIERUNG NACH SCHWERE
 * ---------------------------------------------------------------------------
 *
 * Es gibt keinen Passungswert und keine Farbe, die „gut“ oder „schlecht“ sagt.
 * Grün für „gleich“ wäre schon die Bewertung: Zwei Menschen, die überall
 * dasselbe antworten, sind nicht das Ziel - sie sind nur ähnlich.
 *
 * Deshalb sind die Zustände in Grau gesetzt und unterscheiden sich durch das
 * WORT, nicht durch die Farbe. Nur „steht nebeneinander“ und „darüber wolltet
 * ihr sprechen“ bekommen einen Rahmen, weil sie zum Lesen einladen.
 */

const STATE_LABEL: Record<ItemComparison["state"], string> = {
  same: "gleich",
  different: "unterschiedlich",
  partly_same: "teils gleich",
  side_by_side: "nebeneinander",
  no_basis: "kein Vergleich",
};

const WHY_LABEL: Record<NonNullable<ItemComparison["why"]>, string> = {
  withheld_a: "hat eine Antwort zurückgehalten",
  withheld_b: "hat eine Antwort zurückgehalten",
  withheld_both: "beide haben zurückgehalten",
  unanswered_a: "noch nicht beantwortet",
  unanswered_b: "noch nicht beantwortet",
  unanswered_both: "von beiden noch nicht beantwortet",
  no_common_ground: "die beiden Antworten haben keine gemeinsame Grundlage",
};

/**
 * Die Gruppen in ihrer Reihenfolge - und mit Ueberschriften, die keine
 * Wertung tragen.
 *
 * "Gemeinsamkeiten" steht ausdruecklich MIT drin: Ein Report, der nur
 * Unterschiede zeigt, liest sich wie eine Maengelliste, und das ist er nicht.
 */
const AGENDA_GROUPS: { kind: string; label: string }[] = [
  { kind: "marked", label: "Ihr habt es markiert" },
  { kind: "commitment", label: "Zusagen, Ziele und Regeln" },
  { kind: "preference", label: "Wie ihr arbeitet" },
  { kind: "shared", label: "Worin ihr euch einig seid" },
];

type Props = { comparison: ComparisonV21; nameA: string; nameB: string };

export function ComparisonViewV21({ comparison, nameA, nameB }: Props) {
  return (
    <div className="space-y-10">
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-base font-semibold text-slate-900">Worüber ihr sprechen könnt</h2>
        <p className="mt-1 text-sm text-slate-600">
          Gruppiert nach Art, nicht nach Wichtigkeit: Zusagen und Regeln sind konkreter
          als Arbeitspräferenzen — schwerer sind sie deshalb nicht.
        </p>
        {comparison.agenda.length === 0 ? (
          <p className="mt-3 text-sm text-slate-700">
            Noch nichts. Das heißt nicht, dass ihr euch einig seid — es heißt, dass
            noch zu wenig beantwortet ist.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {AGENDA_GROUPS.map((group) => {
              const entries = comparison.agenda.filter((entry) => entry.kind === group.kind);
              if (entries.length === 0) return null;
              return (
                <div key={group.kind}>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    {group.label}
                  </p>
                  <ul className="mt-1 space-y-1.5">
                    {entries.map((entry) => (
                      <li key={entry.itemId} className="text-sm text-slate-800">
                        <span className="text-slate-500">{entry.section} — </span>
                        {entry.prompt}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {comparison.sections.map((group) => (
        <section key={group.section} className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">{group.section}</h2>

          {group.items.map((item) => (
            <div key={item.itemId} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-slate-600">{item.prompt}</p>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {STATE_LABEL[item.state]}
                </span>
              </div>

              {item.state === "no_basis" ? (
                // „Fehlt“ sieht nicht aus wie „passt nicht“: Es steht dabei,
                // WARUM es keinen Vergleich gibt.
                <p className="mt-3 text-sm text-slate-500">
                  {item.why ? WHY_LABEL[item.why] : "kein Vergleich möglich"}
                </p>
              ) : (
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <Column name={nameA} entry={item.a} />
                  <Column name={nameB} entry={item.b} />
                </div>
              )}

              {item.stepsApart !== null && item.stepsApart > 0 && (
                // Eine Beschreibung, kein Maß: Es gibt keinen Schwellwert, ab
                // dem „unterschiedlich“ zu „problematisch“ wird.
                <p className="mt-3 text-xs text-slate-500">
                  {item.stepsApart === 1 ? "eine Stufe" : `${item.stepsApart} Stufen`} auseinander
                </p>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

function Column({ name, entry }: { name: string; entry: ReadoutEntry | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{name}</p>
      <div className="mt-1">
        {!entry ? (
          <p className="text-sm text-slate-400">—</p>
        ) : entry.missing ? (
          <p className="text-sm text-slate-600">{entry.missing.label}</p>
        ) : (
          <Short value={entry} />
        )}
      </div>
    </div>
  );
}

/** Kurzfassung fürs Nebeneinander. Der ganze Text steht im eigenen Bericht. */
function Short({ value: entry }: { value: ReadoutEntry }) {
  const value = entry.value;
  if (!value) return <p className="text-sm text-rose-700">nicht lesbar</p>;

  switch (value.kind) {
    case "ordinal":
    case "choice":
      return <p className="text-sm text-slate-900">{value.label}</p>;
    case "choices":
      return (
        <ul className="list-disc pl-4 text-sm text-slate-900">
          {value.labels.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      );
    case "case":
      return (
        <div className="text-sm text-slate-900">
          {value.concerns.map((concern) => (
            <p key={concern.label} className="text-slate-600">
              {concern.label}: {concern.importance.label}
            </p>
          ))}
          <p className="mt-1">Weg: {value.path}</p>
        </div>
      );
    case "number":
      return (
        <p className="text-sm text-slate-900">
          {value.number} {value.unit}
        </p>
      );
    case "money":
      return (
        <p className="text-sm text-slate-900">
          {value.amount.toLocaleString("de-DE")} {value.currency}
        </p>
      );
    case "date":
      return <p className="text-sm text-slate-900">{value.date}</p>;
    case "text":
      return <p className="whitespace-pre-line text-sm text-slate-900">{value.text}</p>;
    case "entries":
      return (
        <ul className="list-disc pl-4 text-sm text-slate-900">
          {value.entries.map((line) => (
            <li key={line.entryId}>{line.text}</li>
          ))}
        </ul>
      );
    case "perEntry":
      return (
        <div className="space-y-1 text-sm text-slate-900">
          {value.entries.map((line, index) => (
            <p key={index}>
              <span className="text-slate-500">{line.about}: </span>
              {line.text}
            </p>
          ))}
        </div>
      );
    case "perPerson":
      return (
        <ul className="text-sm text-slate-900">
          {value.per.map((row, index) => (
            <li key={index}>
              {row.person}: {row.number === null ? "keine feste Erwartung" : `${row.number} ${row.unit}`}
            </li>
          ))}
        </ul>
      );
    case "windows":
      return (
        <ul className="text-sm text-slate-900">
          {value.windows.map((window, index) => (
            <li key={index}>
              {window.day} {window.from}–{window.to}{" "}
              <span className="text-slate-500">({window.timezone})</span>
            </li>
          ))}
        </ul>
      );
  }
}
