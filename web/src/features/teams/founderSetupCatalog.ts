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
] as const;

export type FounderSetupItemKey = (typeof FOUNDER_SETUP_ITEM_KEYS)[number];

export type FounderSetupCatalogItem = {
  key: FounderSetupItemKey;
  category: FounderSetupCategoryKey;
  legalNote: boolean;
};

export const FOUNDER_SETUP_CATALOG: readonly FounderSetupCatalogItem[] = [
  { key: "roles_responsibilities", category: "collaboration", legalNote: false },
  { key: "decision_rights", category: "collaboration", legalNote: false },
  { key: "time_commitment", category: "collaboration", legalNote: false },
  { key: "communication", category: "collaboration", legalNote: false },
  { key: "conflict_deadlock", category: "collaboration", legalNote: false },
  { key: "equity", category: "money_equity", legalNote: false },
  { key: "vesting", category: "money_equity", legalNote: true },
  { key: "compensation", category: "money_equity", legalNote: false },
  { key: "contributions_expenses", category: "money_equity", legalNote: false },
  { key: "personal_financial_risk", category: "money_equity", legalNote: false },
  { key: "legal_entity", category: "company_rights", legalNote: true },
  { key: "founder_agreements", category: "company_rights", legalNote: true },
  { key: "intellectual_property", category: "company_rights", legalNote: false },
  { key: "outside_activities", category: "company_rights", legalNote: false },
  { key: "accounts_access", category: "company_rights", legalNote: false },
  { key: "prolonged_absence", category: "change", legalNote: false },
  { key: "changing_commitment", category: "change", legalNote: false },
  { key: "founder_exit", category: "change", legalNote: true },
] as const;

const ITEM_KEY_SET = new Set<string>(FOUNDER_SETUP_ITEM_KEYS);

export function isFounderSetupItemKey(value: string): value is FounderSetupItemKey {
  return ITEM_KEY_SET.has(value);
}

export function getFounderSetupCatalogItem(key: FounderSetupItemKey) {
  return FOUNDER_SETUP_CATALOG.find((item) => item.key === key) ?? null;
}
