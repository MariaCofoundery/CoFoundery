import { getFormatter, getTranslations } from "next-intl/server";

import { MarkV21 } from "@/features/instruments/v21/MarkV21";
import type { MarkScope } from "@/features/instruments/v21/markActionsV21";
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
 * Bei geordneten Stufen zeigt eine Punktreihe, WELCHE der Antworten gewählt
 * wurde. Das ist keine berechnete Zahl, sondern ein Bild der Antwort selbst -
 * und es steht NEBEN der Beschriftung, nie an ihrer Stelle.
 *
 * Der Unterschied zu einem Messwert: Hier wird nichts zusammengerechnet. „4.4
 * von 5“ wäre ein Mittelwert aus mehreren Fragen und damit eine Behauptung
 * über eine Skala, die es nicht gibt.
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
  /** Zu welchem Bogen die Markierung gehört. Ohne Angabe v2.1. */
  markScope?: MarkScope;
  markVentureId?: string;
};

export async function ReportViewV21({
  sections, orphans = [], marked = [], canMark = false, markScope, markVentureId,
}: Props) {
  // SERVERKOMPONENTE, und das bleibt sie. Alle sechs Stellen, die sie
  // benutzen, sind Seiten - das eigene Profil, die Advisor-Ansicht, der
  // Vergleich, die beiden Antwortenseiten und der Pilot. Damit kommen die
  // Texte aus derselben Quelle wie ueberall, und es gibt keine zweite
  // Uebersetzung fuer die Advisor-Ansicht.
  const t = await getTranslations("alignment.report");
  // Betraege und Daten tragen das Format der gelesenen Sprache, nicht
  // "de-DE". Ein Datum im deutschen Format in einer englischen Seite ist
  // dieselbe Art Fehler wie ein deutscher Satz dort.
  const format = await getFormatter();
  const copy: ValueCopy = {
    priority: (value: string) => t("priority", { value }),
    path: (value: string) => t("path", { value }),
    noExpectation: t("noExpectation"),
  };

  return (
    <div className="space-y-10">
      {orphans.length > 0 && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("orphans", { count: orphans.length })}
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
                      {t("openBadge")}
                    </span>
                    {entry.missing.label}
                  </p>
                ) : entry.value ? (
                  <Value value={entry.value} copy={copy} format={format} />
                ) : (
                  <p className="text-sm text-rose-700">{t("unreadable")}</p>
                )}
              </div>

              {canMark && (
                <MarkV21
                  itemId={entry.itemId}
                  initial={marked.includes(entry.itemId)}
                  scope={markScope}
                  ventureId={markVentureId}
                />
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

/**
 * Die Texte reisen als Werte herunter, nicht als Uebersetzer.
 *
 * `Value` ist keine Komponente mit eigener Lebensdauer, sondern eine
 * Verzweigung ueber die Art der Antwort. Sie selbst asynchron zu machen hiesse,
 * fuer jede einzelne Antwort die Sprachdatei anzufragen.
 */
type ValueCopy = {
  priority: (value: string) => string;
  path: (value: string) => string;
  noExpectation: string;
};

function Value({
  value,
  copy,
  format,
}: {
  value: ReadoutValue;
  copy: ValueCopy;
  format: Awaited<ReturnType<typeof getFormatter>>;
}) {
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
            <p className="mt-1 text-sm text-slate-600">{copy.priority(value.priority)}</p>
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
          <p className="pt-1 text-base text-slate-900">{copy.path(value.path)}</p>
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
          {format.number(value.amount)} {value.currency}
        </p>
      );

    case "perPerson":
      return (
        <ul className="space-y-0.5 text-base text-slate-900">
          {value.per.map((row, index) => (
            <li key={index}>
              {row.person}:{" "}
              {row.number === null ? (
                <span className="text-slate-600">{copy.noExpectation}</span>
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
          {format.dateTime(new Date(value.date), {
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
    /*
      AUSDRUECKLICH VERSTECKT FUER VORLESEPROGRAMME.
      Die Beschriftung der gewaehlten Antwort steht direkt daneben im Text -
      "manchmal". Die Punkte zeigen dasselbe noch einmal als Bild. Ein
      aria-label "Stufe 3 von 5" wuerde daraus eine Zahl machen, die sonst
      niemand sieht.
    */
    <span className="flex shrink-0 items-center gap-1" aria-hidden>
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
