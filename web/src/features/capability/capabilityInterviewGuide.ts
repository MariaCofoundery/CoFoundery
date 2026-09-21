/**
 * Der Gesprächsleitfaden.
 *
 * GEWUENSCHT AM 21.09.2026: "Dass da eben gute Fragen gestellt werden [...] der
 * nach realen Situationen fragt, nach beruflichen Situationen, aber auch
 * privaten Situationen, dass halt wirklich die Stärken mal so ausgearbeitet
 * werden."
 *
 * WARUM DIESE FRAGEN SO AUSSEHEN, und das ist die fachliche Grundlage des
 * ganzen Bereichs (`docs/capability-model-technical-brief.md`): Gefragt wird
 * nach EINER STATTGEFUNDENEN SITUATION, nie nach einer Eigenschaft. "Wie gut
 * kannst du verhandeln?" misst Selbstbild und Selbstvertrauen, und beides ist
 * ungleich verteilt - Menschen, die gelernt haben, sich zurueckzunehmen,
 * antworten darauf systematisch niedriger. "Was war die letzte Verhandlung, die
 * du gefuehrt hast?" fragt nach einem Ereignis, und Ereignisse kann man
 * erzaehlen, ohne sich einzuschaetzen.
 *
 * DESHALB VERLANGT JEDE FRAGE EINE EINZELNE BEGEBENHEIT - entweder ueber einen
 * Zeitanker ("zuletzt", "schon einmal", "gerade") oder ueber die Einladung,
 * eine Situation zu erzaehlen ("Erzaehl von einer Situation, in der ..."). Ohne
 * das eine oder das andere wird daraus wieder eine Eigenschaftsfrage, und ein
 * Test prueft es an jedem Fragetext.
 *
 * VIER DINGE, DIE DER KATALOG ABDECKEN MUSS:
 *
 *   1. Beruflich und PRIVAT. Wer drei Jahre Elternzeit hatte, einen Verein
 *      traegt oder eine Pflege organisiert, hat dort Faehigkeiten erworben,
 *      die in keinem Arbeitszeugnis stehen. Ein Katalog, der nur nach Arbeit
 *      fragt, findet bei diesen Menschen nichts - und das waere kein
 *      Messergebnis, sondern ein Fehler des Messinstruments.
 *
 *   2. Auch das Misslungene. Wer nur nach Erfolgen fragt, bekommt Bewerbungs-
 *      prosa. Die verlaesslichste Auskunft ueber Koennen liegt darin, was
 *      jemand nach einem Fehlschlag anders gemacht hat.
 *
 *   3. Den AUSSENAUFTRITT. Marias Beispiel: "Ihr seid beide sehr ruhig [...]
 *      dann braeuchtet ihr vielleicht noch jemanden, der praesentieren kann."
 *      Die Fragen 4 und 5 zielen darauf - und zwar auf die Situation, nicht auf
 *      den Charakter (siehe die Familie communication_representation in
 *      20261021120000). Nur Frage 5 schlaegt dabei einen Bereich vor: Was in
 *      Frage 4 erzaehlt wird, kann Buehne, Vertriebsgespraech oder Erklaeren
 *      sein, und einen davon vorauszuwaehlen waere geraten.
 *
 *   4. BEIDE RICHTUNGEN DES ALIGNMENTS. Zwei Fragen am Ende gehen nicht auf
 *      Koennen, sondern auf Wollen: Was willst du abgeben, was willst du
 *      uebernehmen. Genau daraus entstehen die Zustaende des Vergleichs
 *      (`contested`, `openPosition`, `handoverPath`) - ohne sie kennt die
 *      Teamauswertung nur Faehigkeiten und keine Rollen.
 *
 * DIE FORMULIERUNGEN SIND MARIAS, vom 21.09.2026, und an drei Stellen besser
 * als meine erste Fassung - der Grund steht jeweils an der Frage:
 *
 *   Frage 1 laesst das bewusste STOPPEN als Ergebnis gelten.
 *   Frage 2 fragt nach "anders als geplant" statt nach "misslungen" - eine
 *   Schuldfrage beantwortet man mit Rechtfertigung.
 *   Frage 4 fragt nach "verstaendlich machen oder gewinnen" statt nach "vor
 *   einer Gruppe sprechen" und trifft damit auch das Gespraech zu zweit.
 *
 * DIE TEXTE STEHEN NICHT HIER, sondern in `messages/<locale>/capability.json`
 * unter `interview.questions.<id>`. Eine Frage in zwei Sprachen ist eine
 * Uebersetzung und kein Code; und der vorhandene Test auf fehlende
 * Sprachschluessel greift dort automatisch.
 */

