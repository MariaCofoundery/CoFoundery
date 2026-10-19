import {
  CURRENT_WORKSTYLE_INSTRUMENT,
  CURRENT_WORKSTYLE_VERSION,
} from "@/features/instruments/workstyle/current";
import { VENTURE_ALIGNMENT_INSTRUMENT_ID } from "@/features/instruments/instruments";
import type { ModuleDefinition } from "@/features/modules/types";

/**
 * Die fuenf Bestandsmodule, wie sie heute sind (Phase A).
 *
 * `storage` UND `sharing.bindsTo` SIND ZWEI FRAGEN:
 *
 *   - `storage` ist der tatsaechliche Antwortspeicher. Workstyle und Venture
 *     Alignment v1 liegen in `assessments` (`storage = "assessments"`, mit der
 *     Instrument-ID); Strengths, Capability und Direction haben eigene
 *     Tabellen (`storage = "existing"`).
 *   - `sharing.bindsTo` ist der Freigabevertrag. Alle fuenf teilen nach ihrem
 *     BESTEHENDEN Vertrag (`team_shares`, Capability-Freigabestufe, Sichtbarkeit
 *     mit der Abgabe, ...): `bindsTo = "existing_contract"`.
 *
 * Dass ein bestehender Adapter einen Assessment-Speicher nicht zu `existing`
 * macht, sagt der Marker `legacyAdapter: true` - er erlaubt den eigenen
 * Freigabevertrag, ohne ihn aus dem Storage zu raten. Native Module setzen ihn
 * nie und teilen bei `assessments` an den Durchlauf.
 *
 * Die Registry beschreibt nur; sie aendert nichts an den Systemen. Ihre
 * Abschlusslogik bleibt bei ihnen (`completion.source`).
 *
 * `renderers` sind Verweise auf das, was es heute gibt: eine Route oder ein
 * Abschnitt von `/me/profile` (`me-profile:<id>`). Ein Test prueft, dass sie
 * existieren. Compare Contracts deklarieren die Bestandsmodule noch nicht - ihre
 * Vergleichsansichten bleiben unveraendert (Phase E und F).
 *
 * VERSIONEN:
 *   - Workstyle und Venture Alignment tragen ihre echte Instrument-Version.
 *   - Strengths, Capability und Direction haben nie einen Stempel gespeichert.
 *     `<modul>@1` ist die Version, unter der kuenftig gestempelt wird. Bestand
 *     ohne Stempel bleibt `legacy_unversioned` - er wird NICHT auf `@1`
 *     gemappt (siehe `adapters`).
 */

export const WORKSTYLE_MODULE: ModuleDefinition = {
  moduleId: "workstyle",
  legacyAdapter: true,
  scope: "person",
  tier: "core",
  cadence: "revisable",
  usage: "product",
  input: {
    method: "questionnaire",
    storage: "assessments",
    writesTo: "assessments + alignment_answers (29 Core-Antworten); Forschung getrennt in workstyle_research_responses",
  },
  versions: [
    {
      versionId: CURRENT_WORKSTYLE_VERSION,
      // Pflicht bei storage = assessments; der Adapter filtert danach.
      instrumentId: CURRENT_WORKSTYLE_INSTRUMENT,
      compatGroup: "workstyle-8.5a-v3",
    },
  ],
  completion: {
    source: "assessments.submitted_at des aktuellen Instruments; die DB (workstyle_v3_sync_completion) setzt es, sobald alle Core-Items beantwortet sind",
  },
  sharing: { ceiling: "answers", sensitivity: "standard", bindsTo: "existing_contract" },
  renderers: { profileCard: "me-profile:arbeitsweise", detail: "/me/profile/workstyle" },
  // Heute: ein Link je Arbeitsbereich im Teambericht (`workstyleSetupHandoff`).
  setupHandoff: [
    { target: "decision_rights", when: "always" },
    { target: "communication", when: "always" },
    { target: "roles_responsibilities", when: "always" },
  ],
  i18n: { namespace: "modules" },
};

