import type { ReadoutEntry } from "@/features/instruments/v21/readoutV21";
import type { ItemComparison } from "@/features/instruments/v21/comparisonV21";
import {
  workMapGroups,
  differenceGroups,
  directionRows,
  type DirectionRow,
} from "@/features/instruments/align/mapRows";
import type { ReadoutEntry as Entry } from "@/features/instruments/v21/readoutV21";

/**
 * Die Übersichtsbilder - und was sie ausdrücklich NICHT sind.
 *
 * ---------------------------------------------------------------------------
 * HIER WIRD NICHTS ZUSAMMENGERECHNET
 * ---------------------------------------------------------------------------
 *
 * Die MVP-Spezifikation wollte `mean(A01, A02)` und „4.4 / 5“. Die
 * Master-Arbeitsfassung verbietet in §8.1 genau das: „geordnete Kategorien
 * dürfen intern codiert, aber nicht automatisch als psychologische Messwerte
 * ausgegeben werden“. Maria am 29.09.2026: „keine Zahlen. Im Report. Die sind
 * irreführend.“
 *
 * Also: ein Punkt je Antwort, an der Stelle, die die Person gewählt hat. Kein
 * Abschnittswert, kein Mittelwert, keine Zahl neben dem Bild. Was hier steht,
 * ist die Antwort selbst - nur nebeneinander statt untereinander.
 *
 * Der Unterschied ist nicht kosmetisch. Ein Abschnittswert behauptet, dass die
 * Fragen eines Abschnitts dasselbe messen und sich verrechnen lassen. Dafür
 * gibt es hier weder eine Normstichprobe noch bestätigte Faktoren.
 *
 * ---------------------------------------------------------------------------
 * NUR GEORDNETE ANTWORTEN BEKOMMEN EINE STELLE
 * ---------------------------------------------------------------------------
 *
 * Eine Handlungswahl („wann sprichst du einen Einwand an“) hat keine
 * Reihenfolge. Sie auf eine Achse zu setzen wäre eine Behauptung über Nähe,
 * die es nicht gibt. Diese Fragen stehen im Bild nicht - sie stehen in der
 * Liste darunter, wo sie hingehören.
 *
 * ---------------------------------------------------------------------------
 * KEIN ROT, KEIN GRÜN
 * ---------------------------------------------------------------------------
 *
 * Ein Unterschied ist kein Fehler. Farbe, die das eine gut und das andere
 * schlecht nennt, entscheidet etwas, das den beiden gehört.
 */

const SCHRITTE = "flex items-center gap-1";

function Punktreihe({ position, of }: { position: number; of: number }) {
  return (
    <span className={SCHRITTE} aria-hidden="true">
      {Array.from({ length: of }, (_, index) => (
        <span
          key={index}
          className={`h-2 w-2 rounded-full ${
            index + 1 === position ? "bg-slate-900" : "bg-slate-200"
          }`}
        />
      ))}
    </span>
  );
}

/**
 * Das eigene Arbeitsprofil auf einen Blick.
 *
 * Die Abschnittsüberschrift trägt die Bedeutung, die Zeile die Antwort. Welche
 * Frage zu welcher Zeile gehört, steht in der Liste darunter - hier geht es um
 * das Bild, nicht um die Einzelfrage. Der volle Fragetext hängt trotzdem an
 * der Zeile, für alle, die ihn wissen wollen.
 */