import type { OwnershipWish } from "./capabilityTypes";

/**
 * Woher eine Frage kommt.
 *
 * Marias Entscheidung vom 21.09.2026: "Modell live, aber wenn es nicht
 * verfuegbar ist, soll das angezeigt werden und dann sollen vorgelegte Fragen
 * ausgespielt werden." Beide Wege sind gleichwertig im Verlauf - was sie
 * unterscheidet, ist nachlesbar und wird angezeigt, nicht verschwiegen.
 */
export const INTERVIEW_QUESTION_SOURCES = ["catalogue", "model"] as const;
export type InterviewQuestionSource = (typeof INTERVIEW_QUESTION_SOURCES)[number];

/**
 * In welchem Leben die Frage sucht.
 *
 * `either` heisst ausdruecklich "beides ist gleich gueltig" und steht so auch
 * im Fragetext - ohne diesen Hinweis erzaehlen Menschen bei einer neutralen
 * Frage fast immer aus dem Beruf.
 */
export const INTERVIEW_CONTEXTS = ["professional", "personal", "either"] as const;
export type InterviewContext = (typeof INTERVIEW_CONTEXTS)[number];

/**
 * Worauf die Antwort hinauslaeuft.
 *
 *   `evidence`         - ein Beispiel, aus dem Bereiche und Stufe folgen.
 *   `ownership_away`   - was jemand abgeben will (`prefer_other`,
 *                        `prefer_external`).
 *   `ownership_growth` - was jemand uebernehmen will, ohne es schon zu koennen
 *                        (`grow_into`).
 *
 * Die beiden Ownership-Fragen erzeugen ebenfalls Evidenz - sie schlagen
 * hinterher aber einen anderen Verantwortungswunsch vor. Das ist der einzige
 * Unterschied, und er steht hier, damit er nicht in der Oberflaeche verteilt
 * herumliegt.
 */
export const INTERVIEW_TARGETS = ["evidence", "ownership_away", "ownership_growth"] as const;
export type InterviewTarget = (typeof INTERVIEW_TARGETS)[number];

export type InterviewQuestion = {
  id: string;
  context: InterviewContext;
  target: InterviewTarget;
  /**
   * Bereiche, die die FRAGE nahelegt - nicht die Antwort.
   *
   * Wer auf "wann hast du zuletzt vor einer Gruppe gesprochen" ueberhaupt
   * etwas erzaehlt, hat damit vor einer Gruppe gesprochen. Diese Bereiche
   * werden dem Vorschlagsschritt ZUSAETZLICH mitgegeben und dort als "wegen
   * der Frage" ausgewiesen, nicht als Fund im Text. Bestaetigen muss sie
   * trotzdem der Mensch - wie alles hier.
   */
  suggestsAreas: readonly string[];
  /**
   * Welcher Verantwortungswunsch vorausgewaehlt wird. Nur bei den beiden
   * Ownership-Fragen gesetzt, und auch dort nur als Vorauswahl.
   */
  suggestsWish: OwnershipWish | null;
  /**
   * Geschriebene Nachfragen - der Weg, wenn kein Modell erreichbar ist.
   *
   * Sie sind absichtlich nicht generisch ("kannst du das genauer sagen?"),
   * sondern gehen auf die eine Stelle, an der Antworten auf diese Frage
   * regelmaessig zu ungenau bleiben. Eine generische Nachfrage ist schlimmer
   * als keine: Sie signalisiert, dass niemand zugehoert hat.
   */
  followUpIds: readonly string[];
};

/**
 * Die Reihenfolge ist Teil des Leitfadens und keine Liste.
 *
 *   Zuerst das Leichteste und Konkreteste (eine abgeschlossene Aufgabe).
 *   Dann das Misslungene - das traut man sich erst, wenn man warm ist.
 *   Dann das Private, ausdruecklich eingeladen.
 *   Dann der Aussenauftritt und das Unangenehme.
 *   Dann der Blick von aussen ("wofuer kommen Menschen zu dir").
 *   Zuletzt die beiden Fragen nach dem Wollen: Sie gehen in die Zukunft und
 *   brauchen den ganzen Anlauf davor.
 */
