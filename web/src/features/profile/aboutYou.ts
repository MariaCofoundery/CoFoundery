import { DIRECTION_MIN_ANSWERS } from "@/features/direction/directionInterviewGuide";

/**
 * „Über dich" — fünf Stationen über neun Erfassungswegen.
 *
 * ---------------------------------------------------------------------------
 * WARUM FÜNF UND NICHT NEUN
 * ---------------------------------------------------------------------------
 *
 * „Das bist du" hat neun Abschnitte, und das ist dort richtig: Jeder
 * beantwortet genau eine Frage über einen Menschen. Zum *Lesen*.
 *
 * Zum *Erfassen* wären neun gleichgewichtige Karten neun Aufgaben. Wer eine
 * Seite mit neun offenen Punkten öffnet, sieht eine Hausaufgabe — und das
 * Gegenteil von „ergänze einfach, was für dich gerade passt".
 *
 * Fünf Stationen sind UX-Gruppen und kein neues Datenmodell. Darunter liegen
 * dieselben Tabellen und dieselben Erfassungsoberflächen wie vorher.
 *
 * ---------------------------------------------------------------------------
 * DREI ZUSTÄNDE, UND KEINER DAVON IST EIN FORTSCHRITT
 * ---------------------------------------------------------------------------
 *
 *     noch offen · begonnen · für jetzt fertig
 *
 * „Für jetzt fertig" ist mit Absicht so formuliert. Ein Founder-Profil ist
 * kein Formular, das einmal endgültig fertig ist, und ein Häkchen, das
 * „fertig" behauptet, macht jede spätere Ergänzung zum Rückschritt.
 *
 * Es gibt hier KEINE Gesamtzahl, keinen Anteil und keine Zählung über die
 * Stationen hinweg - auch nicht nebenbei. „3 von 5" wäre dasselbe wie das
 * „4 von 9", das auf „Das bist du" am 01.10.2026 entfernt wurde, nur an einer
 * anderen Stelle.
 *
 * ---------------------------------------------------------------------------
 * WAS ABLEITBAR IST, WIRD ABGELEITET
 * ---------------------------------------------------------------------------
 *
 * Sechs der neun Schritte tragen ihr Ende schon in den Daten: Ein Bogen ist
 * abgegeben oder nicht, jeder Eintrag hat eine Stufe oder nicht.
 *
 * Für drei gibt es kein Ende in den Daten - „genug Bereiche", „genug
 * Stärken", „mehr Zugänge habe ich nicht" sind Aussagen der Person. Nur dafür
 * gibt es `person_section_marks`.
 */

export const STATION_IDS = ["basis", "arbeitsweise", "mitbringen", "antrieb", "ressourcen"] as const;
export type StationId = (typeof STATION_IDS)[number];

export const STEP_IDS = [
  "basis",
  "arbeitsweise",
  "gespraech",
  "faehigkeiten",
  "erfahrung",
  "verantwortung",
  "staerken",
  "antrieb",
  "ressourcen",
] as const;
export type StepId = (typeof STEP_IDS)[number];

/**
 * Die drei Schritte, deren Ende nur die Person kennt.
 *
 * Geprüft gegen den Code am 01.10.2026, wie in der Aufgabe verlangt: Es sind
 * weiterhin genau diese drei. `faehigkeiten` hat 54 mögliche Bereiche und
 * keine Zahl, ab der es genug ist; `staerken` und `ressourcen` genauso.
 *
 * Alle übrigen sechs haben ein ableitbares Ende - deshalb steht hier nichts
 * weiter.
 */
export const MARKABLE_STEPS = ["faehigkeiten", "staerken", "ressourcen"] as const;
export type MarkableStep = (typeof MARKABLE_STEPS)[number];

export function isMarkableStep(value: unknown): value is MarkableStep {
  return (MARKABLE_STEPS as readonly string[]).includes(String(value));
}

export type StepStatus = "open" | "started" | "doneForNow";

export type AboutYouStep = {
  id: StepId;
  status: StepStatus;
  /** Wohin der nächste Klick führt. */
  href: string;
  /** Ob die Person diesen Schritt selbst als „für jetzt fertig" markieren kann. */
  markable: boolean;
  /**
   * Etwas liegt da, das die Person schon getan hat und das noch nicht im
   * Profil angekommen ist. Höchstens einer - siehe `recommendNextStep`.
   */
  urgent?: true;
};

export type AboutYouStation = {
  id: StationId;
  status: StepStatus;
  steps: AboutYouStep[];
  /** Der sinnvollste nächste Schritt innerhalb dieser Station - oder keiner. */
  next: AboutYouStep | null;
};

