/**
 * Der Leitfaden des Stärken-Interviews.
 *
 * GEMELDET AM 18.10.2026: "Stärken im Interview entdecken" führte in das
 * Capability-Interview, und am Ende stand eine Einordnung in
 * Funktionsbereiche ("Marketing & Brand"). Capability fragt "was kannst du,
 * womit hast du Erfahrung" - dieses Gespräch fragt "welche persönlichen
 * Stärken zeigen sich in deinem Verhalten". Deshalb eigene Fragen, eine eigene
 * Sitzung (`kind = 'strengths'`) und eine eigene Auswertung
 * (`strengthAnalysisModel.ts`).
 *
 * GEFRAGT WIRD NACH ERLEBTEN SITUATIONEN, NIE NACH STÄRKEN. "Was sind deine
 * Stärken?" misst Selbstbild und Selbstdarstellung. "Erzähl von einer
 * Situation, in der ..." fragt nach einem Ereignis - und aus dem Verhalten in
 * diesem Ereignis lässt sich eine Stärke ableiten, die die Person dann
 * bestätigt oder verwirft. Ein Test prüft jeden Fragetext darauf.
 *
 * DREI FRAGEN SIND AUS DEM CAPABILITY-INTERVIEW ÜBERNOMMEN und nur dort
 * angepasst, wo sie auf Können statt auf Verhalten zielten (Verantwortung,
 * Widerstand, andere suchen deine Hilfe). Die übrigen sind neu - und sie
 * gehören NUR hierher: Das Capability-Interview bekommt sie nicht.
 *
 * DIE TEXTE STEHEN IN `messages/<locale>/strengths.json` unter
 * `interview.questions.<id>`.
 */

/**
 * `situation` - erlebte Situation; Grundlage der Auswertung.
 * `counter`   - Gegenfrage ("was schiebst du vor dir her"): sagt, wo jemand Unterstützung
 *               braucht. Wird NIE zur Stärke und geht NICHT an die Auswertung; die Person
 *               sieht ihre eigenen Worte im Bericht.
 * `outside`   - der Blick von außen; Grundlage der Auswertung wie eine Situation.
 */
export type StrengthsQuestionKind = "situation" | "counter" | "outside";

export type StrengthsQuestion = {
  id: string;
  kind: StrengthsQuestionKind;
  /** Geschriebene Nachfragen, die erst nach dem Schreiben erscheinen. */
  followUpIds: readonly string[];
};

/**
 * v2 (20.10.2026): zehn Situationen, drei Gegenfragen, der Blick von außen.
 * Jede Situation hat dieselben drei Arten von Nachfragen, damit die Antworten
 * vergleichbar bleiben: konkret (was genau getan), Wirkung und Energie (was
 * anders gelaufen wäre, ob es leicht war) und Grenze (was nicht ging, was
 * abgegeben wurde).
 *
 * Die Reihenfolge: zuerst das Naheliegende, dann das Unbequeme, dann die
 * Gegenfragen, zuletzt der Blick von außen.
 */
export const STRENGTHS_QUESTIONS: readonly StrengthsQuestion[] = [
  { id: "took_charge", kind: "situation", followUpIds: ["whatYouDidFirst", "whatWouldHaveHappened", "whatItCost"] },
  { id: "hard_won", kind: "situation", followUpIds: ["whatMadeItHard", "whenItStalled", "whatItCost"] },
  { id: "decide_unclear", kind: "situation", followUpIds: ["whatYouKnew", "howYouDecided", "whatYouWouldChange"] },
  { id: "solved_problem", kind: "situation", followUpIds: ["howYouApproached", "whatWasYours", "whatDidNotWork"] },
  { id: "built_new", kind: "situation", followUpIds: ["whereTheIdeaCame", "howYouTestedIt", "whatYouLeftToOthers"] },
  { id: "won_over", kind: "situation", followUpIds: ["whatYouSaid", "whatChangedTheirMind", "whatYouWouldDoDifferently"] },
  { id: "resistance", kind: "situation", followUpIds: ["howYouWentAboutIt", "whatHappenedAfter", "whatItCost"] },
  { id: "helped_grow", kind: "situation", followUpIds: ["whatYouDid", "whatChangedForThem", "whatItGaveYou"] },
  { id: "connected_people", kind: "situation", followUpIds: ["whyThosePeople", "howYouDidIt", "whatCameOfIt"] },
  { id: "new_ground", kind: "situation", followUpIds: ["howYouLearned", "whatYouDidDifferently", "whatYouStillLacked"] },
  { id: "avoid_task", kind: "counter", followUpIds: [] },
  { id: "hand_off", kind: "counter", followUpIds: [] },
  { id: "others_better", kind: "counter", followUpIds: [] },
  { id: "others_come", kind: "outside", followUpIds: ["lastExample", "whatYouActuallyDo"] },
];

/**
 * Fragen der ersten Fassung, die nicht mehr gestellt werden. Gespräche, die sie
 * schon enthalten, bleiben les- und auswertbar.
 */
const LEGACY_STRENGTHS_QUESTIONS: readonly StrengthsQuestion[] = [
  { id: "initiated", kind: "situation", followUpIds: ["whatMadeYouStart", "whoYouBroughtIn"] },
];

/** Ab sechs Antworten lässt sich abschließen - eine Stärke muss sich über Situationen zeigen. */
export const STRENGTHS_MIN_ANSWERS = 6;
/** Die Grenzen der Datenbank (`capability_interview_turns_answer_length`). */
export const STRENGTHS_MIN_LENGTH = 10;
export const STRENGTHS_MAX_LENGTH = 2000;

export function findStrengthsQuestion(id: string) {
  return (
    STRENGTHS_QUESTIONS.find((question) => question.id === id) ??
    LEGACY_STRENGTHS_QUESTIONS.find((question) => question.id === id) ??
    null
  );
}

/** Gegenfragen gehen nicht in die Auswertung. */
export function isCounterQuestion(id: string) {
  return findStrengthsQuestion(id)?.kind === "counter";
}

export function nextStrengthsQuestion(askedIds: readonly string[]) {
  const asked = new Set(askedIds);
  return STRENGTHS_QUESTIONS.find((question) => !asked.has(question.id)) ?? null;
}

export function strengthsProgress(answeredIds: readonly string[], askedIds: readonly string[]) {
  const answered = new Set(answeredIds);
  const asked = new Set(askedIds);
  return {
    atQuestion: Math.min(asked.size, STRENGTHS_QUESTIONS.length),
    answeredCount: answered.size,
    total: STRENGTHS_QUESTIONS.length,
    hasEnough: answered.size >= STRENGTHS_MIN_ANSWERS,
  };
}