export function WorkMap({
  sections,
}: {
  sections: { section: string; entries: ReadoutEntry[] }[];
}) {
  // Welche Antwort eine Stelle bekommt, entscheidet mapRows.ts - dort ist es
  // geprueft. Hier wird nur gezeichnet.
  const gruppen = workMapGroups(sections);

  // Ohne geordnete Antworten gibt es kein Bild. Ein leerer Rahmen mit
  // Ueberschrift saehe aus, als fehlte etwas.
  if (gruppen.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-900">Auf einen Blick</h2>
      <p className="mt-1 text-sm text-slate-600">
        Deine Antworten nebeneinander — ein Punkt je Antwort, an der Stelle, die du
        gewählt hast. Kein Abschnittswert und keine Punktzahl: Was hier steht, ist
        dasselbe wie unten, nur kompakter. Fragen ohne Reihenfolge stehen nur unten.
      </p>

      <div className="mt-5 space-y-5">
        {gruppen.map((group) => (
          <div key={group.section}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {group.section}
            </p>
            <ul className="mt-2 space-y-1.5">
              {group.rows.map((row) => (
                <li key={row.itemId} className="flex items-center gap-3" title={row.prompt}>
                  <Punktreihe position={row.ordinal.position} of={row.ordinal.of} />
                  <span className="text-sm text-slate-900">{row.ordinal.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Zwei Menschen auf einer Achse.
 *
 * ---------------------------------------------------------------------------
 * NUR WO BEIDE GEANTWORTET HABEN
 * ---------------------------------------------------------------------------
 *
 * Eine Hantel mit einem Gewicht ist keine Hantel. Wo eine Seite fehlt, gibt es
 * keinen Unterschied zu zeigen - nur eine Lücke, und die steht in der Liste
 * darunter mit ihrem Grund („nicht freigegeben“ ist etwas anderes als „noch
 * nicht beantwortet“).
 *
 * ---------------------------------------------------------------------------
 * KEINE ABSTANDSZAHL
 * ---------------------------------------------------------------------------
 *
 * `stepsApart` gab es einmal und ist bewusst entfernt worden. Eine Zahl neben
 * zwei Antworten wird zu DER Zahl, über die gesprochen wird - und „ihr liegt 2
 * auseinander“ behauptet, dass zwei Stufen bei jeder Frage dasselbe bedeuten.
 * Die Länge der Linie sagt genug.
 */
export function DifferenceMap({
  sections,
  nameA,
  nameB,
}: {
  sections: { section: string; items: ItemComparison[] }[];
  nameA: string;
  nameB: string;
}) {
  const gruppen = differenceGroups(sections);

  if (gruppen.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-900">Wo ihr auseinanderliegt</h2>
      <p className="mt-1 text-sm text-slate-600">
        Nur die Fragen, die ihr beide beantwortet habt und die eine Reihenfolge haben.
        Ein weiter Abstand heißt nicht, dass etwas nicht passt — er heißt, dass ihr
        darüber noch nicht gesprochen habt.
      </p>

      <p className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-900" aria-hidden="true" />
          {nameA}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full border-2 border-slate-900 bg-white"
            aria-hidden="true"
          />
          {nameB}
        </span>
      </p>

      <div className="mt-5 space-y-6">
        {gruppen.map((group) => (
          <div key={group.section}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {group.section}
            </p>
            <ul className="mt-3 space-y-4">
              {group.rows.map((row) => (
                <li key={row.itemId}>
                  <p className="text-sm text-slate-700">{row.prompt}</p>
                  <div className="mt-2">
                    <Hantel a={row.a.position} b={row.b.position} of={row.a.of} />
                  </div>
                  {/* Die Beschriftungen stehen dabei, nicht nur die Punkte.
                      Ein Bild ohne Worte laedt dazu ein, den Abstand zu
                      deuten statt die Antworten zu lesen. */}
                  <p className="mt-1.5 text-sm text-slate-900">
                    {nameA}: {row.a.label} · {nameB}: {row.b.label}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function Hantel({ a, b, of }: { a: number; b: number; of: number }) {
  const anteil = (position: number) => ((position - 1) / (of - 1)) * 100;
  const von = Math.min(anteil(a), anteil(b));
  const bis = Math.max(anteil(a), anteil(b));

  return (
    <div className="relative h-4" aria-hidden="true">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-slate-200" />
      <div
        className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-slate-400"
        style={{ left: `${von}%`, width: `${bis - von}%` }}
      />
      {/* Die Marke fuer B zuerst, damit die gefuellte Marke fuer A oben
          liegt, wenn beide an derselben Stelle stehen - sonst sieht
          Gleichstand aus wie eine fehlende Antwort. */}
      <span
        className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-900 bg-white"
        style={{ left: `${anteil(b)}%` }}
      />
      <span
        className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-900"
        style={{ left: `${anteil(a)}%` }}
      />
    </div>
  );
}

/**
 * Wohin das Vorhaben soll - sechs Ziele nebeneinander.
 *
 * ---------------------------------------------------------------------------
 * KEIN RADAR, UND DAS IST KEINE GESCHMACKSFRAGE
 * ---------------------------------------------------------------------------
 *
 * Ein Radar über sechs Achsen macht aus sechs Antworten eine FLÄCHE, und eine
 * Fläche lädt dazu ein, sie mit einer anderen zu vergleichen — „größer" hieße
 * dann „ehrgeiziger". Das wäre ein Gesamtwert über einem Instrument, das
 * ausdrücklich keinen hat.
 *
 * ---------------------------------------------------------------------------
 * EIN OFFENES ZIEL IST KEINE NULL
 * ---------------------------------------------------------------------------
 *
 * Wer „habe ich noch nicht entschieden" wählt, bekommt keine leere Zeile und
 * keinen Punkt ganz links. Er bekommt seinen Satz — sonst sähe eine
 * unentschiedene Richtung aus wie eine abgelehnte.
 */
export function VentureDirection({
  entries,
  items,
}: {
  entries: Entry[];
  items: { itemId: string; shortLabel?: string; prompt: string }[];
}) {
  const rows = directionRows(entries, items);
  const beantwortet = rows.filter((row) => row.ordinal || row.missing);

  if (beantwortet.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-900">Wohin es gehen soll</h2>
      <p className="mt-1 text-sm text-slate-600">
        Sechs Ziele nebeneinander, jedes mit der Wichtigkeit, die du ihm gegeben hast.
        Sie werden nicht verrechnet — keins geht auf Kosten eines anderen, und es gibt
        keine Summe.
      </p>

      <ul className="mt-5 space-y-3">
        {rows.map((row) => (
          <li key={row.itemId} className="sm:flex sm:items-center sm:gap-4">
            <span className="block text-sm text-slate-700 sm:w-64 sm:shrink-0">
              {row.label}
              {/* Die Markierung sagt: dieses hier zuerst. Sie ist keine
                  hoehere Stufe - man kann ein "mittel" wichtiges Ziel
                  voranstellen, weil es gerade dran ist. */}
              {row.top && (
                <span className="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-white">
                  zuerst
                </span>
              )}
            </span>
            <span className="mt-1 flex items-center gap-3 sm:mt-0">
              {row.ordinal ? (
                <>
                  <Punktreihe position={row.ordinal.position} of={row.ordinal.of} />
                  <span className="text-sm text-slate-900">{row.ordinal.label}</span>
                </>
              ) : (
                <span className="text-sm text-slate-500">
                  {row.missing?.label ?? "noch keine Angabe"}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
