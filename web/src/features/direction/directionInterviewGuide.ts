/**
 * Der Gesprächsleitfaden für Direction.
 *
 * SCHRITT S2 aus `web/docs/direction-interview-technical-brief.md`. Die
 * Fragen sind Marias Arbeitsfassung vom 21.09.2026, technisch so abgebildet,
 * dass sie leicht zu ändern sind: Struktur hier, Sätze im Sprachbundle.
 *
 * WAS DIESES INTERVIEW VOM CAPABILITY-INTERVIEW UNTERSCHEIDET, und warum es
 * trotzdem dieselbe Mechanik benutzt:
 *
 *   Capability fragt: was kannst du - und ordnet die Antwort in ein
 *   geschlossenes Vokabular aus 48 Bereichen ein. Ein Modell kann dort nur
 *   wählen, nicht erfinden.
 *
 *   Direction fragt: was zieht dich immer wieder an - und sucht die
 *   Formulierungen DIESER Person. "Komplexe Systeme verständlicher machen" ist
 *   kein Listeneintrag, und eine Liste dafür zu erfinden wäre genau die
 *   Typologie, die dieses Interview nicht sein soll ("du bist ein
 *   Empowerer-Typ").
 *
 * ES IST KEIN TEST. Kein Purpose Score, kein Founder Type, keine Aussage über
 * den "wahren inneren Antrieb", keine Erfolgsprognose. Das Ergebnis ist eine
 * aktuelle, korrigierbare Reflexion - und bis die Person sie bestätigt hat,
 * existiert sie für andere Produktbereiche nicht.
 *
 * GEFRAGT WIRD NACH ERFAHRUNGEN, NICHT NACH DEM WHY. "Was ist dein Why?" lädt
 * zu einer Antwort ein, die man schon einmal gehört hat. Jede Frage hier
 * verlangt eine Begebenheit - genau wie im Capability-Interview, und aus
 * demselben Grund: Ereignisse kann man erzählen, ohne sich einzuschätzen.
 *
 * DIE SÄTZE STEHEN NICHT HIER, sondern in `messages/<locale>/direction.json`
 * unter `interview.questions.<id>`. Eine Frage in zwei Sprachen ist eine
 * Übersetzung und kein Code.
 */

/**
 * Was eine Antwort wahrscheinlich füllt.
 *
 * WOZU DAS GUT IST - und es ist kein Etikett, sondern ein Anker: Wenn ein
 * Modell später Vorschläge macht (Schritt S4), wird geprüft, ob seine Facette
 * zu der Frage passt, aus der sie stammt. Ein Modell, das aus "davon würde ich
 * gern mehr machen" ein "Problem, das dir wichtig ist" macht, hat nicht
 * zugehört.
 *
 * Und ohne Modell sagt die Facette, welche geschriebene Nachfrage dransteht.
 *
 * Die Liste folgt Abschnitt 7 des Briefings. Sie ist mit zehn Einträgen bewusst
 * noch nicht entschieden - `meaningful_outcome` und `desired_change` liegen
 * nah beieinander, und weniger Facetten hiessen eine klarere Ergebnisseite.
 * Das steht als offene Entscheidung im Brief.
 */
export const DIRECTION_FACETS = [
  "recurring_theme",
  "problem_cared_about",
  "people_cared_about",
  "desired_change",
  "meaningful_outcome",
  "energising_activity",
  "preferred_contribution",
  "frustrating_condition",
  "recurring_tension",
  "open_question",
] as const;
export type DirectionFacet = (typeof DIRECTION_FACETS)[number];

export type DirectionQuestion = {
  id: string;
  /** Die Facetten, die diese Frage wahrscheinlich füllt. */
  facets: readonly DirectionFacet[];
  /**
   * Geschriebene Nachfragen - der Weg, wenn kein Modell erreichbar ist.
   *
   * Sie sind absichtlich nicht generisch. "Kannst du mehr erzählen?"
   * signalisiert, dass niemand zugehört hat; jede Nachfrage hier geht auf die
   * eine Stelle, an der Antworten auf diese Frage regelmäßig zu unbestimmt
   * bleiben - meistens die Trennung zwischen dem, was jemand TAT, und dem, was
   * dadurch ANDERS wurde.
   */
  followUpIds: readonly string[];
};

/**
 * Die Reihenfolge ist Teil des Leitfadens.
 *
 *   Zuerst das Leichteste: etwas, wovon man mehr machen würde.
 *   Dann der Ärger - der kommt von selbst, wenn man warm ist.
 *   Dann die eigene Wirkung, dann die Wirkung bei anderen.
 *   Dann das Interesse ohne Geschäftsmodell - das traut man sich erst, wenn
 *   klar ist, dass hier niemand nach Marktattraktivität fragt.
 *   Zuletzt der lange Blick. Er braucht den ganzen Anlauf davor.
 */
