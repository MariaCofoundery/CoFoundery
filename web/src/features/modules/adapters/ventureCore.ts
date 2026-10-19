import { VENTURE_CORE_MODULE } from "@/features/modules/definitions";
import { findVersionOfInstrument } from "@/features/modules/registry";
import {
  ModuleContextError,
  type AssessmentRow,
  type ModuleAdapter,
  type ModuleContext,
  type ModuleStatus,
} from "@/features/modules/types";

/**
 * Venture Alignment v1 - ein Adapter je Vorhaben.
 *
 * QUELLE DER WAHRHEIT: `assessments` je Vorhaben und Instrument.
 *
 * EIN ABGESCHLOSSENER STAND BLEIBT GUELTIG. Wer fuer dieses Vorhaben je
 * abgegeben hat, ist `done_for_now` - auch wenn danach ein neuer Entwurf
 * begonnen wurde. Ein Update ist eine Aktualisierung, nicht wieder
 * „unvollstaendig"; `completedVersion` ist die Version der neuesten
 * ABGEGEBENEN Zeile. Gibt es nur Entwuerfe, ist der Stand `in_progress`, ohne
 * Zeile `not_started`.
 *
 * DAS WEICHT IN EINEM FALL VON DER TEAMSEITE AB: `loadTeamJourneyStatus` liest
 * nur die NEUESTE Zeile und zeigt nach einer Abgabe plus neuem Entwurf wieder
 * „begonnen". Die Teamseite bleibt, wie sie ist; die Abweichung ist gewollt und
 * im Parity-Test festgehalten.
 *
 * KEIN VORHABEN, KEIN STATUS. Ein `person_in_venture`-Modul hat ohne
 * Vorhaben keinen Zustand - das ist ein Fehler des Aufrufers, kein „offen".
 * Ebenso ein Lesefehler: `null` heisst „nicht lesbar" (die Teamseite nennt das
 * „unavailable") und wird nicht still zu „offen".
 */

function rowsOf(context: ModuleContext, ventureId: string): AssessmentRow[] {
  if (context.ventureAssessments === undefined) {
    throw new ModuleContextError("module_context_missing_venture_assessments");
  }
  if (context.ventureAssessments === null) throw new ModuleContextError("module_data_unavailable");

  const rows = context.ventureAssessments.filter(
    (row) =>
      row.venture_id === ventureId &&
      findVersionOfInstrument(VENTURE_CORE_MODULE.moduleId, row.instrument_id) !== null
  );
  // Neueste zuerst; ohne Zeitstempel gilt die gelieferte Reihenfolge.
  return [...rows].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
}

function requireVenture(context: ModuleContext): string {
  if (!context.ventureId) throw new ModuleContextError("module_context_missing_venture");
  return context.ventureId;
}

function statusOf(context: ModuleContext): ModuleStatus {
  const rows = rowsOf(context, requireVenture(context));
  const submitted = rows.find((row) => row.submitted_at);
  if (submitted) {
    const version = findVersionOfInstrument(VENTURE_CORE_MODULE.moduleId, submitted.instrument_id);
    return { state: "done_for_now", completedVersion: version?.versionId ?? null };
  }
  if (rows.length > 0) return { state: "in_progress", completedVersion: null };
  return { state: "not_started", completedVersion: null };
}

export const ventureCoreAdapter: ModuleAdapter = {
  describe: () => VENTURE_CORE_MODULE,

  status: (_user, context) => statusOf(context),

  profileTeaser(_user, context) {
    const ventureId = requireVenture(context);
    const done = statusOf(context).state === "done_for_now";
    const venture = encodeURIComponent(ventureId);
    // Dieselben Ziele wie `ventureHref` der Teamseite.
    return {
      href: done
        ? `/founder-alignment/vorhaben/antworten?venture=${venture}`
        : `/founder-alignment/vorhaben?venture=${venture}`,
      hasContent: done,
    };
  },

  shareState(_user, context) {
    const ventureId = requireVenture(context);
    // v1: Mit der Abgabe werden die Antworten fuer die aktuellen Teammitglieder
    // sichtbar (`venture_visible_in_team`). Erst `venture-alignment-v2` trennt
    // Abgeben und Freigeben.
    return {
      contract: "visible_on_submit",
      ventureId,
      visibleToTeam: statusOf(context).state === "done_for_now",
    };
  },
};
