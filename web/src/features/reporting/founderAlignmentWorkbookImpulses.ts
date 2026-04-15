import type { FounderAlignmentWorkbookStepId } from "@/features/reporting/founderAlignmentWorkbook";
import type { FounderMatchingMarkerClass } from "@/features/reporting/founderMatchingMarkers";

export type WorkbookStepImpulseContent = {
  questions: string[];
  matchingImpulses: string[];
};

type StructuredWorkbookStepId = Exclude<FounderAlignmentWorkbookStepId, "advisor_closing">;

const STEP_QUESTIONS: Record<StructuredWorkbookStepId, string[]> = {
  vision_direction: [
    "Was wollt ihr langfristig aufbauen - und was auf keinen Fall?",
    "Wann waere ein Exit fuer euch sinnvoll - und wann nicht?",
    "Welche Art von Wachstum fuehlt sich fuer euch richtig an?",
    "Unter welchen Bedingungen wuerdet ihr Investoren aufnehmen?",
  ],
  roles_responsibility: [
    "Wer uebernimmt welche Verantwortung - und warum?",
    "Welche Bereiche gehoeren klar einer Person?",
    "Wo arbeitet ihr bewusst gemeinsam?",
    "Woran erkennt ihr, dass eine Rolle nicht mehr passt?",
  ],
  decision_rules: [
    "Wann ist eine Entscheidung fuer euch gut genug?",
    "Wer darf welche Entscheidungen alleine treffen?",
    "Wann braucht es Abstimmung - und wann nicht?",
    "Was passiert, wenn ihr euch nicht einig seid?",
  ],
  commitment_load: [
    "Wie viel Zeit und Energie wollt ihr realistisch investieren?",
    "Was bedeutet voll dabei sein fuer euch konkret?",
    "Wie geht ihr mit Phasen hoher Belastung um?",
    "Was passiert, wenn einer weniger geben kann als geplant?",
  ],
  collaboration_conflict: [
    "Wie sprecht ihr Spannungen oder Probleme an?",
    "Wann ist der richtige Moment, etwas anzusprechen?",
    "Was hilft euch, wieder auf eine gemeinsame Linie zu kommen?",
    "Was macht Konflikte fuer euch schwierig?",
  ],
  ownership_risk: [
    "Welche Risiken seid ihr bereit einzugehen - und welche nicht?",
    "Wer traegt Verantwortung fuer kritische Entscheidungen?",
    "Wie geht ihr mit Unsicherheit um?",
    "Wann ist ein Risiko fuer euch vertretbar?",
  ],
  values_guardrails: [
    "Was ist euch im Umgang miteinander besonders wichtig?",
    "Welche Prinzipien sollen Entscheidungen leiten?",
    "Was waere fuer euch ein klares No-Go?",
    "Woran merkt man, dass ihr richtig handelt?",
  ],
  alignment_90_days: [
    "Was sind die wichtigsten Ziele der naechsten 90 Tage?",
    "Woran erkennt ihr, dass ihr vorankommt?",
    "Was hat aktuell Prioritaet - und was bewusst nicht?",
    "Welche Entscheidungen stehen bald an?",
  ],
};

const STEP_MATCHING_IMPULSES: Record<
  StructuredWorkbookStepId,
  Record<FounderMatchingMarkerClass | "default", string[]>
