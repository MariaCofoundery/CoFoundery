export const ADVISOR_IMPULSE_SECTION_ORDER = [
  "report_overview",
  "top_tensions",
  "workbook_collaboration",
  "workbook_values",
] as const;

export type AdvisorImpulseSectionKey = (typeof ADVISOR_IMPULSE_SECTION_ORDER)[number];

export type AdvisorSectionImpulse = {
  id: string;
  relationshipId: string;
  advisorUserId: string;
  sectionKey: AdvisorImpulseSectionKey;
  text: string;
  createdAt: string;
  updatedAt: string;
};

export type FounderVisibleAdvisorImpulse = {
  id: string;
  sectionKey: AdvisorImpulseSectionKey;
  advisorName: string | null;
  text: string;
  updatedAt: string;
};

export const ADVISOR_IMPULSE_SECTION_META: Record<
  AdvisorImpulseSectionKey,
  {
    title: string;
    description: string;
    placeholder: string;
  }
> = {
  report_overview: {
    title: "Gesamteindruck",
    description: "Kurzer Advisor-Blick auf das Teambild und die zentrale Moderationsaufgabe.",
    placeholder:
      "Zum Beispiel: Die groesste Fuehrungsaufgabe liegt aktuell weniger im Konflikt selbst als in fehlenden Entscheidungsgrenzen.",
  },
  top_tensions: {
    title: "Top-Spannungsfelder",
    description: "Beobachtungen zu den priorisierten Spannungen und worauf im Gespraech geachtet werden sollte.",
    placeholder:
      "Zum Beispiel: Druck entsteht hier weniger durch Inhalte als durch unterschiedliche Reifegrade von Entscheidungen.",
  },
  workbook_collaboration: {
    title: "Zusammenarbeit im Workbook",
    description: "Kurzer Impuls dazu, was im gemeinsamen Arbeitsmodus konkret geklaert oder beobachtet werden sollte.",
    placeholder:
      "Zum Beispiel: Die Rollen sind prinzipiell klar, kippen aber bei Prioritaetswechseln noch in Mitsprache-Unklarheit.",
  },
  workbook_values: {
    title: "Werte und Guardrails",
    description: "Hinweis darauf, welche Leitplanken oder Wertefragen spaeter bewusst geklaert werden sollten.",
    placeholder:
      "Zum Beispiel: Nicht die Werte an sich wirken strittig, sondern die Frage, wann sie operative Prioritaeten uebersteuern.",
  },
};
