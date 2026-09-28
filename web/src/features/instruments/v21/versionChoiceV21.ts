import {
  CURRENT_INSTRUMENT_ID,
  ALIGNMENT_V21_INSTRUMENT_ID,
  type InstrumentId,
} from "@/features/instruments/instruments";
import { REGISTRY_V21, getItemsV21 } from "@/features/instruments/v21/registryV21";

/**
 * Die Wahl zwischen den beiden Fassungen - und was sie wirklich bedeutet.
 *
 * ---------------------------------------------------------------------------
 * WAS DIE PERSON ENTSCHEIDET
 * ---------------------------------------------------------------------------
 *
 * Nicht „alt oder neu“, sondern: Bleibt mein bisheriger Report gültig, oder
 * fülle ich noch einmal aus? Beides ist erlaubt, beide Fassungen laufen
 * nebeneinander, und in keinem Fall geht etwas verloren.
 *
 * ---------------------------------------------------------------------------
 * DIE UNTERSCHIEDE KOMMEN AUS DEN DATEN, NICHT AUS EINEM WERBETEXT
 * ---------------------------------------------------------------------------
 *
 * Wo es geht, wird gezählt statt behauptet: die Zahl der Fragen und Bereiche
 * steht in der Registratur. Was sich nicht zählen lässt - dass es keine
 * Punktzahl mehr gibt -, steht als Satz da, aber als einer, der eine Folge
 * benennt und nicht eine Verbesserung verspricht.
 *
 * DER WICHTIGSTE SATZ IST DER UNANGENEHME. Ein Vergleich läuft nur zwischen
 * zwei Personen, die dieselbe Fassung ausgefüllt haben. Wer wechselt, während
 * sein Mitgründer bleibt, kann sich mit ihm nicht mehr vergleichen - und
 * umgekehrt. Das ist keine Schikane, sondern die Wahrheit über zwei
 * verschiedene Fragebögen. Es gehört an den Anfang und nicht ins
 * Kleingedruckte.
 */

export type VersionFact = {
  /** Wonach gefragt wird - die Zeile links. */
  aspect: string;
  previous: string;
  next: string;
};

/** Der Steckbrief beider Fassungen, soweit er sich zählen lässt. */
export function versionFacts(): VersionFact[] {
  const items = getItemsV21();
  return [
    {
      aspect: "Fragen",
      // Beide haben 36. Ich hatte hier zuerst "39 in zwei Teilen" stehen -
      // eine Zahl aus der Durchsicht der v2, nicht aus v1. Nachgezaehlt in
      // web/docs/founder-compatibility-item-registry-v1.json: 36 aktive
      // Items, dazu der Werteteil als eigener Fragebogen.
      previous: "36, dazu 10 zu Werten in einem zweiten Durchgang",
      next: `${items.length} in einem Durchgang`,
    },
    {
      aspect: "Bereiche",
      previous: "6 Dimensionen mit je einem Wert",
      next: `${REGISTRY_V21.sections.length} Gesprächsbereiche ohne Werte`,
    },
    {
      aspect: "Ergebnis",
      previous: "Werte je Dimension und eine Einordnung",
      // Das ist kein Verzicht aus Bescheidenheit: Zwei Fragen unter einer
      // Ueberschrift ergeben keine Skala, und eine Zahl daraus behauptet eine
      // Genauigkeit, die das Instrument nicht hat.
      next: "deine Antworten im Klartext, ohne Punktzahl",
    },
    {
      aspect: "Wenn du etwas nicht beantworten willst",
      previous: "die Frage bleibt leer",
      next: "es gibt einen Satz dafür, und der bleibt sichtbar",
    },
    {
      aspect: "Im Vergleich",
      previous: "Ähnlichkeit je Dimension",
      next: "Antwort neben Antwort, mit einer Liste zum Besprechen",
    },
  ];
}

export type ChoiceConsequence = { keeps: string[]; costs: string[] };

/**
 * Was jede Wahl behält und was sie kostet.
 *
 * BEI BEIDEN STEHT, DASS NICHTS VERLOREN GEHT. Die häufigste stille Sorge ist,
 * dass „neu machen“ das Alte überschreibt. Sie einmal auszuräumen kostet eine
 * Zeile.
 */
export const CHOICE_CONSEQUENCES: Record<"keep_previous" | "retake", ChoiceConsequence> = {
  keep_previous: {
    keeps: [
      "Dein bisheriger Report bleibt so, wie er ist.",
      "Du kannst die neue Fassung später immer noch ausfüllen.",
    ],
    costs: [
      "Mit jemandem, der die neue Fassung ausgefüllt hat, ist kein Vergleich möglich — es sind zwei verschiedene Fragebögen.",
    ],
  },
  retake: {
    keeps: [
      "Deine alten Antworten bleiben erhalten und lesbar; es wird nichts überschrieben.",
      "Du kannst weiterhin mit Leuten vergleichen, die bei der alten Fassung sind — über deinen alten Report.",
    ],
    costs: [
      "Der neue Fragebogen dauert noch einmal etwa eine halbe Stunde.",
      "Zur neuen Fassung gibt es noch keine Auswertung und keine Gesprächskarten — nur deine Antworten und den Vergleich.",
    ],
  },
};

/**
 * Beide Fassungen laufen nebeneinander - das ist keine Übergangslösung.
 *
 * `assessments.instrument_id` trennt sie, der Vergleich weigert sich zu
 * mischen, und beide Reports bleiben abrufbar. Wer will, füllt beide aus.
 */
export const VERSIONS: { id: InstrumentId; label: string; note: string }[] = [
  {
    id: CURRENT_INSTRUMENT_ID,
    label: "Die bisherige Fassung",
    note: "Vollständig ausgewertet, mit Report und Gesprächsvorbereitung.",
  },
  {
    id: ALIGNMENT_V21_INSTRUMENT_ID,
    label: "Die neue Fassung",
    note: "Im Test. Deine Antworten und der Vergleich stehen, die Auswertung noch nicht.",
  },
];

/**
 * Der Satz, der überall dabeisteht, wo jemand wählt.
 *
 * Er ist absichtlich der erste und nicht der letzte.
 */
export const MIXED_COMPARISON_WARNING =
  "Ein Vergleich läuft nur zwischen zwei Personen, die dieselbe Fassung ausgefüllt haben. " +
  "Das sind zwei verschiedene Fragebögen, keine zwei Versionen desselben.";
