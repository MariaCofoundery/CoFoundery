import { MODULE_DEFINITIONS } from "@/features/modules/definitions";
import type { ModuleDefinition } from "@/features/modules/types";

/**
 * Hypothetische Vertiefungen - NUR fuer Tests.
 *
 * Diese Datei liegt unter `__tests__` und wird von keinem Produktcode
 * importiert; die Registry kennt sie nicht. Ein Test haelt beides fest: Die
 * echte Registry hat keine Vertiefung, und im Produktcode steht keine dieser
 * Kennungen. So kann nichts hier versehentlich die Produktoberflaeche
 * einschalten.
 *
 * „Werte & Zielkonflikte" ist der kuenftige Pilot (Phase D) - hier nur als
 * Muster, noch kein Modul.
 */

const vertiefung = (
  moduleId: string,
  scope: ModuleDefinition["scope"],
  deepens: string,
  patch: Partial<ModuleDefinition> = {}
): ModuleDefinition => ({
  moduleId,
  scope,
  tier: "deepening",
  cadence: "revisable",
  usage: "product",
  deepens,
  input: { method: "questionnaire", storage: "assessments", writesTo: "alignment_answers" },
  versions: [{ versionId: "v1", instrumentId: `${moduleId.replace(/_/g, "-")}-v1`, compatGroup: `${moduleId}-1` }],
  completion: { source: "assessments.submitted_at" },
  sharing: { ceiling: "answers", sensitivity: "standard", bindsTo: "assessment" },
  renderers: { detail: `/demo/${moduleId}`, profileCard: `demo:${moduleId}` },
  i18n: { namespace: "modules" },
  ...patch,
});

export const DEMO_TRADEOFFS = vertiefung("demo_tradeoffs", "person_in_venture", "venture_core");
export const DEMO_LIMITS = vertiefung("demo_limits", "person_in_venture", "venture_core", {
  sharing: { ceiling: "statements", sensitivity: "sensitive", bindsTo: "assessment" },
});
export const DEMO_FEEDBACK = vertiefung("demo_feedback", "person", "workstyle");
export const DEMO_EVERYDAY = vertiefung("demo_everyday", "person_in_venture", "venture_core");
export const DEMO_SPARE = vertiefung("demo_spare", "person_in_venture", "venture_core");

export const DEMO_DEEPENINGS: readonly ModuleDefinition[] = [
  DEMO_TRADEOFFS,
  DEMO_LIMITS,
  DEMO_FEEDBACK,
  DEMO_EVERYDAY,
  DEMO_SPARE,
];

/** Die echte Registry plus die Demo-Vertiefungen - nie im Produkt. */
export const DEMO_REGISTRY: readonly ModuleDefinition[] = [...MODULE_DEFINITIONS, ...DEMO_DEEPENINGS];
