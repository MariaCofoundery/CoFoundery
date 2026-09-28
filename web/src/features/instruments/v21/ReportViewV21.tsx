import { MarkV21 } from "@/features/instruments/v21/MarkV21";
import type { ReadoutEntry, ReadoutValue } from "@/features/instruments/v21/readoutV21";

/**
 * Der eigene Bericht - was du geantwortet hast, lesbar.
 *
 * ---------------------------------------------------------------------------
 * KEINE ZAHL, KEIN BALKEN, KEIN PROFIL
 * ---------------------------------------------------------------------------
 *
 * Hier steht keine Punktzahl, kein Prozentwert, keine Ampel und keine
 * Einordnung im Vergleich zu anderen. Das Instrument gibt das nicht her - es
 * hat keine Normstichprobe, keine bestätigten Faktoren und ausdrücklich keine
 * Dimensionswerte.
 *
 * Bei geordneten Stufen wird die Stelle als Punktreihe gezeigt („3 von 5“),
 * weil das beim Lesen hilft. Sie steht NEBEN der Beschriftung und nie an ihrer
 * Stelle: Wer nur die Punkte sieht, liest wieder einen Messwert.
 *
 * Bei einer Handlungswahl gibt es keine Punktreihe. Eine Wahl ohne Rangfolge
 * hat keine Stelle, und eine zu zeigen wäre eine Behauptung über Nähe.
 */

type Props = {
  sections: { section: string; entries: ReadoutEntry[] }[];
  /** Was nach einer Änderung ins Leere zeigt - benannt, nicht gelöscht. */
  orphans?: { itemId: string; entryIds: string[] }[];
  /** Worüber diese Person sprechen möchte. Keine Aussage über die Antwort. */
  marked?: readonly string[];
  /**
   * Darf hier markiert werden?
   *
   * STANDARDMÄSSIG NEIN, und das ist Absicht. Dieselbe Ansicht zeigt auch ein
   * Advisor fremde Antworten - ein Häkchen an einer Antwort, die einem nicht
   * gehört, wäre dort falsch. Die Datenbank würde den Schreibversuch
   * abweisen, aber ein Bedienelement, das nichts tun darf, ist ein Fehler in
   * der Anzeige und keine Sicherheitsstufe.
   *
   * Wer markieren können soll, muss es hinschreiben.
   */
  canMark?: boolean;
};

