import {
  ALIGNMENT_V21_INSTRUMENT_ID,
  CURRENT_INSTRUMENT_ID,
  FOUNDER_PROFILE_INSTRUMENT_ID,
} from "@/features/instruments/instruments";

/**
 * Der Umstieg von der bisherigen Fassung auf v2.1.
 *
 * ---------------------------------------------------------------------------
 * WAS DIE PERSON WIRKLICH ENTSCHEIDET
 * ---------------------------------------------------------------------------
 *
 * Nicht „alt oder neu“, sondern: Bleibt mein bisheriger Report gültig, oder
 * fülle ich noch einmal aus? Beides ist erlaubt, beide Fassungen laufen
 * nebeneinander weiter, und in keinem Fall geht etwas verloren.
 *
 * ---------------------------------------------------------------------------
 * „SPÄTER“ IST KEINE ENTSCHEIDUNG
 * ---------------------------------------------------------------------------
 *
 * Wer „später“ sagt, hat sich weder für die eine noch für die andere Fassung
 * entschieden. Die Zeile bleibt `pending`, und nur die Erinnerung ruht. Eine
 * vierte Entscheidungsart würde das verwischen - jede spätere Auswertung
 * müsste raten, ob sie näher an „bleiben“ oder an „wechseln“ liegt.
 */

export const TRANSITION_V21 = {
  from: CURRENT_INSTRUMENT_ID,
  to: ALIGNMENT_V21_INSTRUMENT_ID,
} as const;

/**
 * Der Umstieg, um den es jetzt geht: v1 auf die beiden getrennten Bögen.
 *
 * ---------------------------------------------------------------------------
 * ZIEL IST DAS ARBEITSPROFIL, NICHT BEIDE
 * ---------------------------------------------------------------------------
 *
 * Die Entscheidung wird einmal getroffen und gilt für den Umstieg als Ganzes.
 * Sie an beiden Bögen zu führen hieße, jemanden zweimal dasselbe zu fragen -
 * und es gäbe einen Zustand „für das Profil umgestiegen, für das Vorhaben
 * nicht", den niemand gemeint hat.
 *
 * Das Arbeitsprofil steht dafür, weil es der Bogen ist, der v1 wirklich
 * ablöst: Es gilt für die Person, so wie v1 es tat. Das Venture-Alignment ist
 * daneben etwas Neues und nicht der Ersatz für etwas Altes.
 */
export const TRANSITION_TO_ALIGN = {
  from: CURRENT_INSTRUMENT_ID,
  to: FOUNDER_PROFILE_INSTRUMENT_ID,
} as const;

export const TRANSITION_DECISIONS = ["pending", "keep_previous", "retake"] as const;
export type TransitionDecision = (typeof TRANSITION_DECISIONS)[number];

export function isTransitionDecision(value: unknown): value is TransitionDecision {
  return typeof value === "string" && (TRANSITION_DECISIONS as readonly string[]).includes(value);
}

/** Wie lange der Hinweis nach „später“ ruht. */
export const REMIND_AFTER_DAYS = 30;

export type TransitionState = {
  decision: TransitionDecision;
  remindAfter: string | null;
};

/**
 * Soll der Hinweis erscheinen?
 *
 * DREI BEDINGUNGEN, UND JEDE EINZELNE IST EIN NEIN. Wer die bisherige Fassung
 * nie ausgefüllt hat, bekommt keinen Hinweis auf eine Neufassung von etwas,
 * das er nicht kennt - er soll einfach den aktuellen Fragebogen sehen. Wer
 * entschieden hat, hat entschieden. Und wer „später“ gesagt hat, hat Ruhe.
 */
export function shouldAnnounce(input: {
  hasPreviousAssessment: boolean;
  transition: TransitionState | null;
  now?: Date;
}): boolean {
  if (!input.hasPreviousAssessment) return false;

  const transition = input.transition;
  if (!transition) return true;
  if (transition.decision !== "pending") return false;
  if (!transition.remindAfter) return true;

  return new Date(transition.remindAfter) <= (input.now ?? new Date());
}

/**
 * Was nach einer Entscheidung im Dashboard steht.
 *
 * AUCH „BLEIBEN“ BEKOMMT EINE ZEILE. Wer sich gegen die neue Fassung
 * entschieden hat, soll sie trotzdem wiederfinden - eine Entscheidung ist
 * keine Tür, die zufällt. Und wer gewechselt hat, muss seinen alten Report
 * finden, sonst fühlt sich „nichts geht verloren“ wie eine Behauptung an.
 */
export function archiveHint(decision: TransitionDecision): string {
  switch (decision) {
    case "keep_previous":
      return "Du bleibst bei der bisherigen Fassung. Die neue kannst du jederzeit noch ausprobieren.";
    case "retake":
      return "Du hast die neue Fassung gewählt. Dein bisheriger Report bleibt erhalten und ist weiter abrufbar.";
    case "pending":
      return "Du hast dich noch nicht entschieden. Beide Fassungen stehen dir offen.";
  }
}
