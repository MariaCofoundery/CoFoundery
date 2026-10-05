import researchSetsV1 from "../../../../docs/founder-workstyle-research-sets-1.0.0.json";
import { WORKSTYLE_PRETEST_V3, type WorkstyleItem } from "@/features/instruments/workstyle/registry";

/**
 * Phase 11.6C - Entwicklungsfragen Welle 1 (research-sets/1.0.0).
 *
 * Eigene Achse neben dem Core-Manifest 3.0.0: zwei Sets mit je 8 privaten
 * Forschungsitems, ORG-06 als einziger Anchor. Drei Items sind sprachlich
 * ueberarbeitet und haben eigene Schluessel (EVI-04r, EL-03r, EL-06r); die
 * Originale bleiben fuer die full-23-Kohorte. Zuteilung und Reihenfolge
 * entstehen ausschliesslich serverseitig (start_workstyle_research) und werden
 * je Sitzung gespeichert - der Client randomisiert nichts.
 */
export const RESEARCH_SET_VERSION = "research-sets/1.0.0";
export type ResearchSet = "A" | "B";

type ResearchSetSpec = {
  research_set_version: string;
  core_manifest_version: string;
  sets: Record<ResearchSet, string[]>;
  anchor_items: string[];
  revised_items: (WorkstyleItem & { revision_of: string; research_set_version: string })[];
};

const spec = researchSetsV1 as unknown as ResearchSetSpec;
const pool = new Map(WORKSTYLE_PRETEST_V3.items.map(item => [item.item_key, item]));
const revised = new Map(spec.revised_items.map(item => [item.item_key, item as WorkstyleItem]));

export function validateResearchSets(value: ResearchSetSpec = spec): void {
  const fail = (code: string) => { throw new Error(`invalid_research_sets:${code}`); };
  if (value.research_set_version !== RESEARCH_SET_VERSION || value.core_manifest_version !== "3.0.0") fail("version");
  const [a, b] = [value.sets.A, value.sets.B];
  if (a.length !== 8 || b.length !== 8 || new Set(a).size !== 8 || new Set(b).size !== 8) fail("size");
  if (JSON.stringify(a.filter(key => b.includes(key))) !== JSON.stringify(value.anchor_items)) fail("anchor");
  for (const item of value.revised_items) {
    const original = pool.get(item.revision_of);
    if (!original || pool.has(item.item_key) || item.usage !== "research_only" || !item.research_only || item.product_status !== "excluded"
      || item.area_key !== original.area_key || item.scientific_status !== original.scientific_status || item.response_format !== original.response_format
      || item.item_version !== WORKSTYLE_PRETEST_V3.pool_version || item.research_set_version !== RESEARCH_SET_VERSION) fail("revision");
  }
  for (const key of [...a, ...b]) {
    const item = revised.get(key) ?? pool.get(key);
    if (!item || item.usage !== "research_only") fail("set_item");
  }
}
validateResearchSets();

/** Pool-Item oder Welle-1-Ueberarbeitung - fuer Anzeige und Antwortpruefung. */
export function workstyleV3Item(itemKey: string): WorkstyleItem | undefined {
  return pool.get(itemKey) ?? revised.get(itemKey);
}

export function researchSetItems(set: ResearchSet): readonly WorkstyleItem[] {
  return spec.sets[set].map(key => workstyleV3Item(key)!);
}

export const RESEARCH_SETS: Readonly<Record<ResearchSet, readonly string[]>> = Object.freeze({ A: Object.freeze([...spec.sets.A]), B: Object.freeze([...spec.sets.B]) });
export const REVISED_RESEARCH_ITEMS: readonly WorkstyleItem[] = Object.freeze([...revised.values()]);
