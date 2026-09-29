/**
 * Muss diese Person ihre Angaben noch einmal ansehen?
 *
 * ---------------------------------------------------------------------------
 * DIE REGEL BRAUCHT KEINE EIGENE SPALTE
 * ---------------------------------------------------------------------------
 *
 * Gefragt wird, wenn jemand dem Vorhaben beigetreten ist, NACHDEM zuletzt
 * bestätigt wurde. Das ist der Moment, in dem sich die Lage geändert hat -
 * vorher gab es niemanden, dem gegenüber die Angaben gelten.
 *
 * Ein Zähler „wie viele Leute waren es beim letzten Mal“ würde dasselbe sagen
 * und könnte auseinanderlaufen. Zwei Zeitstempel können das nicht.
 *
 * ---------------------------------------------------------------------------
 * WER ALLEIN IST, WIRD NICHT GEFRAGT
 * ---------------------------------------------------------------------------
 *
 * Solange niemand dazugekommen ist, gibt es nichts zu bestätigen - die
 * Angaben stehen niemandem gegenüber. Eine Frage an dieser Stelle wäre eine
 * Frage ohne Anlass.
 */
export function needsConfirmation(input: {
  /** Wann die Person ihre Angaben zuletzt angesehen hat. */
  confirmedAt: string | null;
  /** Wann die anderen Mitglieder dazugekommen sind - ohne die Person selbst. */
  otherJoinedAt: readonly string[];
  /** Hat sie zu diesem Vorhaben überhaupt schon geantwortet? */
  hasAnswers: boolean;
}): boolean {
  // Ohne Antworten gibt es nichts zu bestaetigen. Wer noch nicht ausgefuellt
  // hat, soll ausfuellen und nicht bestaetigen.
  if (!input.hasAnswers) return false;
  if (input.otherJoinedAt.length === 0) return false;

  const neuester = input.otherJoinedAt
    .map((wert) => new Date(wert).getTime())
    .reduce((a, b) => Math.max(a, b), 0);

  if (!input.confirmedAt) return true;

  // Gleichstand gilt als bestaetigt. Wer im selben Moment beigetreten ist, hat
  // vielleicht danebengestanden - und eine Frage, die aus einer Millisekunde
  // entsteht, waere Nerverei ohne Erkenntnis.
  return neuester > new Date(input.confirmedAt).getTime();
}
