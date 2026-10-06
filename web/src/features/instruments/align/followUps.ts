/**
 * Wann eine Anschlussfrage (`showAfter`) gilt.
 *
 * ---------------------------------------------------------------------------
 * EINE REGEL FUER OBERFLAECHE, ABGABE UND TEAMBEREITSCHAFT
 * ---------------------------------------------------------------------------
 *
 * Beta-Gate 06.10.2026: Die drei Stellen fragten Verschiedenes.
 *
 *   Die Oberflaeche zeigte JEDE Anschlussfrage nur, wenn in L01 eine Grenze
 *   eingetragen war - auch R05, das an R04 haengt.
 *   Die Abgabe verlangte eine Anschlussfrage, sobald fuer ihre Ausgangsfrage
 *   IRGENDEINE Zeile existierte - auch "moechte ich nicht angeben".
 *
 * Folge: Wer in L01 keine Grenze nannte, konnte das Vorhaben nie abgeben. Die
 * Meldung "Es fehlen noch N Antworten" zeigte auf Fragen, die nirgends zu
 * sehen waren.
 *
 * Jetzt gilt eine Anschlussfrage genau dann, wenn ihre Ausgangsfrage
 * inhaltlich beantwortet ist: kein Auslassungsgrund, ein Wert - und bei einer
 * Liste von Eintraegen (L01) mindestens ein Eintrag mit Text. Wer eine Frage
 * bewusst nicht beantwortet, bekommt dazu keine Nachfrage.
 */
export type BasisAnswer =
  | { value?: unknown; missingCode?: string | null }
  | null
  | undefined;

export function basisAnswered(answer: BasisAnswer): boolean {
  if (!answer || answer.missingCode) return false;
  const value = answer.value;
  if (value === null || value === undefined) return false;
  if (typeof value === "object" && !Array.isArray(value)) {
    const entries = (value as { entries?: unknown }).entries;
    if (Array.isArray(entries)) {
      return entries.some(
        (entry) =>
          typeof (entry as { text?: unknown })?.text === "string" &&
          ((entry as { text: string }).text.trim() !== "")
      );
    }
    return Object.keys(value).length > 0;
  }
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim() !== "";
  return true;
}

/** Gilt diese Frage fuer die gegebenen Antworten (je Frage-ID)? */
export function followUpApplies(
  item: { showAfter?: string | null },
  answerFor: (itemId: string) => BasisAnswer
): boolean {
  return !item.showAfter || basisAnswered(answerFor(item.showAfter));
}
