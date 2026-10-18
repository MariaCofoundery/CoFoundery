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

export type StrengthsQuestion = {
  id: string;
  /** Geschriebene Nachfragen, die erst nach dem Schreiben erscheinen. */
  followUpIds: readonly string[];
};

/**
 * Die Reihenfolge: zuerst das Naheliegende (Verantwortung, etwas geschafft),
 * dann das Unbequeme (Widerstand), zuletzt der Blick von außen.
 */
export const STRENGTHS_QUESTIONS: readonly StrengthsQuestion[] = [
  { id: "took_charge", followUpIds: ["whatYouDidFirst", "whyYou"] },
  { id: "hard_won", followUpIds: ["whatMadeItHard", "whenItStalled"] },
  { id: "solved_problem", followUpIds: ["howYouApproached", "whatWasYours"] },
  { id: "initiated", followUpIds: ["whatMadeYouStart", "whoYouBroughtIn"] },
  { id: "new_ground", followUpIds: ["howYouLearned", "whatYouDidDifferently"] },
  { id: "resistance", followUpIds: ["howYouWentAboutIt", "whatHappenedAfter"] },
  { id: "others_come", followUpIds: ["lastExample", "whatYouActuallyDo"] },
];

/**
 * Ab drei Antworten lässt sich abschließen. Eine Stärke, die sich über
 * mehrere Situationen zeigt, ist belastbarer als eine aus einer einzigen -
 * mit weniger als drei gäbe es diesen Vergleich nicht.
 */
export const STRENGTHS_MIN_ANSWERS = 3;
/** Die Grenzen der Datenbank (`capability_interview_turns_answer_length`). */
export const STRENGTHS_MIN_LENGTH = 10;
export const STRENGTHS_MAX_LENGTH = 2000;

export function findStrengthsQuestion(id: string) {
  return STRENGTHS_QUESTIONS.find((question) => question.id === id) ?? null;
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