export const DIRECTION_QUESTIONS: readonly DirectionQuestion[] = [
  {
    // "Erzähl mir von etwas, an dem du gearbeitet hast und bei dem du dachtest:
    //  Davon würde ich gern mehr machen."
    //
    // Der Einstieg, weil es die einzige Frage ist, auf die fast jeder sofort
    // ein Beispiel hat. Was daran attraktiv war - Tätigkeit, Problem, Menschen,
    // Wirkung, Gestaltung, Lernen - steht in der Antwort, nicht in der Frage.
    id: "more_of_this",
    facets: ["energising_activity", "preferred_contribution"],
    followUpIds: ["whatMattered", "doingOrResult"],
  },
  {
    // "Welches Problem oder welche Situation regt dich immer wieder auf, weil
    //  du denkst: Das müsste doch besser gehen?"
    //
    // "Immer wieder" ist der Kern: Gesucht ist nicht der Ärger von heute,
    // sondern der wiederkehrende.
    id: "keeps_bothering",
    facets: ["problem_cared_about", "people_cared_about", "frustrating_condition"],
    followUpIds: ["whatExactlyBothers", "whoIsAffected"],
  },
  {
    // "Wann hattest du zuletzt das Gefühl, mit deiner Arbeit oder deinem
    //  Handeln wirklich etwas Sinnvolles verändert zu haben?"
    //
    // Zeitanker ("zuletzt"), damit es eine Begebenheit wird und keine
    // Selbsteinschätzung.
    id: "changed_something",
    facets: ["meaningful_outcome", "desired_change"],
    followUpIds: ["whatWasDifferentAfter", "whyThisMattered"],
  },
  {
    // "Welche Veränderung bei anderen Menschen oder in deiner Umgebung freut
    //  dich besonders, wenn du daran beteiligt warst?"
    //
    // Der Fokus liegt auf der WIRKUNG, nicht auf der Tätigkeit. Die Nähe zur
    // vorigen Frage ist bekannt und steht als offene Entscheidung im Brief:
    // Sechs Fragen mit einer Doppelung sind schwächer als fünf ohne.
    id: "change_in_others",
    facets: ["desired_change", "people_cared_about"],
    followUpIds: ["howYouNoticed"],
  },
  {
    // "Was würdest du wahrscheinlich auch dann spannend finden, wenn dir noch
    //  niemand sagen könnte, ob daraus ein gutes Business wird?"
    //
    // Sie räumt den Business Case aus dem Weg, bevor er die Antwort dominiert.
    id: "interesting_anyway",
    facets: ["recurring_theme", "open_question"],
    followUpIds: ["whatYouWouldFindOutFirst"],
  },
  {
    // "Wenn du in fünf Jahren zurückblickst: Was müsste durch deine Arbeit
    //  entstanden oder anders geworden sein, damit du denkst: Das war die Mühe
    //  wert?"
    //
    // Richtung, nicht Jobbezeichnung. Die Nachfrage trennt, was von dieser
    // Person abhängt und was nicht - sonst wird daraus ein Wunsch an die Welt.
    id: "five_years_back",
    facets: ["desired_change", "preferred_contribution", "recurring_tension"],
    followUpIds: ["whatDependsOnYou", "whatYouWouldGiveUp"],
  },
];

/**
 * Wie viele Antworten es braucht, damit eine Zusammenfassung etwas wert ist.
 *
 * Vier von sechs - dieselbe Zahl wie beim Capability-Interview, und aus
 * demselben Grund: Ein Muster über mehrere Beispiele hinweg ist der einzige
 * Grund, warum dieses Interview mehr ist als eine Frage. Wer nach vier
 * Geschichten aufhört, bekommt eine schwächere Interpretation - keine Sperre.
 */
export const DIRECTION_MIN_ANSWERS = 4;

/**
 * Die Grenzen einer Antwort - dieselbe Spanne wie beim Capability-Interview,
 * weil es dieselbe Spalte ist (`capability_interview_turns.answer`, Constraint
 * 10 bis 2000 Zeichen).
 *
 * SIE STEHEN HIER UND NICHT BEI DEN AKTIONEN: Eine `"use server"`-Datei darf
 * nur asynchrone Funktionen ausfuehren - eine exportierte Konstante laesst den
 * Build scheitern. Capability haelt sie aus demselben Grund in
 * `capabilityTypes.ts`.
 */
export const DIRECTION_MIN_LENGTH = 10;
export const DIRECTION_MAX_LENGTH = 2000;

export function findDirectionQuestion(id: string) {
  return DIRECTION_QUESTIONS.find((question) => question.id === id) ?? null;
}

/** Die erste noch nicht gestellte Frage. */
export function nextDirectionQuestion(askedIds: readonly string[]) {
  const asked = new Set(askedIds);
  return DIRECTION_QUESTIONS.find((question) => !asked.has(question.id)) ?? null;
}

/**
 * Wo man ist.
 *
 * `atQuestion` zählt die STATION und nicht die Antworten - gemeldet am
 * 21.09.2026 am Capability-Interview: "Es wäre schön, wenn man sieht, bei
 * welcher Frage man ist, zum Beispiel Frage 3 von 8, weil wenn du dann doch
 * eine überspringst, steht da trotzdem eine von acht und das ist ein bisschen
 * verwirrend."
 */
export function directionProgress(answeredIds: readonly string[], askedIds: readonly string[]) {
  const answered = new Set(answeredIds);
  const asked = new Set(askedIds);
  return {
    atQuestion: Math.min(asked.size, DIRECTION_QUESTIONS.length),
    answeredCount: answered.size,
    total: DIRECTION_QUESTIONS.length,
    hasEnough: answered.size >= DIRECTION_MIN_ANSWERS,
  };
}
