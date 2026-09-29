import type { ReadoutEntry, ReadoutValue } from "@/features/instruments/v21/readoutV21";
import type { ItemComparison } from "@/features/instruments/v21/comparisonV21";

/**
 * Was in ein Übersichtsbild gehört - und was nicht.
 *
 * ---------------------------------------------------------------------------
 * ALS EIGENE FUNKTIONEN, WEIL ES DIE EIGENTLICHE REGEL IST
 * ---------------------------------------------------------------------------
 *
 * Ob eine Antwort eine Stelle auf einer Achse bekommt, ist keine Frage der
 * Darstellung, sondern eine Aussage über das Instrument: Nur geordnete Stufen
 * haben eine Reihenfolge. Eine Handlungswahl („wann sprichst Du einen Einwand
 * an“) hat keine - sie auf eine Achse zu setzen wäre eine Behauptung über
 * Nähe, die es nicht gibt.
 *
 * In einer Komponente ließe sich das nicht prüfen, ohne sie zu zeichnen. Hier
 * schon.
 */

export type OrdinalValue = Extract<ReadoutValue, { kind: "ordinal" }>;

export function ordinalOf(entry: ReadoutEntry | null | undefined): OrdinalValue | null {
  return entry?.value?.kind === "ordinal" ? entry.value : null;
}

export type MapRow = { itemId: string; prompt: string; ordinal: OrdinalValue };
export type MapGroup = { section: string; rows: MapRow[] };

/**
 * Die Zeilen des eigenen Bildes.
 *
 * Ein Auslassungsgrund kommt NICHT vor. „Kann ich noch nicht einschätzen“ ist
 * eine vollwertige Auskunft, aber keine Stelle auf einer Achse - sie als
 * Mitte zu zeichnen wäre genau der Fehler, wegen dem es die Auslassungsgründe
 * überhaupt gibt.
 */
export function workMapGroups(
  sections: { section: string; entries: ReadoutEntry[] }[],
): MapGroup[] {
  return sections
    .map((group) => ({
      section: group.section,
      rows: group.entries.flatMap((entry) => {
        const ordinal = ordinalOf(entry);
        return ordinal ? [{ itemId: entry.itemId, prompt: entry.prompt, ordinal }] : [];
      }),
    }))
    .filter((group) => group.rows.length > 0);
}

export type DumbbellRow = {
  itemId: string;
  prompt: string;
  a: OrdinalValue;
  b: OrdinalValue;
};

/**
 * Die Zeilen des gemeinsamen Bildes.
 *
 * NUR WO BEIDE GEANTWORTET HABEN. Eine Hantel mit einem Gewicht ist keine
 * Hantel: Wo eine Seite fehlt, gibt es keinen Unterschied zu zeigen, sondern
 * eine Lücke - und ob sie „nicht freigegeben“ oder „nicht beantwortet“ heißt,
 * steht in der Liste darunter und nicht in einem Bild.
 *
 * Und nur wo beide DIESELBE Stufenzahl haben. Zwei Antworten aus Skalen
 * verschiedener Länge auf eine Achse zu legen hieße, sie vergleichbar zu
 * machen, indem man sie streckt.
 */
export function differenceGroups(
  sections: { section: string; items: ItemComparison[] }[],
): { section: string; rows: DumbbellRow[] }[] {
  return sections
    .map((group) => ({
      section: group.section,
      rows: group.items.flatMap((item) => {
        const a = ordinalOf(item.a);
        const b = ordinalOf(item.b);
        if (!a || !b || a.of !== b.of) return [];
        return [{ itemId: item.itemId, prompt: item.prompt, a, b }];
      }),
    }))
    .filter((group) => group.rows.length > 0);
}

/**
 * Die sechs Ziele mit ihrer Wichtigkeit - für das Richtungsbild.
 *
 * ---------------------------------------------------------------------------
 * SECHS ZEILEN UND KEIN RADAR
 * ---------------------------------------------------------------------------
 *
 * Die Spezifikation empfiehlt für den Desktop ein Radar-Diagramm. Es wird
 * keins: Ein Radar über sechs Achsen macht aus sechs Antworten eine FLÄCHE,
 * und eine Fläche lädt dazu ein, sie mit einer anderen zu vergleichen —
 * „größer" heißt dann „ehrgeiziger". Das wäre ein Gesamtwert über einem
 * Instrument, das ausdrücklich keinen hat.
 *
 * Sechs Zeilen nebeneinander zeigen dasselbe, ohne es zu addieren.
 *
 * Und ohne Zahl: Die Spezifikation schreibt „██████████ 5". Die Ziffer fällt
 * weg, die Beschriftung bleibt.
 */
export type DirectionRow = {
  itemId: string;
  label: string;
  ordinal: OrdinalValue | null;
  /** Der Grund, wenn jemand nicht geantwortet hat. Keine Lücke, eine Auskunft. */
  missing: { code: string; label: string } | null;
  /** Von der Person als besonders wichtig markiert (S01_top). */
  top: boolean;
};

export function directionRows(
  entries: ReadoutEntry[],
  items: { itemId: string; shortLabel?: string; prompt: string }[],
): DirectionRow[] {
  const nachId = new Map(entries.map((entry) => [entry.itemId, entry]));

  // Die Vorrangfrage nennt die Ziele mit ihrem ganzen Satz - so stehen sie
  // dort zur Wahl. Verglichen wird deshalb ueber den Satz und nicht ueber eine
  // Kennung, die es in der Antwort gar nicht gibt.
  const top = nachId.get("S01_top");
  const gewaehlt = new Set(
    top?.value?.kind === "choices" ? top.value.labels : [],
  );

  return items
    .filter((item) => /^S01[a-f]$/.test(item.itemId))
    .map((item) => {
      const entry = nachId.get(item.itemId);
      return {
        itemId: item.itemId,
        label: item.shortLabel ?? item.prompt,
        ordinal: ordinalOf(entry),
        missing: entry?.missing ?? null,
        top: gewaehlt.has(item.prompt),
      };
    });
}