/**
 * Was aus den Fachtabellen gelesen wurde.
 *
 * Nur Zahlen und Wahrheitswerte: Diese Datei soll ohne Datenbank prüfbar
 * sein, und der Lader daneben (`aboutYouData.ts`) soll nichts entscheiden.
 */
export type AboutYouFacts = {
  /** `getIdentityGaps(core).length` - 0 heißt veröffentlichungsfähig. */
  identityGaps: number;
  /** Irgendeine Kernangabe gesetzt. */
  identityTouched: boolean;
  workAnswers: number;
  workStarted?: boolean;
  workSubmitted: boolean;
  interviewStarted: boolean;
  interviewCompleted: boolean;
  unsortedAnswers: number;
  areaCount: number;
  levelledCount: number;
  wishedCount: number;
  strengthCount: number;
  directionAnswers: number;
  directionStatements: number;
  confirmedResources: number;
  pendingResources: number;
  marks: ReadonlySet<string>;
};

/** Welche Schritte zu welcher Station gehören. */
export const STEPS_OF: Record<StationId, readonly StepId[]> = {
  basis: ["basis"],
  arbeitsweise: ["arbeitsweise"],
  // Die größte Station: fünf Wege, die dieselbe Frage von fünf Seiten
  // beantworten - was bringst du mit.
  mitbringen: ["gespraech", "faehigkeiten", "erfahrung", "verantwortung", "staerken"],
  antrieb: ["antrieb"],
  ressourcen: ["ressourcen"],
};

/**
 * Der Status eines einzelnen Schritts.
 *
 * `open` heißt „hier ist noch nichts" und NICHT „hier fehlt etwas". Der
 * Unterschied steht in den Texten, nicht im Code - aber er ist der Grund,
 * warum es keinen vierten Zustand „unvollständig" gibt.
 */
function stepStatus(id: StepId, facts: AboutYouFacts): StepStatus {
  const markiert = facts.marks.has(id);

  switch (id) {
    case "basis":
      // Die Schwelle ist dieselbe, die auch über das Veröffentlichen
      // entscheidet (`identityReadiness.ts`). Zwei Begriffe von „genug" für
      // dieselben drei Felder wären ein Widerspruch, den niemand auflöst.
      if (facts.identityGaps === 0) return "doneForNow";
      return facts.identityTouched ? "started" : "open";

    case "arbeitsweise":
      if (facts.workSubmitted) return "doneForNow";
      return (facts.workStarted || facts.workAnswers > 0) ? "started" : "open";

    case "gespraech":
      // Unsortierte Antworten sind KEIN Ende, auch nicht bei abgeschlossenem
      // Gespräch: Was nicht eingeordnet ist, steht nirgends im Profil.
      if (facts.interviewCompleted && facts.unsortedAnswers === 0) return "doneForNow";
      return facts.interviewStarted || facts.unsortedAnswers > 0 ? "started" : "open";

    case "faehigkeiten":
      if (markiert) return "doneForNow";
      return facts.areaCount > 0 ? "started" : "open";

    case "erfahrung":
      // Ohne Bereiche gibt es nichts einzuordnen. Das ist „noch offen" und
      // nicht „fertig": Fertig wäre die Behauptung, es sei etwas geschehen.
      if (facts.areaCount === 0) return "open";
      if (facts.levelledCount >= facts.areaCount) return "doneForNow";
      return facts.levelledCount > 0 ? "started" : "open";

    case "verantwortung":
      if (facts.areaCount === 0) return "open";
      if (facts.wishedCount >= facts.areaCount) return "doneForNow";
      return facts.wishedCount > 0 ? "started" : "open";

    case "staerken":
      if (markiert) return "doneForNow";
      return facts.strengthCount > 0 ? "started" : "open";

    case "antrieb":
      // Die vorhandene Regel des Gesprächs, unverändert: vier von sechs
      // Fragen. Bestätigte Aussagen zählen mit, weil jemand aus einem
      // früheren Durchgang Aussagen haben kann, ohne dass die Antworten
      // noch an derselben Sitzung hängen.
      if (facts.directionAnswers >= DIRECTION_MIN_ANSWERS) return "doneForNow";
      return facts.directionAnswers > 0 || facts.directionStatements > 0 ? "started" : "open";

    case "ressourcen":
      if (markiert) return "doneForNow";
      return facts.confirmedResources > 0 || facts.pendingResources > 0 ? "started" : "open";
  }
}

/**
 * Wohin der Schritt führt.
 *
 * Alles bestehende Adressen. „Über dich" baut keine Erfassungsoberfläche
 * nach - es verdrahtet die, die es gibt.
 */