export function ReportViewV21({ sections, orphans = [], marked = [], canMark = false }: Props) {
  return (
    <div className="space-y-10">
      {orphans.length > 0 && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Zu {orphans.length === 1 ? "einer Frage" : `${orphans.length} Fragen`} steht
          unten eine Antwort, die sich auf eine Grenze bezieht, die du inzwischen
          gestrichen hast. Sie ist nicht gelöscht — du kannst sie stehen lassen oder
          im Fragebogen überschreiben.
        </p>
      )}

      {sections.map((group) => (
        <section key={group.section} className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">{group.section}</h2>

          {group.entries.map((entry) => (
            <div key={entry.itemId} className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">{entry.prompt}</p>

              <div className="mt-2">
                {entry.missing ? (
                  // Ein Auslassungsgrund ist eine Auskunft, keine Lücke - und
                  // wird deshalb wie eine Antwort gesetzt, nicht ausgegraut.
                  <p className="text-base text-slate-900">
                    <span className="mr-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      offen
                    </span>
                    {entry.missing.label}
                  </p>
                ) : entry.value ? (
                  <Value value={entry.value} />
                ) : (
                  <p className="text-sm text-rose-700">
                    Diese Antwort lässt sich nicht lesen. Das ist ein Fehler bei uns —
                    sie ist gespeichert und nicht verloren.
                  </p>
                )}
              </div>

              {canMark && (
                <MarkV21 itemId={entry.itemId} initial={marked.includes(entry.itemId)} />
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

function Value({ value }: { value: ReadoutValue }) {
  switch (value.kind) {
    case "ordinal":
      return (
        <div className="flex items-center gap-3">
          <p className="text-base text-slate-900">{value.label}</p>
          <Dots position={value.position} of={value.of} />
        </div>
      );

    case "choice":
      return (
        <div>
          <p className="text-base text-slate-900">{value.label}</p>
          {value.text && <p className="mt-1 text-sm text-slate-600">{value.text}</p>}
        </div>
      );

    case "choices":
      return (
        <div>
          <ul className="list-disc space-y-0.5 pl-5 text-base text-slate-900">
            {value.labels.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
          {value.priority && (
            <p className="mt-1 text-sm text-slate-600">Vorrang: {value.priority}</p>
          )}
          {value.texts.map((text) => (
            <p key={text} className="mt-1 text-sm text-slate-600">
              {text}
            </p>
          ))}
        </div>
      );

    case "case":
      return (
        <div className="space-y-2">
          {value.concerns.map((concern) => (
            <div key={concern.label} className="flex items-center justify-between gap-4">
              <p className="text-sm text-slate-800">{concern.label}</p>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm text-slate-600">{concern.importance.label}</span>
                <Dots position={concern.importance.position} of={concern.importance.of} />
              </div>
            </div>
          ))}
          <p className="pt-1 text-base text-slate-900">Weg: {value.path}</p>
        </div>
      );

    case "number":
      return (
        <div>
          <p className="text-base text-slate-900">
            {value.number} {value.unit}
          </p>
          {value.condition && <p className="mt-1 text-sm text-slate-600">{value.condition}</p>}
        </div>
      );

    case "money":
      // Mit Währung, immer. Beträge verschiedener Länder dürfen nicht
      // stillschweigend verglichen werden.
      return (
        <p className="text-base text-slate-900">
          {value.amount.toLocaleString("de-DE")} {value.currency}
        </p>
      );

    case "perPerson":
      return (
        <ul className="space-y-0.5 text-base text-slate-900">
          {value.per.map((row, index) => (
            <li key={index}>
              {row.person}:{" "}
              {row.number === null ? (
                <span className="text-slate-600">keine feste Erwartung</span>
              ) : (
                `${row.number} ${row.unit}`
              )}
            </li>
          ))}
        </ul>
      );

    case "windows":
      return (
        <ul className="space-y-0.5 text-base text-slate-900">
          {value.windows.map((window, index) => (
            <li key={index}>
              {window.day} {window.from}–{window.to}{" "}
              <span className="text-sm text-slate-500">({window.timezone})</span>
            </li>
          ))}
        </ul>
      );

    case "date":
      return (
        <p className="text-base text-slate-900">
          {new Date(value.date).toLocaleDateString("de-DE", {
            day: "numeric", month: "long", year: "numeric",
          })}
        </p>
      );

    case "text":
      return <p className="whitespace-pre-line text-base text-slate-900">{value.text}</p>;

    case "entries":
      return (
        <ul className="list-disc space-y-1 pl-5 text-base text-slate-900">
          {value.entries.map((entry) => (
            <li key={entry.entryId}>{entry.text}</li>
          ))}
        </ul>
      );

    case "perEntry":
      return (
        <div className="space-y-2">
          {value.entries.map((entry, index) => (
            <div key={index}>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {entry.about}
              </p>
              <p className="text-base text-slate-900">{entry.text}</p>
            </div>
          ))}
        </div>
      );
  }
}

/**
 * Die Stelle in der Reihenfolge, als Punkte.
 *
 * NUR bei geordneten Stufen. Sie steht neben der Beschriftung, nie an ihrer
 * Stelle - wer nur die Punkte sieht, liest wieder einen Messwert.
 */
function Dots({ position, of }: { position: number; of: number }) {
  return (
    <span
      className="flex shrink-0 items-center gap-1"
      aria-label={`Stufe ${position} von ${of}`}
    >
      {Array.from({ length: of }, (_, index) => (
        <span
          key={index}
          aria-hidden
          className={`h-1.5 w-1.5 rounded-full ${
            index < position ? "bg-slate-700" : "bg-slate-200"
          }`}
        />
      ))}
    </span>
  );
}
