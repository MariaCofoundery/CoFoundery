import { getItemsV22 } from "@/features/instruments/align/registries";
import { followUpApplies } from "@/features/instruments/align/followUps";
import { workstyleRegistryFor, workstyleInstrumentId } from "@/features/instruments/workstyle/registry";

type CoreResponse = { item_key: string; item_version: string; value: unknown; missing_reason: string | null };
export type WorkstyleTeamInputs = { status: "ready"; team_id: string; team_context: string; people: {
  person_id: string; workstyle_assessment_id: string; assessment_version: string; instrument_id: string; manifest_version: string; core: CoreResponse[];
  venture_assessment_id: string; venture_instrument: string; venture_alignment: { item_key: string; value: unknown; missing_reason: string | null }[];
  access_status: "explicit_share_or_owner";
}[] } | { status: "not_ready" };

/** Reuse the current ALIGN submission rules, including retired and dependent items.
 * An unavailable/hidden required answer cannot turn a partial read into a complete report.
 */
export function checkWorkstyleTeamReadiness(input: WorkstyleTeamInputs): WorkstyleTeamInputs {
  if (input.status !== "ready" || input.people.length < 2 || new Set(input.people.map(person => person.person_id)).size !== input.people.length) return { status: "not_ready" };
  const first = input.people[0];
  for (const person of input.people) {
    let registry;
    try { registry = workstyleRegistryFor(person.assessment_version); } catch { return { status: "not_ready" }; }
    if (person.assessment_version !== first.assessment_version || person.instrument_id !== workstyleInstrumentId(person.assessment_version)
      || person.instrument_id !== first.instrument_id || person.manifest_version !== registry.registry_version || person.manifest_version !== first.manifest_version || person.venture_instrument !== "venture-alignment-v1" || person.access_status !== "explicit_share_or_owner") return { status: "not_ready" };
    if (person.assessment_version === "8.5a-v3" && registry.core_item_keys.some(key => {
      const item = registry.items.find(item => item.item_key === key);
      return !item || item.scientific_status !== "core" || item.research_only || item.area_status !== "development_area";
    })) return { status: "not_ready" };
    const core = new Map(person.core.map(answer => [answer.item_key, answer]));
    if (core.size !== registry.core_item_keys.length || person.core.length !== registry.core_item_keys.length || registry.core_item_keys.some(key => core.get(key)?.item_version !== registry.items.find(item => item.item_key === key)?.item_version)) return { status: "not_ready" };
    const ventureKeys = new Set(person.venture_alignment.map(answer => answer.item_key));
    const ventureAnswer = new Map(person.venture_alignment.map(answer => [answer.item_key, { value: answer.value, missingCode: answer.missing_reason }]));
    // Dieselbe Anschlussfragen-Regel wie Oberflaeche und Abgabe (followUps.ts).
    if (getItemsV22("venture_alignment").some(item => !item.retired && followUpApplies(item, key => ventureAnswer.get(key)) && !ventureKeys.has(item.itemId))) return { status: "not_ready" };
  }
  return input;
}