export const INTERVIEW_QUESTIONS: readonly InterviewQuestion[] = [
  {
    // "Erzaehl mir von der letzten Sache, fuer die du wirklich Verantwortung
    //  getragen hast - bis zu einem klaren Ergebnis oder einer bewussten
    //  Entscheidung, sie zu stoppen."
    //
    // Maria, 21.09.2026. Der Nachsatz ist der Kern: Etwas bewusst zu stoppen
    // ist Verantwortung und kein Scheitern - ohne ihn erzaehlt niemand davon,
    // und genau diese Faelle zeigen Urteilsfaehigkeit am deutlichsten.
    //
    // Zeigt: Ownership, Execution, Priorisierung, Koordination, Urteil.
    id: "owned_last",
    context: "professional",
    target: "evidence",
    suggestsAreas: [],
    suggestsWish: null,
    followUpIds: ["whatWasYours", "howYouDecidedDone"],
  },
  {
    // "Erzaehl von etwas, das in letzter Zeit deutlich anders gelaufen ist, als
    //  du geplant oder gehofft hattest."
    //
    // Bewusst nicht "was ist dir misslungen": Das ist eine Schuldfrage, und auf
    // Schuldfragen antworten Menschen mit Rechtfertigung. "Anders als geplant"
    // laesst dieselbe Geschichte erzaehlen, ohne sie zu bewerten.
    //
    // Zeigt: Reflexion, Lernen, Fehleranalyse, Anpassung.
    id: "went_wrong",
    context: "professional",
    target: "evidence",
    suggestsAreas: [],
    suggestsWish: null,
    followUpIds: ["yourOwnPart", "whatChanged"],
  },
  {
    // "Was hast du ausserhalb klassischer Erwerbsarbeit schon einmal aufgebaut,
    //  organisiert oder ermoeglicht, bei dem dein eigener Beitrag wirklich
    //  wichtig war?"
    //
    // "Klassische Erwerbsarbeit" statt "Arbeit": Pflege, Ehrenamt und
    // Vereinsarbeit SIND Arbeit, und wer das anders benennt, faellt bei dieser
    // Frage aus dem Katalog.
    //
    // Zeigt: informelle Faehigkeiten, Initiative, Ressourcen mobilisieren,
    // Execution.
    id: "outside_work",
    context: "personal",
    target: "evidence",
    suggestsAreas: [],
    suggestsWish: null,
    followUpIds: ["whatYouDidYourself", "howYouNoticedImpact"],
  },
  {
    // "Erzaehl von einer Situation, in der du Menschen, die dich oder dein
    //  Thema noch nicht gut kannten, etwas verstaendlich machen oder fuer etwas
    //  gewinnen musstest."
    //
    // BESSER ALS "vor einer Gruppe gesprochen" (meine erste Fassung): Es trifft
    // das Gespraech zu zweit genauso wie die Buehne. Wer noch nie auf einer
    // Buehne stand, aber eine Behoerde, einen Vermieter oder einen ersten
    // Kunden ueberzeugt hat, hat dieselbe Faehigkeit gezeigt.
    //
    // UND DESHALB SCHLAEGT SIE KEINEN BEREICH VOR: Die Situation kann
    // Buehnenauftritt, Vertriebsgespraech oder Erklaeren sein. Einen davon
    // vorauszuwaehlen waere geraten.
    //
    // Zeigt: Kommunikation, Adressatenorientierung, Influence, evtl. Vertrieb.
    id: "in_front_of_group",
    context: "either",
    target: "evidence",
    suggestsAreas: [],
    suggestsWish: null,
    followUpIds: ["whatYouNeededToUnderstand", "didYouAdapt"],
  },
  {
    // "Wann hast du zuletzt ein wichtiges, unangenehmes Thema angesprochen,
    //  obwohl du mit Widerstand oder Spannung gerechnet hast?"
    //
    // Die einzige Frage mit einem vorgeschlagenen Bereich: Wer darauf ueberhaupt
    // etwas erzaehlt, hat Unangenehmes angesprochen. Das ist kein Fund im Text,
    // sondern folgt aus der Frage - und wird in der Oberflaeche auch so
    // ausgewiesen.
    //
    // Zeigt: schwierige Kommunikation, Feedback, Verhandlung, Verantwortung.
    id: "uncomfortable_topic",
    context: "either",
    target: "evidence",
    suggestsAreas: ["difficult_conversations"],
    suggestsWish: null,
    followUpIds: ["whyItMattered", "howYouWentAboutIt"],
  },
  {
    // "Wobei bitten andere dich wiederholt um Hilfe, Rat oder Unterstuetzung,
    //  obwohl das nicht unbedingt offiziell deine Aufgabe ist?"
    //
    // Der Blick von aussen, und die einzige Frage, die nicht die eigene
    // Einschaetzung erhebt, sondern ein beobachtetes Verhalten anderer. Bei
    // Menschen, die sich selbst niedrig einschaetzen, ist das oft die einzige
    // Frage, die ihre Staerke ueberhaupt sichtbar macht.
    //
    // Bewusst offen: Wofuer Menschen kommen, ist genau das, was wir nicht
    // vorwegnehmen wollen.
    //
    // Zeigt: wiederkehrende Staerken, Fremdsignale, informelle Expertise.
    id: "people_come_to_you",
    context: "either",
    target: "evidence",
    suggestsAreas: [],
    suggestsWish: null,
    followUpIds: ["lastExample", "whatYouActuallyDo"],
  },
  {
    // "Welche Aufgabe oder Verantwortung uebernimmst du gerade, obwohl du sie
    //  langfristig lieber abgeben wuerdest?"
    //
    // Zeigt: Koennen ist nicht Wollen, Delegation, Qualitaetsanspruch,
    // Rollenpraeferenz.
    id: "would_hand_over",
    context: "either",
    target: "ownership_away",
    suggestsAreas: [],
    // Nicht `prefer_external`: Abgeben heisst zunaechst "jemand anders im
    // Team", nicht "einkaufen". Die zweite Moeglichkeit steht daneben.
    suggestsWish: "prefer_other",
    followUpIds: ["whyStillYou", "whatSomeoneElseNeeds"],
  },
  {
    // "Welche Verantwortung wuerdest du im naechsten Jahr gern uebernehmen,
    //  obwohl du heute noch nicht sicher waerst, sie allein gut auszufuellen?"
    //
    // Der Nachsatz erlaubt die Antwort. Ohne ihn nennt man nur, was man sich
    // zutraut - und das ist wieder Selbstvertrauen statt Absicht.
    //
    // Zeigt: Entwicklungsinteresse, kuenftige Ownership, Lernbedarf.
    id: "want_to_own",
    context: "either",
    target: "ownership_growth",
    suggestsAreas: [],
    suggestsWish: "grow_into",
    followUpIds: ["whatDrawsYou", "whatYouWouldNeed"],
  },
] as const;

