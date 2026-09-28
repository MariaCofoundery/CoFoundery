import { ALIGNMENT_V2_INSTRUMENT_ID, CURRENT_INSTRUMENT_ID } from "@/features/instruments/instruments";

/**
 * Der Umstieg von einer Fassung zur nächsten.
 *
 * ---------------------------------------------------------------------------
 * WAS DIE PERSON WIRKLICH ENTSCHEIDET
 * ---------------------------------------------------------------------------
 *
 * Nicht „alt oder neu", sondern: Bleibt mein bisheriger Report gültig, oder
 * fülle ich noch einmal aus? Beides ist erlaubt, und in beiden Fällen bleiben
 * die alten Antworten erhalten - das Archiv ist ein Status, kein zweiter
 * Speicher.
 *
 * ---------------------------------------------------------------------------
 * DIE FOLGE, DIE MAN DAZUSAGEN MUSS
 * ---------------------------------------------------------------------------
 *
 * Ein Vergleich läuft nur innerhalb derselben Fassung (Teil F2, und der
 * Prüfplan in F7: „Teamvergleich bei Versionsunterschied deaktiviert").
 *
 * Wer also bei der alten Fassung bleibt, während sein Mitgründer die neue
 * ausfüllt, kann sich mit ihm nicht mehr vergleichen. Das ist keine Schikane,
 * sondern die Wahrheit über zwei verschiedene Fragebögen - aber es wäre eine
 * böse Überraschung, wenn es erst beim Vergleich aufträte. Deshalb steht es im
 * Hinweis und nicht im Kleingedruckten.
 */

export const TRANSITION_DECISIONS = ["pending", "keep_previous", "retake"] as const;
export type TransitionDecision = (typeof TRANSITION_DECISIONS)[number];

export const CURRENT_TRANSITION = {
  from: CURRENT_INSTRUMENT_ID,
  to: ALIGNMENT_V2_INSTRUMENT_ID,
} as const;

export function isTransitionDecision(value: unknown): value is TransitionDecision {
  return typeof value === "string" && (TRANSITION_DECISIONS as readonly string[]).includes(value);
}

/**
 * Was eine Entscheidung bedeutet - in Stichpunkten, für den Hinweis.
 *
 * ES STEHT BEI BEIDEN, DASS NICHTS VERLOREN GEHT. Die häufigste stille Sorge
 * bei so einem Hinweis ist, dass „neu machen" das Alte überschreibt. Sie
 * einmal auszuräumen kostet eine Zeile.
 */
export const TRANSITION_CONSEQUENCES: Record<
  Exclude<TransitionDecision, "pending">,
  { keeps: string; costs: string }
> = {
  keep_previous: {
    keeps: "Dein bisheriger Report bleibt so, wie er ist.",
    costs:
      "Mit jemandem, der die neue Fassung ausgefüllt hat, ist kein Vergleich " +
      "möglich - es sind zwei verschiedene Fragebögen.",
  },
  retake: {
    keeps: "Deine alten Antworten bleiben erhalten und lesbar; es wird nichts überschrieben.",
    costs: "Der neue Fragebogen dauert noch einmal etwa eine halbe Stunde.",
  },
};
