import { type FounderAlignmentWorkbookStepId } from "@/features/reporting/founderAlignmentWorkbook";

export const WORKBOOK_STEP_CONTENT: Record<
  FounderAlignmentWorkbookStepId,
  { context: string[]; everyday: string }
> = {
  vision_direction: {
    context: [
      "Dieses Thema legt fest, worauf ihr gemeinsam hinarbeitet und welche Richtung euch langfristig traegt.",
      "Gerade frueh in der Zusammenarbeit entstehen hier oft unausgesprochene Erwartungen zu Wachstum, Exit und Prioritaeten.",
    ],
    everyday:
      "Im Alltag zeigt sich das oft dort, wo ihr strategische Chancen unterschiedlich bewertet oder nicht sofort gleich entscheidet, was fuer den Unternehmensaufbau jetzt Vorrang hat.",
  },
  roles_responsibility: {
    context: [
      "Klare Rollen schaffen Tempo, Verlaesslichkeit und weniger Reibung in der taeglichen Zusammenarbeit.",
      "Wird Verantwortung nicht bewusst geklaert, entsteht schnell Unsicherheit bei Ownership, Mitsprache und Erwartung an Sichtbarkeit.",
    ],
    everyday:
      "Spuerbar wird das haeufig bei Themen wie Verantwortungsbereichen, Einblick in Entscheidungen oder der Frage, wer etwas wirklich final owns.",
  },
  decision_rules: {
    context: [
      "Entscheidungsregeln geben euch Orientierung, wenn Zeitdruck, Unsicherheit oder unterschiedliche Perspektiven zusammenkommen.",
      "Sie helfen dabei, Tempo und Sorgfalt so auszubalancieren, dass Entscheidungen nicht jedes Mal neu ausgehandelt werden muessen.",
    ],
    everyday:
      "Im Alltag wird das oft sichtbar, wenn ihr bei unklarer Datenlage unterschiedlich schnell entscheiden wollt oder Verantwortung fuer Entscheidungen anders verteilt seht.",
  },
  commitment_load: {
    context: [
      "Commitment und Belastung bestimmen, wie tragfaehig eure Zusammenarbeit im Alltag wirklich ist.",
      "Hier geht es nicht nur um Einsatz, sondern auch um realistische Verfuegbarkeit, Prioritaeten und den Umgang mit intensiven Phasen.",
    ],
    everyday:
      "Das zeigt sich haeufig daran, wie kurzfristig ihr verfuegbar seid, wie viel Fokus das Startup im Alltag bekommt und wie offen ihr ueber Belastungsgrenzen sprecht.",
  },
  collaboration_conflict: {
    context: [
      "Zusammenarbeit bleibt vor allem dann stabil, wenn Abstimmung und Konfliktklaerung nicht dem Zufall ueberlassen werden.",
      "Gerade unterschiedliche Stile koennen produktiv sein, brauchen im Alltag aber klare Spielregeln.",
    ],
    everyday:
      "Im Alltag merkt man das oft daran, wie frueh Irritationen angesprochen werden, wie viel Abstimmung ihr braucht und wann Feedback als hilfreich oder als Eingriff erlebt wird.",
  },
  ownership_risk: {
    context: [
      "Ownership und Risiko beruehren die besonders sensiblen Fragen unternehmerischer Zusammenarbeit.",
      "Wenn Finanzierung, Equity, Gehalt oder persoenliche Sicherheit unterschiedlich gesehen werden, lohnt sich frueh klare Abstimmung.",
    ],
    everyday:
      "Spuerbar wird das haeufig bei Entscheidungen zu Finanzierung, Verwasserung, Gehaltsverzicht oder der Frage, welches unternehmerische Risiko fuer euch noch tragbar ist.",
  },
  values_guardrails: {
    context: [
      "Wenn ihr beide das Werte-Add-on abgeschlossen habt, lohnt es sich, eure wichtigsten Leitplanken nicht nur zu besprechen, sondern bewusst festzuhalten.",
      "Gerade unter Druck helfen klare Wertentscheidungen, spaetere Spannungen bei Hiring, Partnerschaften oder Investor:innen nicht erst im Konflikt klaeren zu muessen.",
    ],
    everyday:
      "Im Alltag zeigt sich das oft dort, wo wirtschaftlicher Druck steigt, schwierige Kompromisse auf den Tisch kommen oder ihr entscheiden muesst, welche roten Linien fuer euer Unternehmen wirklich gelten.",
  },
  alignment_90_days: {
    context: [
      "Dieser Schritt uebersetzt eure wichtigsten Erkenntnisse in konkrete Vereinbarungen fuer die naechsten Wochen.",
      "So wird aus einem guten Gespraech ein Arbeitsmodus, der im Alltag wirklich sichtbar werden kann.",
    ],
    everyday:
      "Im Alltag zeigt sich das daran, ob eure Vereinbarungen in Routinen, Check-ins, Entscheidungen und konkreten Zustaendigkeiten in den naechsten 90 Tagen auftauchen.",
  },
  advisor_closing: {
    context: [
      "Am Ende einer Alignment-Session kann eine neutrale dritte Perspektive oft noch einmal besonders klar sichtbar machen, wo Muster, offene Spannungen oder gute Ansatzpunkte liegen.",
      "Dieser Abschlussblock ersetzt keine Founder-Vereinbarungen, sondern ordnet das Gespraech als zusaetzliche Beobachtung, Rueckfrage und Empfehlung ein.",
    ],
    everyday:
      "Im Alltag ist das vor allem dann hilfreich, wenn ein Advisor rote Faeden, ungeklaerte Punkte oder konkrete naechste Schritte benoennen kann, bevor sie zwischen Meeting und Umsetzung wieder verschwimmen.",
  },
};
