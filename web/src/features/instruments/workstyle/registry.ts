import manifest from "../../../../docs/founder-workstyle-pretest-8.5a-v1.json";

export type WorkstyleForm = "A" | "B" | "C";
export type WorkstyleResponseFormat = "frequency" | "experience_weight" | "ambiguity_comfort";
export type WorkstyleSourceType = "live_reference" | "adapted" | "new";

export type WorkstyleItem = Readonly<{
  item_key: string;
  item_version: string;
  assessment_version: string;
  construct: string;
  facet: string | null;
  facet_status: "development_mapping" | "source_defined" | "not_specified";
  prompt: string;
  stem: string | null;
  response_format: WorkstyleResponseFormat;
  missing_reasons: readonly "cannot_assess"[];
  source_type: WorkstyleSourceType;
  source_status: WorkstyleSourceType;
  source_status_explicit: boolean;
  source_note: string;
  development_status: "candidate_for_pretest";
  usage: "core" | "research_only";
  research_only: boolean;
  product_status: "pretest_comparison_candidate" | "excluded";
  form: WorkstyleForm | null;
  note: string | null;
}>;

export type WorkstyleRegistry = Readonly<{
  assessment_key: "founder-workstyle-pretest";
  assessment_version: string;
  pool_version: string;
  registry_version: string;
  source: string;
  status: "candidate_for_pretest" | "archived";
  declared_counts: Readonly<{ pool: number; core: number }>;
  actual_counts: Readonly<{ pool: number; core: number; A: number; B: number; C: number }>;
  core_item_keys: readonly string[];
  forms: Readonly<Record<WorkstyleForm, readonly string[]>>;
  response_formats: Readonly<Record<WorkstyleResponseFormat, readonly Readonly<{ value: number; label: string }>[]>>;
  missing_options: Readonly<{ cannot_assess: string }>;
  scoring: Readonly<{ overall_score: false; construct_scores: false; compatibility_score: false; validated_short_scale: false }>;
  comparison_requirements: readonly string[];
  items: readonly WorkstyleItem[];
}>;

const FORMS: readonly WorkstyleForm[] = ["A", "B", "C"];

/** Validate the new manifest without changing or importing the live ALIGN registries. */
export function validateWorkstyleRegistry(registry: WorkstyleRegistry): void {
  const fail = (reason: string): never => { throw new Error(`workstyle_registry_invalid:${reason}`); };
  if (registry.assessment_key !== "founder-workstyle-pretest" || !registry.assessment_version || !registry.pool_version) fail("version");
  if (Object.values(registry.scoring).some(value => value !== false)) fail("unsupported_scoring");
  if (!["candidate_for_pretest", "archived"].includes(registry.status)) fail("status");
  const assigned = [...registry.core_item_keys, ...FORMS.flatMap(form => registry.forms[form])];
  if (new Set(assigned).size !== assigned.length) fail("duplicate_assignment");
  const keys = registry.items.map(item => item.item_key);
  if (new Set(keys).size !== keys.length || keys.length !== assigned.length || assigned.some(key => !keys.includes(key))) fail("item_coverage");
  if (registry.declared_counts.pool !== keys.length || registry.declared_counts.core !== registry.core_item_keys.length) fail("declared_count");
  if (registry.actual_counts.pool !== keys.length || registry.actual_counts.core !== registry.core_item_keys.length) fail("count");
  for (const form of FORMS) {
    if (registry.forms[form].length !== registry.actual_counts[form]) fail("form_count");
  }
  for (const options of Object.values(registry.response_formats)) {
    if (options.length !== 5 || options.some((option, index) => option.value !== index + 1 || !option.label.trim())) fail("five_ordinal_options");
  }
  for (const item of registry.items) {
    if (!/^(EVI|EXP|EL|VOICE|AMB|ORG)-\d{2}$/.test(item.item_key) || !item.item_version || item.assessment_version !== registry.assessment_version) fail("item_identity");
    if (!item.prompt.trim() || !item.construct || !registry.response_formats[item.response_format]) fail("item_content");
    if (!["live_reference", "adapted", "new"].includes(item.source_type) || item.source_status !== item.source_type) fail("source_type");
    if (item.missing_reasons.some(reason => reason !== "cannot_assess")) fail("missing_reason");
    const isCore = registry.core_item_keys.includes(item.item_key);
    if (isCore) {
      if (item.usage !== "core" || item.research_only || item.form !== null || item.product_status !== "pretest_comparison_candidate") fail("core_usage");
    } else if (item.usage !== "research_only" || !item.research_only || !item.form || !registry.forms[item.form].includes(item.item_key) || item.product_status !== "excluded") {
      fail("research_usage");
    }
    if (item.item_key.startsWith("AMB-") && !item.stem) fail("ambiguity_stem");
  }
}

function freezeDeep<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const nested of Object.values(value)) freezeDeep(nested);
    Object.freeze(value);
  }
  return value;
}

const registry = manifest as WorkstyleRegistry;
validateWorkstyleRegistry(registry);
export const WORKSTYLE_PRETEST_V1 = freezeDeep(registry);

/** Exact resolution; never reinterpret an unknown historical version as the newest. */
export function workstyleRegistryFor(assessmentVersion: string): WorkstyleRegistry {
  if (assessmentVersion !== WORKSTYLE_PRETEST_V1.assessment_version) throw new Error("unknown_workstyle_assessment_version");
  return WORKSTYLE_PRETEST_V1;
}

export function workstyleItemFor(itemKey: string, itemVersion: string, assessmentVersion: string): WorkstyleItem {
  const item = workstyleRegistryFor(assessmentVersion).items.find(candidate => candidate.item_key === itemKey && candidate.item_version === itemVersion);
  if (!item) throw new Error("unknown_workstyle_item_version");
  return item;
}

/** Content preview only: selection is not a server-side participant assignment. */
export function previewWorkstyleForm(form: WorkstyleForm): readonly WorkstyleItem[] {
  if (!FORMS.includes(form)) throw new Error("unknown_workstyle_form");
  const keys = [...registry.core_item_keys, ...registry.forms[form]];
  return Object.freeze(keys.map(key => WORKSTYLE_PRETEST_V1.items.find(item => item.item_key === key)!));
}

/** Archived manifests remain readable but cannot start a new pretest. */
export function assertWorkstylePretestReady(): void {
  if (WORKSTYLE_PRETEST_V1.status !== "candidate_for_pretest") throw new Error("workstyle_pretest_not_ready");
}
