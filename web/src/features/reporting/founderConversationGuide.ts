import { type FounderAlignmentWorkbookStepId } from "@/features/reporting/founderAlignmentWorkbook";

export type FounderConversationChapter = {
  id: string;
  title: string;
  context: string;
  reflectionQuestions: [string, string, string];
  decisionQuestion: string;
  relatedStepIds: FounderAlignmentWorkbookStepId[];
  accent: "primary" | "accent";
};

export const FOUNDER_VALUES_CONVERSATION_BLOCK = {
  title: "Werte und unternehmerische Leitplanken",
  intro:
    "Wenn ihr beide auch das Werte-Add-on ausgefuellt habt, lohnt sich ein kurzer Blick darauf, welche inneren Prioritaeten eure Entscheidungen praegen. Diese Fragen helfen euch, moegliche Unterschiede frueh sichtbar zu machen.",
  questions: [
    "Wenn ihr unter Druck schnell entscheiden muesst: Woran soll erkennbar sein, dass die Entscheidung nicht nur wirtschaftlich sinnvoll, sondern auch fuer euch stimmig ist?",
    "Wo wollt ihr bei Wachstum klar vorangehen und wo soll Verantwortung gegenueber Team, Kund:innen oder Partnern bewusst Vorrang haben?",
    "Welche schwierigen Kompromisse waeren fuer euch noch tragbar und ab welchem Punkt wuerde sich etwas nicht mehr richtig anfuehlen?",
    "Welche roten Linien sollen bei Investor:innen, Hiring oder Partnerschaften fuer euch gelten, auch wenn der Druck hoch ist?",
  ] as [string, string, string, string],
} as const;

