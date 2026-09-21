import {
  INTERVIEW_QUESTIONS,
  findInterviewQuestion,
} from "@/features/capability/capabilityInterviewGuide";

/**
 * Der Blick zurück auf ein Gespräch.
 *
 * GEMELDET AM 21.09.2026: "Acht Geschichten erzählt, und am Ende kommt kein
 * Blick zurück: was durchgehend auffiel, was du selbst zweimal erwähnt hast,
 * was offen blieb."
 *
 * WARUM DAS NICHT DIE AUSWERTUNG IM PROFIL IST: Die rechnet über BEREICHE -
 * sie nimmt alle Einträge und sortiert sie nach Können und Wollen. Sie weiß
 * nichts über das Gespräch, und sie kann es nicht wissen: Für sie sind zehn
 * Einträge aus zehn Geschichten dasselbe wie zehn aus einer.
 *
 * Dieser Blick zurück rechnet über ANTWORTEN. Daraus entstehen Aussagen, die
 * es sonst nirgends gibt:
 *
 *   WAS MEHRFACH VORKAM. Ein Bereich, den du in drei verschiedenen
 *   Geschichten bestätigt hast, ist etwas anderes als einer aus einer einzigen.
 *   Nicht "besser" - wiederkehrend. Das ist die verlässlichste Auskunft, die
 *   dieses Verfahren überhaupt hergibt, und sie steht in keinem einzelnen
 *   Eintrag.
 *
 *   WAS ANDERE AN DIR SEHEN. Frage 6 ("wobei bitten andere dich wiederholt um
 *   Hilfe") erhebt keine Selbsteinschätzung, sondern ein beobachtetes
 *   Verhalten anderer. Bei Menschen, die sich selbst niedrig einschätzen, ist
 *   das oft die einzige Stelle, an der eine Stärke sichtbar wird - sie gehört
 *   deshalb getrennt ausgewiesen und nicht in denselben Topf.
 *
 *   BEIDE RICHTUNGEN DES WOLLENS. Fragen 7 und 8 gehen aufs Abgeben und aufs
 *   Übernehmen. Genau daraus entstehen später die Rollenzustände im Team -
 *   sichtbar gemacht sind sie hier zum ersten Mal.
 *
 *   WAS OFFEN BLIEB. Übersprungene Fragen und Antworten, zu denen die
 *   Erkennung nichts gefunden hat. Beides ist kein Mangel der Person: das
 *   erste eine Entscheidung, das zweite eine Lücke unserer Begriffsliste.
 *
 * ALLES HIER IST UMFORMUNG, KEINE INTERPRETATION - dieselbe Linie wie in
 * `capabilityReadout.ts`. Es steht nichts da, was nicht in einer bestätigten
 * Einordnung steht; es steht nur nebeneinander.
 */

/** Eine beantwortete Frage mit dem, was daraus bestätigt wurde. */
export type SummarySource = {
  /** Die Katalogfrage. 'model' bei einer Nachfrage des Modells. */
  questionId: string;
  answered: boolean;
  /**
   * Die bestätigten Bereiche dieser Antwort. Leer heisst: noch nicht
   * eingeordnet ODER eingeordnet ohne Treffer - der Unterschied steht in
   * `sorted`.
   */
  areaIds: string[];
  /** Ob diese Antwort schon eingeordnet ist. */
  sorted: boolean;
};

export type InterviewSummary = {
  answered: number;
  skipped: number;
  /** Antworten auf die Frage ausserhalb der Erwerbsarbeit. */
  personal: number;
  /** Noch nicht eingeordnete Antworten. Solange die da sind, ist das Fazit vorläufig. */
  unsorted: number;
  /** Bereiche aus mehr als einer Geschichte, häufigste zuerst. */
  recurring: { areaId: string; times: number }[];
  /** Bereiche, die nur in einer Geschichte vorkamen. */
  single: string[];
  /** Was andere wiederholt bei dir nachfragen (Frage 6). */
  observedByOthers: string[];
  /** Was du abgeben würdest (Frage 7). */
  handOver: string[];
  /** Was du übernehmen würdest (Frage 8). */
  growInto: string[];
  /** Eingeordnete Antworten, zu denen nichts gefunden wurde. */
  withoutArea: number;
  /** Ob überhaupt etwas zu zeigen ist. */
  hasContent: boolean;
};

/** Die Frage nach dem Fremdsignal. Hier beim Namen, nicht als Position. */
const OBSERVED_QUESTION = "people_come_to_you";

export function buildInterviewSummary(sources: SummarySource[]): InterviewSummary {
  const answered = sources.filter((source) => source.answered);
  const catalogue = answered.filter((source) => findInterviewQuestion(source.questionId));

  const times = new Map<string, number>();
  for (const source of answered) {
    // JE ANTWORT EINMAL GEZAEHLT: Ein Bereich, der in derselben Geschichte
    // zweimal stehen könnte, wäre keine Wiederholung.
    for (const areaId of new Set(source.areaIds)) {
      times.set(areaId, (times.get(areaId) ?? 0) + 1);
    }
  }

  const recurring = [...times.entries()]
    .filter(([, count]) => count > 1)
    .map(([areaId, count]) => ({ areaId, times: count }))
    .sort((a, b) => b.times - a.times || a.areaId.localeCompare(b.areaId));

  const single = [...times.entries()]
    .filter(([, count]) => count === 1)
    .map(([areaId]) => areaId)
    .sort((a, b) => a.localeCompare(b));

  const fromQuestion = (questionId: string) => {
    const source = answered.find((candidate) => candidate.questionId === questionId);
    return source ? [...new Set(source.areaIds)] : [];
  };

  const handOverQuestion = INTERVIEW_QUESTIONS.find(
    (question) => question.target === "ownership_away"
  );
  const growIntoQuestion = INTERVIEW_QUESTIONS.find(
    (question) => question.target === "ownership_growth"
  );

  const summary: InterviewSummary = {
    answered: answered.length,
    // Nur Katalogfragen können übersprungen werden - eine Modellnachfrage, die
    // niemand beantwortet hat, ist keine übersprungene Station.
    skipped: sources.filter(
      (source) => !source.answered && findInterviewQuestion(source.questionId)
    ).length,
    personal: catalogue.filter(
      (source) => findInterviewQuestion(source.questionId)?.context === "personal"
    ).length,
    unsorted: answered.filter((source) => !source.sorted).length,
    recurring,
    single,
    observedByOthers: fromQuestion(OBSERVED_QUESTION),
    handOver: handOverQuestion ? fromQuestion(handOverQuestion.id) : [],
    growInto: growIntoQuestion ? fromQuestion(growIntoQuestion.id) : [],
    withoutArea: answered.filter((source) => source.sorted && source.areaIds.length === 0).length,
    hasContent: false,
  };

  // "Nichts zu zeigen" heisst: keine beantwortete Frage. Eine beantwortete
  // Frage ohne Treffer IST etwas - dann steht eben da, dass nichts gefunden
  // wurde, und das ist eine ehrliche Auskunft über unsere Begriffsliste.
  summary.hasContent = summary.answered > 0;
  return summary;
}
