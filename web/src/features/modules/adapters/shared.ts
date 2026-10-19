import {
  buildAboutYou,
  stationStatus,
  type AboutYouFacts,
  type AboutYouStep,
  type StepId,
  type StepStatus,
} from "@/features/profile/aboutYou";
import {
  ModuleContextError,
  type ModuleContext,
  type ModuleState,
} from "@/features/modules/types";

/**
 * Gemeinsame Hilfen der Person-Adapter.
 *
 * DIE LOGIK GEHOERT NICHT HIERHER. Ob ein Schritt „offen", „begonnen" oder „fuer
 * jetzt fertig" ist, entscheidet `buildAboutYou` in `profile/aboutYou.ts` -
 * heute und weiterhin. Diese Datei fragt es nur, statt die Regeln ein zweites
 * Mal zu schreiben: Zwei Fassungen derselben Regel laufen irgendwann
 * auseinander, und dann zeigt eine Seite etwas anderes als die andere.
 */

export function requirePersonFacts(context: ModuleContext): AboutYouFacts {
  if (!context.personFacts) throw new ModuleContextError("module_context_missing_person_facts");
  return context.personFacts;
}

/** Ein Schritt des bestehenden Profil-Modells, samt seinem Ziel. */
export function stepOf(facts: AboutYouFacts, id: StepId): AboutYouStep {
  const step = buildAboutYou(facts)
    .flatMap((station) => station.steps)
    .find((candidate) => candidate.id === id);
  // Ein Schritt, den es nicht mehr gibt, ist ein Fehler im Vertrag - kein „offen".
  if (!step) throw new ModuleContextError(`unknown_profile_step:${id}`);
  return step;
}

export function moduleStateOf(status: StepStatus): ModuleState {
  switch (status) {
    case "open":
      return "not_started";
    case "started":
      return "in_progress";
    case "doneForNow":
      return "done_for_now";
  }
}

/** Mehrere Schritte zu einem Zustand - mit derselben Regel wie die Stationen des Profils. */
export function moduleStateOfSteps(steps: readonly AboutYouStep[]): ModuleState {
  return moduleStateOf(stationStatus(steps));
}
