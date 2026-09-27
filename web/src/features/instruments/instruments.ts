/**
 * Welche Fassung des Fragebogens gemeint ist.
 *
 * SCHRITT 0 DER NEUFASSUNG (siehe `docs/instrument-v2-architektur.md`). Bis
 * zur Migration 20261053120000 wusste keine Antwort, zu welchem Instrument
 * sie gehört - weder `assessments` noch `questions` noch `choices` trugen eine
 * Version. Ein Wechsel wäre damit keine neue Fassung gewesen, sondern eine
 * stille Umdeutung aller bisherigen Antworten.
 *
 * ---------------------------------------------------------------------------
 * WARUM DIESE DATEI SO KLEIN IST UND TROTZDEM WICHTIG
 * ---------------------------------------------------------------------------
 *
 * Es gibt 26 Stellen im Code, die "den neuesten abgegebenen Fragebogen" einer
 * Person lesen. Der eindeutige Index "einer je Person und Modul" wurde am
 * 21.02.2026 entfernt - mehrere sind also längst möglich. Sobald es eine
 * zweite Fassung gibt, läse jede dieser Stellen stillschweigend die neue,
 * auch wenn die Person ausdrücklich bei der alten bleiben wollte.
 *
 * Deshalb nennt ab jetzt jede dieser Stellen die Fassung, die sie meint. Diese
 * Datei ist der eine Ort, an dem steht, welche das gerade ist - und nicht
 * fünfundzwanzig Zeichenketten quer durch den Code.
 */

/**
 * Die Fassungen, die es gibt.
 *
 * Die Liste steht hier UND in der Tabelle `instruments`. Das ist eine
 * bewusste Doppelung: Der Code braucht sie zur Übersetzungszeit, die
 * Datenbank braucht sie für den Fremdschlüssel. Ein Test hält beide
 * zusammen - die Kennungen entstehen in Migrationen, nicht zur Laufzeit.
 */
export const INSTRUMENT_IDS = [
  "founder-compatibility-v1",
  /**
   * Seit 27.09.2026 vorhanden, Status `draft` in der Tabelle: referenzierbar,
   * kann Antworten tragen, wird aber niemandem vorgelegt. Ohne diesen
   * Zwischenzustand gaebe es nur "fertig" oder "gibt es nicht" - und der
   * Umstieg muesste an einem einzigen Tag passieren.
   */
  "founder-alignment-v2",
] as const;
export type InstrumentId = (typeof INSTRUMENT_IDS)[number];

/**
 * Was neuen Menschen vorgelegt wird.
 *
 * EINE KONSTANTE UND KEINE ABFRAGE. Der Status steht zwar auch in der
 * Datenbank (`instruments.status`), aber welche Fassung die Anwendung
 * ausliefert, ist eine Eigenschaft dieses Codes: Die Fragen, die Auswertung
 * und die Texte liegen hier. Eine Datenbankzeile, die auf eine Fassung zeigt,
 * deren Code es nicht gibt, wäre ein Versprechen ohne Deckung.
 */
export const CURRENT_INSTRUMENT_ID: InstrumentId = "founder-compatibility-v1";

/**
 * Die Neufassung - noch im Bau.
 *
 * ABSICHTLICH NICHT `CURRENT_INSTRUMENT_ID`. Solange das hier zwei
 * verschiedene Konstanten sind, kann nichts versehentlich v2 ausliefern: Wer
 * v2 meint, muss es hinschreiben.
 */
export const ALIGNMENT_V2_INSTRUMENT_ID: InstrumentId = "founder-alignment-v2";

export function isInstrumentId(value: unknown): value is InstrumentId {
  return typeof value === "string" && (INSTRUMENT_IDS as readonly string[]).includes(value);
}

/**
 * Darf diese Auswertung diese Antworten rechnen?
 *
 * WIRFT, STATT ZU RATEN. Eine Auswertung, die auf eine unbekannte Fassung
 * trifft, hat zwei Möglichkeiten: abbrechen oder so tun, als wäre es die
 * eigene. Das Zweite ist genau die stille Umdeutung, gegen die diese ganze
 * Vorbereitung gebaut ist - deshalb das Erste.
 */
export function assertInstrument(actual: string | null | undefined, expected: InstrumentId) {
  if (actual !== expected) {
    throw new Error(
      `instrument_mismatch: erwartet ${expected}, bekommen ${actual ?? "nichts"}`
    );
  }
}
