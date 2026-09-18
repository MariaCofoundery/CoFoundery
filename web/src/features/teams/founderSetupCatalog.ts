export const FOUNDER_SETUP_CATEGORY_KEYS = [
  "collaboration",
  "money_equity",
  "company_rights",
  "change",
] as const;

export type FounderSetupCategoryKey = (typeof FOUNDER_SETUP_CATEGORY_KEYS)[number];

export const FOUNDER_SETUP_ITEM_KEYS = [
  "roles_responsibilities",
  "decision_rights",
  "time_commitment",
  "communication",
  "conflict_deadlock",
  "equity",
  "vesting",
  "compensation",
  "contributions_expenses",
  "personal_financial_risk",
  "legal_entity",
  "founder_agreements",
  "intellectual_property",
  "outside_activities",
  "accounts_access",
  "prolonged_absence",
  "changing_commitment",
  "founder_exit",
  // Neu am 18.09.2026. Beide stehen in jedem Gesellschaftervertrag und
  // fehlten: "Laengere Abwesenheit" meint jemanden, der wiederkommt, und
  // "Nebentaetigkeiten" regelt die Zeit waehrenddessen, nicht danach.
  "succession",
  "post_exit_competition",
] as const;

export type FounderSetupItemKey = (typeof FOUNDER_SETUP_ITEM_KEYS)[number];

/**
 * Wann ein Thema ueberhaupt beantwortbar ist.
 *
 * Achtzehn Themen gleichzeitig anzubieten war zu viel: Etwa ein Drittel ist
 * erst sinnvoll, wenn es eine Gesellschaft gibt. "Founder-Exit" anzubieten,
 * bevor die Rechtsform steht, ist Laerm - und Laerm laesst Menschen die Seite
 * schliessen.
 */
export const FOUNDER_SETUP_PHASE_KEYS = ["before", "founded", "later"] as const;
export type FounderSetupPhaseKey = (typeof FOUNDER_SETUP_PHASE_KEYS)[number];

/**
 * Was es kostet, wenn das Thema offen bleibt.
 *
 * "critical" heisst nicht "wichtiger", sondern: Wer das offen laesst und es
 * kommt darauf an, hat ein Problem, das sich nicht mehr durch ein Gespraech
 * loesen laesst. Fehlendes Vesting nach anderthalb Jahren mit einem gehenden
 * Co-Founder ist so ein Fall. Fehlende Kommunikationsregeln sind laestig.
 *
 * Vorher sahen beide gleich aus.
 */
export const FOUNDER_SETUP_WEIGHTS = ["critical", "standard"] as const;
export type FounderSetupWeight = (typeof FOUNDER_SETUP_WEIGHTS)[number];

export type FounderSetupCatalogItem = {
  key: FounderSetupItemKey;
  category: FounderSetupCategoryKey;
  phase: FounderSetupPhaseKey;
  weight: FounderSetupWeight;
  legalNote: boolean;
};

export const FOUNDER_SETUP_CATALOG: readonly FounderSetupCatalogItem[] = [
  { key: "roles_responsibilities", category: "collaboration", phase: "before", weight: "critical", legalNote: false },
  { key: "decision_rights", category: "collaboration", phase: "before", weight: "critical", legalNote: false },
  { key: "time_commitment", category: "collaboration", phase: "before", weight: "critical", legalNote: false },
  { key: "communication", category: "collaboration", phase: "before", weight: "standard", legalNote: false },
  { key: "conflict_deadlock", category: "collaboration", phase: "before", weight: "standard", legalNote: false },
  { key: "equity", category: "money_equity", phase: "before", weight: "critical", legalNote: false },
  { key: "vesting", category: "money_equity", phase: "before", weight: "critical", legalNote: true },
  { key: "compensation", category: "money_equity", phase: "founded", weight: "standard", legalNote: false },
  { key: "contributions_expenses", category: "money_equity", phase: "before", weight: "standard", legalNote: false },
  { key: "personal_financial_risk", category: "money_equity", phase: "founded", weight: "standard", legalNote: false },
  { key: "legal_entity", category: "company_rights", phase: "founded", weight: "critical", legalNote: true },
  { key: "founder_agreements", category: "company_rights", phase: "founded", weight: "critical", legalNote: true },
  { key: "intellectual_property", category: "company_rights", phase: "founded", weight: "critical", legalNote: false },
  { key: "outside_activities", category: "company_rights", phase: "founded", weight: "standard", legalNote: false },
  { key: "accounts_access", category: "company_rights", phase: "founded", weight: "standard", legalNote: false },
  { key: "prolonged_absence", category: "change", phase: "later", weight: "standard", legalNote: false },
  { key: "changing_commitment", category: "change", phase: "later", weight: "standard", legalNote: false },
  { key: "founder_exit", category: "change", phase: "later", weight: "critical", legalNote: true },
  { key: "succession", category: "change", phase: "later", weight: "critical", legalNote: true },
  { key: "post_exit_competition", category: "change", phase: "later", weight: "standard", legalNote: true },
] as const;

const ITEM_KEY_SET = new Set<string>(FOUNDER_SETUP_ITEM_KEYS);

export function isFounderSetupItemKey(value: string): value is FounderSetupItemKey {
  return ITEM_KEY_SET.has(value);
}

export function getFounderSetupCatalogItem(key: FounderSetupItemKey) {
  return FOUNDER_SETUP_CATALOG.find((item) => item.key === key) ?? null;
}

/** Die Themen einer Phase, in Katalogreihenfolge. */
export function getFounderSetupItemsByPhase(phase: FounderSetupPhaseKey) {
  return FOUNDER_SETUP_CATALOG.filter((item) => item.phase === phase);
}
