import rewordingsJson from "../../../../docs/founder-alignment-rewordings-v2.json";

/**
 * Neue Fassungen von Fragetexten - sichtbar, nicht heimlich.
 *
 * ---------------------------------------------------------------------------
 * WARUM DAS EINE EIGENE SCHICHT IST UND KEINE ÄNDERUNG AM TEXT
 * ---------------------------------------------------------------------------
 *
 * Die Registratur enthält weiterhin den Wortlaut des Gutachtens, und der Test
 * gegen das Dokument prüft weiterhin genau diesen. Wer eine Frage umformuliert,
 * überschreibt sie also nicht - er legt eine zweite Fassung daneben, mit
 * Original, Grund und Datum.
 *
 * DAS IST DER UNTERSCHIED ZWISCHEN „VERBESSERT" UND „ABGEDRIFTET". Ein Jahr
 * später ist sonst nicht mehr zu sagen, ob eine Formulierung bewusst geändert
 * oder beim Kopieren verunglückt ist - und die kognitiven Interviews prüfen
 * dann einen Text, den niemand mehr dem Gutachten zuordnen kann.
 *
 * WARUM ÜBERHAUPT UMFORMULIERT WIRD. Wer eine Frage fünfmal lesen muss,
 * antwortet auf eine andere Frage als die gemeinte. Das ist kein Stilproblem,
 * sondern ein Messproblem - und das Gutachten nennt seine eigene Auswahl
 * ausdrücklich „redaktionell und noch nicht empirisch optimiert".
 */

export type Rewording = {
  /** Item-, Block-, Präferenz- oder Fallkennung. */
  target: string;
  field: "prompt" | "condition" | "situation";
  /** Der Wortlaut des Gutachtens - muss dort noch so stehen. */
  source: string;
  text: string;
  reason: string;
};

export type RewordingsV2 = {
  instrumentId: string;
  createdAt: string;
  decidedBy: string;
  note: string;
  why: string;
  rewordings: Rewording[];
};

export const REWORDINGS_V2 = rewordingsJson as unknown as RewordingsV2;

const byKey = new Map(
  REWORDINGS_V2.rewordings.map((entry) => [`${entry.target}|${entry.field}`, entry])
);

/**
 * Die Fassung, die ein Mensch zu sehen bekommt.
 *
 * WIRFT, WENN DAS ORIGINAL NICHT MEHR PASST. Eine Umformulierung, deren
 * `source` nicht mehr dem Text der Registratur entspricht, zeigt auf etwas,
 * das es nicht mehr gibt - dann wäre stillschweigend eine veraltete Fassung
 * ausgeliefert worden. Lieber laut abbrechen.
 */
export function reword(target: string, field: Rewording["field"], original: string): string {
  const entry = byKey.get(`${target}|${field}`);
  if (!entry) return original;
  if (entry.source !== original) {
    throw new Error(
      `rewording_stale: ${target}.${field} - das Original hat sich geaendert, ` +
        `die Umformulierung zeigt noch auf den alten Wortlaut`
    );
  }
  return entry.text;
}

export function isReworded(target: string, field: Rewording["field"]): boolean {
  return byKey.has(`${target}|${field}`);
}