function stepHref(id: StepId, facts: AboutYouFacts): string {
  switch (id) {
    case "basis":
      return "/profile?step=identity";
    case "arbeitsweise":
      return "/me/profile/workstyle";
    case "gespraech":
      // Wartende Antworten gehen vor einem neuen Gespräch - dieselbe
      // Reihenfolge wie bisher auf der Seite.
      return facts.unsortedAnswers > 0 ? "/profile/interview/sort" : "/profile/interview";
    case "faehigkeiten":
      return "/profile?step=areas";
    case "erfahrung":
      return "/profile?step=evidence";
    case "verantwortung":
      return "/profile?step=ownership";
    case "staerken":
      return "/profile?step=strengths";
    case "antrieb":
      return "/profile/direction";
    case "ressourcen":
      return "/profile?step=resources";
  }
}

/**
 * Der Status einer Station aus den Status ihrer Schritte.
 *
 * Alles offen → offen. Alles für jetzt fertig → für jetzt fertig. Sonst
 * begonnen.
 *
 * KEIN „3 VON 5". Eine Station mit fünf Schritten zeigt EINEN Status; was
 * darin noch offen ist, steht als nächster Schritt darunter und nicht als
 * Rechnung daneben.
 */
export function stationStatus(steps: readonly AboutYouStep[]): StepStatus {
  if (steps.every((step) => step.status === "open")) return "open";
  if (steps.every((step) => step.status === "doneForNow")) return "doneForNow";
  return "started";
}

/**
 * Der nächste sinnvolle Schritt aus einer Liste.
 *
 * Erst das Begonnene zu Ende, dann etwas Neues: Wer mitten in den
 * Erfahrungsstufen steckt, soll nicht als Nächstes das Gespräch angeboten
 * bekommen.
 *
 * ---------------------------------------------------------------------------
 * EIN MARKIERBARER SCHRITT IST KEIN VORSCHLAG
 * ---------------------------------------------------------------------------
 *
 * Gefunden vom eigenen Test am 01.10.2026. „Deine Fähigkeiten" bleibt
 * `started`, solange niemand sie markiert - es gibt dort nichts, was das
 * beendet, außer der Person selbst. Nach der naheliegenden Regel „erst das
 * Begonnene" wäre also auf Dauer immer dasselbe vorgeschlagen worden, auch
 * wenn längst alles andere offen war.
 *
 * Deshalb die Reihenfolge: zuerst Begonnenes, das sich durch Arbeit beenden
 * lässt, dann Unangefangenes, und erst zuletzt das, wo nur noch eine
 * Entscheidung aussteht. „Sag mir, dass es genug ist" ist kein nächster
 * Schritt - es ist eine Frage, und sie steht auf der Seite des Bereichs.
 */
function nextOf(steps: readonly AboutYouStep[]): AboutYouStep | null {
  return (
    steps.find((step) => step.status === "started" && !step.markable) ??
    steps.find((step) => step.status === "open") ??
    steps.find((step) => step.status === "started") ??
    null
  );
}

export function buildAboutYou(facts: AboutYouFacts): AboutYouStation[] {
  return STATION_IDS.map((id) => {
    const steps = STEPS_OF[id].map((stepId): AboutYouStep => {
      const status = stepStatus(stepId, facts);
      const step: AboutYouStep = {
        id: stepId,
        status,
        href: stepHref(stepId, facts),
        markable: isMarkableStep(stepId),
      };
      if (stepId === "gespraech" && facts.unsortedAnswers > 0) step.urgent = true;
      return step;
    });

    return { id, status: stationStatus(steps), steps, next: nextOf(steps) };
  });
}

/**
 * „Weiter dort, wo du aufgehört hast."
 *
 * Ein Vorschlag, kein Zwang: Die Seite leitet nicht um, sperrt nichts und
 * macht aus dem Vorschlag keine Reihenfolge. Jede Station bleibt anwählbar.
 *
 * DIE EINE AUSNAHME von „erst das Begonnene": unsortierte Antworten aus dem
 * Gespräch. Die Person hat dort schon erzählt, und solange die Antworten
 * nicht eingeordnet sind, steht nichts davon im Profil. Es ist der einzige
 * Zustand, in dem Arbeit bereits getan ist und trotzdem nichts zu sehen - und
 * damit der einzige, der einen Vorrang verdient.
 *
 * Gibt es nichts mehr, gibt es `null` - und die Seite schreibt dann keinen
 * Satz hin, der nach einer Aufgabe klingt.
 */
export function recommendNextStep(stations: readonly AboutYouStation[]): AboutYouStep | null {
  const alle = stations.flatMap((station) => station.steps);

  const dringend = alle.find((step) => step.urgent);
  if (dringend) return dringend;

  return nextOf(alle);
}
