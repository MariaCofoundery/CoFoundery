import { getItemsV22 } from "@/features/instruments/align/registries";
import { WORKSTYLE_PRETEST_V1 } from "@/features/instruments/workstyle/registry";

type CoreResponse = { item_key: string; item_version: string; value: unknown; missing_reason: string | null };
export type WorkstyleTeamInputs = { status: "ready"; team_id: string; team_context: string; people: {
  person_id: string; workstyle_assessment_id: string; assessment_version: string; core: CoreResponse[];
  venture_assessment_id: string; venture_instrument: string; venture_alignment: { item_key: string; value: unknown; missing_reason: string | null }[];
  access_status: "explicit_share_or_owner";
}[] } | { status: "not_ready" };

/** Reuse the current ALIGN submission rules, including retired and dependent items.
 * An unavailable/hidden required answer cannot turn a partial read into a complete report.
 */
export function checkWorkstyleTeamReadiness(input: WorkstyleTeamInputs): WorkstyleTeamInputs {
  if (input.status !== "ready" || input.people.length !== 2 || new Set(input.people.map(person => person.person_id)).size !== 2) return { status: "not_ready" };
  for (const person of input.people) {
    if (person.assessment_version !== WORKSTYLE_PRETEST_V1.assessment_version || person.venture_instrument !== "venture-alignment-v1" || person.access_status !== "explicit_share_or_owner") return { status: "not_ready" };
    const core = new Map(person.core.map(answer => [answer.item_key, answer]));
    if (core.size !== 20 || person.core.length !== 20 || WORKSTYLE_PRETEST_V1.core_item_keys.some(key => core.get(key)?.item_version !== WORKSTYLE_PRETEST_V1.items.find(item => item.item_key === key)?.item_version)) return { status: "not_ready" };
    const ventureKeys = new Set(person.venture_alignment.map(answer => answer.item_key));
    if (getItemsV22("venture_alignment").some(item => !item.retired && (!item.showAfter || ventureKeys.has(item.showAfter)) && !ventureKeys.has(item.itemId))) return { status: "not_ready" };
  }
  return input;
}