// Fachliche Quelle fuer den moderierten Gespraechsleitfaden zwischen Report und Workbook.
export const FOUNDER_CONVERSATION_GUIDE_CHAPTERS: FounderConversationChapter[] = [
  {
    id: "personal_motivation",
    title: "Persoenliche Motivation",
    context:
      "Am Anfang jeder Gruendung steht nicht nur eine Idee, sondern auch eine persoenliche Erwartung an Rolle, Sinn und Lebensrealitaet. Dieses Kapitel hilft euch zu klaeren, was euch jeweils in diese Zusammenarbeit zieht und was ihr langfristig davon erwartet.",
    reflectionQuestions: [
      "Warum wollt ihr dieses Unternehmen ueberhaupt gemeinsam bauen und nicht nur ein Projekt starten?",
      "Welche persoenliche Bedeutung soll die Gruendung fuer euren Alltag, eure Rolle und eure Entwicklung haben?",
      "Woran wuerdet ihr frueh merken, dass eure Motivation in unterschiedliche Richtungen laeuft?",
    ],
    decisionQuestion:
      "Welche gemeinsame Grundmotivation soll eure Zusammenarbeit tragen, auch wenn Entscheidungen spaeter schwierig werden?",
    relatedStepIds: ["vision_direction", "commitment_load"],
    accent: "primary",
  },
  {
    id: "company_type",
    title: "Die Art von Unternehmen, die ihr bauen wollt",
    context:
      "Viele spaetere Spannungen entstehen nicht erst im Operativen, sondern bei der Frage, welches Unternehmen ueberhaupt entstehen soll. Hier geht es darum, eure strategische Richtung, euren Zeithorizont und eure Vorstellung von Wachstum sichtbar zu machen.",
    reflectionQuestions: [
      "Welche Art von Unternehmen wollt ihr in drei bis fuenf Jahren gebaut haben?",
      "Wie schaut ihr auf Themen wie Wachstum, Exit, Unabhaengigkeit oder langfristigen Aufbau?",
      "Welche strategischen Prioritaeten duerfen sich nicht stillschweigend auseinanderentwickeln?",
    ],
    decisionQuestion:
      "Welche gemeinsame Leitlinie soll euch kuenftig bei strategischen Richtungsentscheidungen Orientierung geben?",
    relatedStepIds: ["vision_direction", "ownership_risk"],
    accent: "accent",
  },
  {
    id: "daily_collaboration",
    title: "Zusammenarbeit im Alltag",
    context:
      "Gute Zusammenarbeit entsteht selten zufaellig. Dieses Kapitel hilft euch, Abstimmungsnaehe, Sichtbarkeit und Eigenraum so zu besprechen, dass ihr im Alltag verbunden bleibt, ohne euch gegenseitig auszubremsen.",
    reflectionQuestions: [
      "Wie eng wollt ihr im Alltag abgestimmt arbeiten, ohne euch gegenseitig zu verlangsamen?",
      "Wie sichtbar sollen Fortschritt, offene Punkte und Entscheidungen füreinander sein?",
      "Woran merkt ihr früh, dass eure Zusammenarbeit zu eng oder zu lose gekoppelt ist?",
    ],
    decisionQuestion:
      "Welche Arbeitsregel soll fuer Abstimmung, Sichtbarkeit und Eigenraum in eurem Alltag gelten?",
    relatedStepIds: ["roles_responsibility", "collaboration_conflict"],
    accent: "primary",
  },
  {
    id: "uncertainty",
    title: "Umgang mit Unsicherheit",
    context:
      "Gruendung bedeutet fast immer Entscheidungen unter unvollstaendigen Informationen. Hier geht es darum, wie ihr mit Risiko, Tempo, Absicherung und Experimenten umgehen wollt, ohne euch gegenseitig zu blockieren.",
    reflectionQuestions: [
      "Wie viel Unsicherheit wollt ihr vor wichtigen Entscheidungen aushalten koennen?",
      "Wann ist fuer euch ein Experiment sinnvoll und wann braucht es mehr Absicherung?",
      "Welche Unterschiede bei Risiko oder Entscheidungstempo solltet ihr frueh benennen, statt sie erst unter Druck zu spueren?",
    ],
    decisionQuestion:
      "An welchem gemeinsamen Prinzip wollt ihr euch bei Risiko, Experimente und unsicheren Entscheidungen orientieren?",
    relatedStepIds: ["decision_rules", "ownership_risk"],
    accent: "accent",
  },
  {
    id: "commitment",
    title: "Commitment und Belastung",
    context:
      "Unterschiedliche Erwartungen an Fokus, Verfuegbarkeit oder Belastbarkeit bleiben oft lange unausgesprochen und werden erst spaeter zum Thema. Dieses Kapitel hilft euch, einen realistischen Erwartungsrahmen zu setzen.",
    reflectionQuestions: [
      "Welchen Stellenwert soll das Unternehmen gegenueber anderen Verpflichtungen aktuell haben?",
      "Welche Erwartungen habt ihr an Erreichbarkeit, Einsatz und Verbindlichkeit?",
      "Wie wollt ihr damit umgehen, wenn Fokus, Energie oder Belastung zeitweise nicht gleich verteilt sind?",
    ],
    decisionQuestion:
      "Welchen gemeinsamen Erwartungsrahmen wollt ihr fuer Fokus, Verfuegbarkeit und Belastung festhalten?",
    relatedStepIds: ["commitment_load"],
    accent: "primary",
  },
  {
    id: "conflict_trust",
    title: "Konflikte und Vertrauen",
    context:
      "Vertrauen entsteht nicht dadurch, dass Reibung ausbleibt, sondern dadurch, wie ihr mit Spannungen umgeht. In diesem Kapitel besprecht ihr, wie Feedback, Irritationen und Meinungsverschiedenheiten konstruktiv bearbeitet werden sollen.",
    reflectionQuestions: [
      "Wie schnell sollen Irritationen angesprochen werden und was macht Feedback fuer euch hilfreich?",
      "Was braucht jede Person, damit Spannung nicht persoenlich wird, sondern klaerbar bleibt?",
      "Welche Gespraechsregeln staerken euer Vertrauen, wenn Meinungen auseinandergehen?",
    ],
    decisionQuestion:
      "Welche Kommunikationsregel soll gelten, wenn Spannungen, Kritik oder Meinungsverschiedenheiten entstehen?",
    relatedStepIds: ["collaboration_conflict"],
    accent: "accent",
  },
];