> = {
  vision_direction: {
    stable_base: [
      "Woran wuerdet ihr merken, dass ihr hier zu lange vom gleichen Fokusbild ausgeht und Alternativen zu spaet prueft?",
      "Welche Chance duerfte euch nur dann aus dem Fokus ziehen, wenn ihr bewusst etwas anderes stoppt?",
    ],
    conditional_complement: [
      "Wo macht euch euer unterschiedlicher Blick auf Chancen breiter - und wo braucht er eine feste Prioritaetslogik?",
      "Wer stoppt, wenn Wachstum und Kernfokus gleichzeitig ziehen?",
    ],
    high_rule_need: [
      "Welche Art von Chance muesst ihr explizit gegen euren Fokus pruefen, statt sie aus dem Bauch zu verfolgen?",
      "Was bleibt bewusst liegen, wenn eine attraktive Option neu dazukommt?",
    ],
    critical_clarification_point: [
      "Welche strategische Differenz duerft ihr hier nicht im Alltag nebenher austragen?",
      "Was gilt, bis ihr euch ueber einen Richtungswechsel wirklich geeinigt habt?",
    ],
    default: [
      "Wie entscheidet ihr, ob Wachstum oder Absicherung hier Vorrang hat?",
      "Woran merkt ihr frueh, dass euch eine Chance vom Kernfokus wegzieht?",
    ],
  },
  roles_responsibility: {
    stable_base: [
      "Wo koennt ihr euch hier zu sehr auf stilles Verstaendnis verlassen und Ownership zu wenig sichtbar machen?",
      "Welche Mitsicht braucht ihr auch dann, wenn eine Verantwortung klar zugeordnet ist?",
    ],
    conditional_complement: [
      "Wo ergaenzen euch unterschiedliche Fuehrungsansaetze - und wo braucht es eine feste Grenze fuer Mitsicht?",
      "Wann soll die andere Person frueh rein, auch wenn eine Verantwortung klar gefuehrt wird?",
    ],
    high_rule_need: [
      "Welche Grenze zwischen Fuehrung und Mitsicht muss explizit werden, damit Themen nicht doppelt oder gar nicht laufen?",
      "Wo darf Eigenverantwortung nicht bis ganz zum Ende still bleiben?",
    ],
    critical_clarification_point: [
      "Welcher Bereich darf gerade nicht weiterlaufen, bis Ownership wirklich geklaert ist?",
      "Was gilt sofort, wenn zwei Personen dasselbe Thema unterschiedlich fuer sich beanspruchen?",
    ],
    default: [
      "Woran merkt ihr, dass Verantwortung noch zu allgemein verteilt ist?",
      "Was muss sichtbar werden, bevor eine Sache vom Eigenraum in gemeinsame Abstimmung kippt?",
    ],
  },
  decision_rules: {
    stable_base: [
      "Welche Entscheidungstypen koennt ihr hier zu still als selbstverstaendlich behandeln?",
      "Wann prueft ihr bewusst, ob eure Entscheidungsregel auch unter Druck noch traegt?",
    ],
    conditional_complement: [
      "Wie nutzt ihr Tempo und Absicherung als Ergaenzung statt als Dauerschleife?",
      "Wer hat wann den letzten Schritt, wenn beide gute Gruende sehen?",
    ],
    high_rule_need: [
      "Welche Entscheidung bleibt sonst zu lange offen, wenn niemand die Regel explizit macht?",
      "Welche Schwelle zieht die zweite Person zwingend mit in die Entscheidung?",
    ],
    critical_clarification_point: [
      "Welche offene Entscheidungslogik blockiert euch hier bereits?",
      "Was gilt ab jetzt, solange ihr euch ueber den finalen Weg noch nicht einig seid?",
    ],
    default: [
      "Wie verhindert ihr, dass Entscheidungen zu lange offen bleiben?",
      "Welche Logik hat Vorrang, wenn Tempo und Absicherung kollidieren?",
    ],
  },
  commitment_load: {
    stable_base: [
      "Wo koennt ihr Belastung zu spaet ansprechen, weil ihr euch im Grundsatz vertraut?",
      "Welches Signal zeigt euch frueh, dass Realitaet und Erwartung auseinanderlaufen?",
    ],
    conditional_complement: [
      "Wie macht ihr unterschiedliche Verfuegbarkeit produktiv, ohne still ungleiche Erwartungen aufzubauen?",
      "Wer sagt zuerst, wenn Tempo oder Belastung kippt?",
    ],
    high_rule_need: [
      "Welche Erwartung an Einsatz muss explizit werden, damit sie nicht still vorausgesetzt bleibt?",
      "Was wird zuerst reduziert, wenn Kapazitaet kippt?",
    ],
    critical_clarification_point: [
      "Welche Belastungsdifferenz duerft ihr nicht laenger still mittragen?",
      "Was gilt ab jetzt, wenn Zusagen sonst fragil werden?",
    ],
    default: [
      "Wie schuetzt ihr euch vor stiller Ueberlast oder unausgesprochenen Erwartungen?",
      "Was wird zuerst neu priorisiert, wenn Einsatz und Verfuegbarkeit auseinanderlaufen?",
    ],
  },
  collaboration_conflict: {
    stable_base: [
      "Woran merkt ihr, dass ihr Spannung hier eher zu spaet besprecht, weil im Grundsatz alles ruhig wirkt?",
      "Welche Form der Klaerung darf nicht dem Zufall ueberlassen bleiben?",
    ],
    conditional_complement: [
      "Wie nutzt ihr unterschiedliche Konfliktstile als Ergaenzung statt als Missverstaendnis?",
      "Wann braucht direkte Rueckmeldung eine ruhigere Form - und umgekehrt?",
    ],
    high_rule_need: [
      "Welche Reibung bleibt sonst zu lange im Tagesgeschaeft haengen?",
      "Was ist euer fruehester Punkt fuer aktive Klaerung?",
    ],
    critical_clarification_point: [
      "Welches Thema darf hier nicht weiterlaufen, ohne bewusst geklaert zu werden?",
      "Wie stoppt ihr eine Eskalation, bevor sie andere Felder mitzieht?",
    ],
    default: [
      "Wann ist bei euch der richtige Moment, eine Spannung nicht mehr nur mitzulesen, sondern anzusprechen?",
      "Was hilft euch, Kritik klar zu machen, ohne dass sie sofort auf Beziehungsebene rutscht?",
    ],
  },
  ownership_risk: {
    stable_base: [
      "Woran merkt ihr, dass ihr Risiken hier zu still gemeinsam unterschaetzt?",
      "Welche Schwelle darf nicht nur implizit im Raum sein?",
    ],
    conditional_complement: [
      "Wie nutzt ihr unterschiedliche Risikoblicke, ohne dass eine Person dauernd bremst und die andere dauernd zieht?",
      "Wer macht ein Thema spaetestens sichtbar, bevor daraus ein gemeinsames Problem wird?",
    ],
    high_rule_need: [
      "Welche Risikoschwelle muss explizit sein, damit Tempo nicht gegen Absicherung laeuft?",
      "Wann reicht Beobachten nicht mehr und ihr zieht die andere Person verbindlich dazu?",
    ],
    critical_clarification_point: [
      "Welches Risiko duerft ihr nicht laenger unterschiedlich lesen?",
      "Ab welchem Punkt gilt bis auf Weiteres gemeinsame Entscheidung statt Einzelsteuerung?",
    ],
    default: [
      "Wie stellt ihr sicher, dass Risiken frueh sichtbar werden, ohne jedes Thema sofort zu eskalieren?",
      "Wo geht fuer euch Absicherung klar vor Tempo?",
    ],
  },
  values_guardrails: {
    stable_base: [
      "Wo koennt ihr gemeinsame Werte ueberschaetzen und Grenzfaelle zu wenig pruefen?",
      "Welche wirtschaftlich attraktive Entscheidung solltet ihr trotzdem einmal gegen eure Linie spiegeln?",
    ],
    conditional_complement: [
      "Wo macht euch unterschiedliches Grenzempfinden breiter - und wo braucht ihr eine klare rote Linie?",
      "Wer stoppt, wenn etwas noch vertretbar wirkt, sich fuer eine Person aber nicht mehr richtig anfuehlt?",
    ],
    high_rule_need: [
      "Welcher Graubereich braucht eine explizite Freigabe, statt still weiterzulaufen?",
      "Welche rote Linie muss klar benannt sein, bevor Druck steigt?",
    ],
    critical_clarification_point: [
      "Welcher Grenzfall darf gerade nicht opportunistisch weiterlaufen?",
      "Was entscheidet ihr hier nie still nebenher?",
    ],
    default: [
      "Welche Kompromisse sind fuer euch noch tragbar - und ab wann wird etwas wirtschaftlich attraktiv, aber inhaltlich falsch?",
      "Was darf nie still freigegeben werden, nur weil gerade Druck da ist?",
    ],
  },
  alignment_90_days: {
    stable_base: [
      "Wo setzt ihr euch leicht zu viel gemeinsamen Fokus voraus, ohne Nicht-Prioritaeten klar zu machen?",
      "Woran merkt ihr, dass euer Fokus ausfranst, obwohl ihr euch im Grundsatz einig seid?",
    ],
    conditional_complement: [
      "Wie nutzt ihr unterschiedliche Prioritaeten fuer bessere Auswahl statt fuer zu viele Parallelen?",
      "Was bekommt nur dann Platz, wenn dafuer etwas anderes bewusst stoppt?",
    ],
    high_rule_need: [
      "Welches Thema braucht eine klare Vorrangentscheidung, statt nebenher weiterzulaufen?",
      "Was ist in den naechsten 90 Tagen bewusst nicht im Fokus?",
    ],
    critical_clarification_point: [
      "Welche Prioritaetsfrage duerft ihr nicht offen in die naechsten 90 Tage mitnehmen?",
      "Was gilt bis zur naechsten Review verbindlich, auch wenn neue Chancen auftauchen?",
    ],
    default: [
      "Was darf nur dann weiterlaufen, wenn ihr bewusst etwas anderes herunternehmt?",
      "Woran erkennt ihr frueh, dass ihr vom 90-Tage-Fokus wieder abdriftet?",
    ],
  },
};

export function buildWorkbookStepImpulseContent(
  stepId: StructuredWorkbookStepId,
  markerClass: FounderMatchingMarkerClass | null
): WorkbookStepImpulseContent {
  const questions = STEP_QUESTIONS[stepId] ?? [];
  const matchingImpulses =
    STEP_MATCHING_IMPULSES[stepId][markerClass ?? "default"] ??
    STEP_MATCHING_IMPULSES[stepId].default;

  return {
    questions,
    matchingImpulses,
  };
}