export const STRENGTHS_MODULE: ModuleDefinition = {
  moduleId: "strengths",
  legacyAdapter: true,
  scope: "person",
  tier: "core",
  cadence: "revisable",
  usage: "product",
  input: {
    method: "interview",
    additionalMethods: ["manual"],
    storage: "existing",
    writesTo: "person_strengths (bestaetigte Saetze); Vorschlaege in person_strength_proposals",
  },
  versions: [{ versionId: "strengths@1", compatGroup: "strengths-1" }],
  completion: { source: "person_strengths + person_section_marks (staerken): fertig ist, was die Person selbst markiert" },
  sharing: { ceiling: "answers", sensitivity: "standard", bindsTo: "existing_contract" },
  renderers: { profileCard: "me-profile:staerken", detail: "/profile?step=strengths" },
  i18n: { namespace: "modules" },
};

export const CAPABILITY_MODULE: ModuleDefinition = {
  moduleId: "capability",
  legacyAdapter: true,
  scope: "person",
  tier: "core",
  cadence: "revisable",
  usage: "product",
  input: {
    method: "interview",
    additionalMethods: ["manual"],
    storage: "existing",
    writesTo: "person_capability_entries + person_capability_evidence",
  },
  versions: [{ versionId: "capability@1", compatGroup: "capability-1" }],
  completion: {
    source: "person_capability_entries (Bereiche, Stufe, Verantwortungswunsch) + person_section_marks (faehigkeiten); das Interview ist ein Erhebungsweg, nicht der Abschluss",
  },
  sharing: { ceiling: "answers", sensitivity: "standard", bindsTo: "existing_contract" },
  renderers: { profileCard: "me-profile:mitbringst", detail: "/profile?step=areas" },
  i18n: { namespace: "modules" },
};

export const DIRECTION_MODULE: ModuleDefinition = {
  moduleId: "direction",
  legacyAdapter: true,
  scope: "person",
  tier: "core",
  cadence: "revisable",
  usage: "product",
  input: {
    method: "interview",
    additionalMethods: ["manual"],
    storage: "existing",
    writesTo: "direction_statements (bestaetigte Aussagen); Antworten in capability_interview_turns (kind = direction)",
  },
  versions: [{ versionId: "direction@1", compatGroup: "direction-1" }],
  completion: { source: "Interview-Antworten (kind = direction) ab DIRECTION_MIN_ANSWERS" },
  sharing: { ceiling: "answers", sensitivity: "standard", bindsTo: "existing_contract" },
  renderers: { profileCard: "me-profile:antrieb", detail: "/profile/direction" },
  i18n: { namespace: "modules" },
};

export const VENTURE_CORE_MODULE: ModuleDefinition = {
  moduleId: "venture_core",
  legacyAdapter: true,
  scope: "person_in_venture",
  tier: "core",
  cadence: "revisable",
  usage: "product",
  input: {
    method: "questionnaire",
    storage: "assessments",
    writesTo: "assessments + alignment_answers (module = venture_alignment, je Vorhaben)",
  },
  versions: [
    {
      versionId: VENTURE_ALIGNMENT_INSTRUMENT_ID,
      instrumentId: VENTURE_ALIGNMENT_INSTRUMENT_ID,
      compatGroup: "venture-alignment-v1",
    },
  ],
  completion: { source: "assessments.submitted_at je Vorhaben und Instrument (submitScope)" },
  // v1: Antworten werden mit der Abgabe fuer die aktuellen Teammitglieder sichtbar.
  sharing: { ceiling: "answers", sensitivity: "standard", bindsTo: "existing_contract" },
  renderers: {
    profileCard: "me-profile:vorhaben",
    detail: "/founder-alignment/vorhaben/antworten",
  },
  // Heute: Abschnittslinks auf der Paarvergleichsseite (`deepDiveLinks`).
  setupHandoff: [
    { target: "decision_rights", when: "always" },
    { target: "communication", when: "always" },
    { target: "time_commitment", when: "always" },
    { target: "contributions_expenses", when: "always" },
    { target: "conflict_deadlock", when: "always" },
    { target: "personal_financial_risk", when: "always" },
    { target: "outside_activities", when: "always" },
    { target: "prolonged_absence", when: "always" },
    { target: "changing_commitment", when: "always" },
  ],
  i18n: { namespace: "modules" },
};

export const MODULE_DEFINITIONS: readonly ModuleDefinition[] = [
  WORKSTYLE_MODULE,
  STRENGTHS_MODULE,
  CAPABILITY_MODULE,
  DIRECTION_MODULE,
  VENTURE_CORE_MODULE,
];
