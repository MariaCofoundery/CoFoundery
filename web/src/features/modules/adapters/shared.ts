import {
  buildAboutYou,
  stationStatus,
  type AboutYouFacts,
  type AboutYouStep,
  type StepId,
  type StepStatus,
} from "@/features/profile/aboutYou";
import { findVersionOfInstrument } from "@/features/modules/registry";
import {
  ModuleContextError,
  type AssessmentRow,
  type ModuleContext,
  type ModuleState,
  type ModuleStatus,
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

/**
 * Der Zustand eines Moduls aus seinen Assessment-Zeilen zu einem Vorhaben.
 *
 * EIN ABGESCHLOSSENER STAND BLEIBT GUELTIG: Wer je abgegeben hat, ist
 * `done_for_now` - auch wenn danach ein neuer Entwurf begonnen wurde. Nur
 * Entwuerfe ergeben `in_progress`, keine Zeile `not_started`. Gezaehlt werden nur
 * Zeilen dieses Vorhabens und eines Instruments, das das Modul kennt;
 * `null` heisst „nicht lesbar" und wird nicht still zu „offen".
 *
 * Fuer Venture Alignment v1 und fuer „Werte & Zielkonflikte" dieselbe Regel -
 * deshalb eine Funktion.
 */
export function statusFromAssessmentRows(
  rows: readonly AssessmentRow[] | null | undefined,
  ventureId: string,
  moduleId: string
): ModuleStatus {
  if (rows === undefined) throw new ModuleContextError("module_context_missing_assessments");
  if (rows === null) throw new ModuleContextError("module_data_unavailable");

  const own = rows
    .filter(
      (row) => row.venture_id === ventureId && findVersionOfInstrument(moduleId, row.instrument_id) !== null
    )
    // Neueste zuerst; ohne Zeitstempel gilt die gelieferte Reihenfolge.
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));

  const submitted = own.find((row) => row.submitted_at);
  if (submitted) {
    const version = findVersionOfInstrument(moduleId, submitted.instrument_id);
    return { state: "done_for_now", completedVersion: version?.versionId ?? null };
  }
  if (own.length > 0) return { state: "in_progress", completedVersion: null };
  return { state: "not_started", completedVersion: null };
}