export const INTERVIEW_QUESTION_IDS = INTERVIEW_QUESTIONS.map((question) => question.id);

/**
 * Ab wie vielen Antworten ein Gespraech etwas hergibt.
 *
 * VIER IST EINE ENTSCHEIDUNG, KEINE TECHNISCHE GRENZE - dieselbe Ueberlegung
 * wie bei MAX_CONFIRMED_AREAS: Aus einer einzigen Antwort laesst sich keine
 * Rollenlage ableiten, und ein Gespraech, das nach einer Frage als "fertig"
 * gilt, erzeugt eine Auswertung, die mehr behauptet als sie weiss.
 *
 * Aufhoeren kann man trotzdem jederzeit. Die Grenze entscheidet nur, ob wir
 * eine Auswertung ANBIETEN.
 */
export const INTERVIEW_MIN_ANSWERS = 4;

/**
 * Wie viele Nachfragen ein Modell hoechstens einschiebt.
 *
 * Ohne Grenze fragt ein Modell gerne weiter, solange es etwas findet - und
 * dann sitzt jemand nach vierzig Minuten bei Frage drei. Zwei je Katalogfrage
 * ist so viel, wie ein Mensch als Interesse liest und nicht als Verhoer.
 */
export const INTERVIEW_MAX_MODEL_FOLLOW_UPS = 2;

export function findInterviewQuestion(id: string) {
  return INTERVIEW_QUESTIONS.find((question) => question.id === id) ?? null;
}

/**
 * Die naechste Katalogfrage, die noch nicht gestellt wurde.
 *
 * Nach der REIHENFOLGE DES KATALOGS, nicht nach der des Verlaufs: Wer ein
 * Gespraech nach zwei Tagen fortsetzt, soll dort weitermachen, wo der
 * Leitfaden weitergeht - auch wenn zwischendurch Modellfragen dazukamen.
 */
export function nextCatalogueQuestion(askedIds: readonly string[]) {
  const asked = new Set(askedIds);
  return INTERVIEW_QUESTIONS.find((question) => !asked.has(question.id)) ?? null;
}

/** Wie weit jemand ist - fuer die Anzeige, nicht fuer eine Bewertung. */
export function interviewProgress(answeredCatalogueIds: readonly string[]) {
  const answered = new Set(answeredCatalogueIds.filter((id) => findInterviewQuestion(id)));
  return {
    answered: answered.size,
    total: INTERVIEW_QUESTIONS.length,
    hasEnough: answered.size >= INTERVIEW_MIN_ANSWERS,
  };
}
