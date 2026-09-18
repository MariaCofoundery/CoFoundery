import type { FounderSetupItemKey } from "@/features/teams/founderSetupCatalog";

/**
 * "Rechtsform & Haftung" kam am 19.09.2026 dazu. Vorher lagen GmbH, UG,
 * Stammkapital und Buergschaft zwangslaeufig unter "Vertraege & Governance" -
 * dort sucht sie niemand, und es sind auch keine Vertragsbegriffe. Wer wissen
 * will, was eine UG von einer GmbH unterscheidet, hat eine andere Frage als
 * jemand, der eine Einziehungsklausel nachschlaegt.
 */
export const FOUNDER_LIBRARY_CATEGORY_KEYS = [
  "equity_financing",
  "contracts_governance",
  "legal_form_liability",
  "company_building",
] as const;

export type FounderLibraryCategoryKey = (typeof FOUNDER_LIBRARY_CATEGORY_KEYS)[number];

export type FounderLibraryTermStatus = "draft" | "available";

export type FounderLibraryTerm = {
  id: string;
  slug: string;
  category: FounderLibraryCategoryKey;
  status: FounderLibraryTermStatus;
  setupTopicKeys?: readonly FounderSetupItemKey[];
};

export type LocalizedFounderLibraryTerm = FounderLibraryTerm & {
  term: string;
  shortDefinition: string;
};

export const FOUNDER_LIBRARY_TERMS = [
  { id: "bootstrapping", slug: "bootstrapping", category: "company_building", setupTopicKeys: [], status: "available" },
  { id: "burn_rate", slug: "burn-rate", category: "equity_financing", setupTopicKeys: [], status: "available" },
  { id: "cap_table", slug: "cap-table", category: "equity_financing", setupTopicKeys: ["equity"], status: "available" },
  { id: "deadlock", slug: "deadlock", category: "contracts_governance", setupTopicKeys: ["conflict_deadlock"], status: "available" },
  { id: "dilution", slug: "dilution", category: "equity_financing", setupTopicKeys: ["equity"], status: "available" },
  { id: "drag_along_tag_along", slug: "drag-along-tag-along", category: "contracts_governance", setupTopicKeys: [], status: "available" },
  { id: "esop_vsop", slug: "esop-vsop", category: "equity_financing", setupTopicKeys: ["equity"], status: "available" },
  { id: "founder_agreement", slug: "founder-agreement", category: "contracts_governance", setupTopicKeys: ["founder_agreements"], status: "available" },
  { id: "founder_exit", slug: "founder-exit", category: "contracts_governance", setupTopicKeys: ["founder_exit"], status: "available" },
  { id: "good_bad_leaver", slug: "good-leaver-bad-leaver", category: "contracts_governance", setupTopicKeys: ["founder_exit"], status: "available" },
  { id: "ip_assignment", slug: "ip-assignment", category: "contracts_governance", setupTopicKeys: ["intellectual_property"], status: "available" },
  { id: "mvp", slug: "mvp", category: "company_building", setupTopicKeys: [], status: "available" },
  { id: "pivot", slug: "pivot", category: "company_building", setupTopicKeys: [], status: "available" },
  { id: "pre_money_post_money", slug: "pre-money-post-money", category: "equity_financing", setupTopicKeys: ["equity"], status: "available" },
  { id: "product_market_fit", slug: "product-market-fit", category: "company_building", setupTopicKeys: [], status: "available" },
  { id: "reverse_vesting", slug: "reverse-vesting", category: "equity_financing", setupTopicKeys: ["vesting"], status: "available" },
  { id: "runway", slug: "runway", category: "equity_financing", setupTopicKeys: [], status: "available" },
  { id: "term_sheet", slug: "term-sheet", category: "equity_financing", setupTopicKeys: [], status: "available" },
  { id: "vesting", slug: "vesting", category: "equity_financing", setupTopicKeys: ["vesting"], status: "available" },
  { id: "convertible_loan", slug: "convertible-loan", category: "equity_financing", setupTopicKeys: [], status: "available" },

  // Erweiterung vom 19.09.2026. Zwanzig Begriffe waren zu wenig - und vor allem
  // fehlten sie ausgerechnet dort, wo es teuer wird: Rechtsform, Haftung,
  // Ausscheiden, Nachfolge. Auswahlkriterium war deshalb nicht "bekanntes
  // Startup-Vokabular", sondern: Jedes als teuer gekennzeichnete Setup-Thema
  // muss mindestens einen Begriff haben, der es erklaert.
  { id: "cliff", slug: "cliff", category: "equity_financing", setupTopicKeys: ["vesting"], status: "available" },
  { id: "slicing_pie", slug: "slicing-pie", category: "equity_financing", setupTopicKeys: ["equity", "contributions_expenses", "changing_commitment"], status: "available" },
  { id: "liquidation_preference", slug: "liquidationspraeferenz", category: "equity_financing", setupTopicKeys: ["equity"], status: "available" },
  { id: "company_valuation", slug: "unternehmensbewertung", category: "equity_financing", setupTopicKeys: ["equity"], status: "available" },
  { id: "funding_rounds", slug: "finanzierungsrunden", category: "equity_financing", setupTopicKeys: [], status: "available" },
  { id: "business_angel", slug: "business-angel", category: "equity_financing", setupTopicKeys: [], status: "available" },
  { id: "due_diligence", slug: "due-diligence", category: "equity_financing", setupTopicKeys: [], status: "available" },
  { id: "exist_grant", slug: "exist-gruenderstipendium", category: "equity_financing", setupTopicKeys: ["compensation", "contributions_expenses"], status: "available" },
  { id: "hidden_profit_distribution", slug: "verdeckte-gewinnausschuettung", category: "equity_financing", setupTopicKeys: ["compensation"], status: "available" },

  { id: "gbr", slug: "gbr", category: "legal_form_liability", setupTopicKeys: ["legal_entity"], status: "available" },
  { id: "ug", slug: "ug-haftungsbeschraenkt", category: "legal_form_liability", setupTopicKeys: ["legal_entity"], status: "available" },
  { id: "gmbh", slug: "gmbh", category: "legal_form_liability", setupTopicKeys: ["legal_entity"], status: "available" },
  { id: "share_capital", slug: "stammkapital", category: "legal_form_liability", setupTopicKeys: ["legal_entity", "contributions_expenses"], status: "available" },
  { id: "contribution_in_kind", slug: "sacheinlage", category: "legal_form_liability", setupTopicKeys: ["contributions_expenses", "equity"], status: "available" },
  { id: "commercial_register", slug: "handelsregister", category: "legal_form_liability", setupTopicKeys: ["legal_entity"], status: "available" },
  { id: "notarization", slug: "notarielle-beurkundung", category: "legal_form_liability", setupTopicKeys: ["legal_entity", "founder_agreements"], status: "available" },
  { id: "personal_guarantee", slug: "buergschaft", category: "legal_form_liability", setupTopicKeys: ["personal_financial_risk"], status: "available" },
  { id: "managing_director_liability", slug: "geschaeftsfuehrerhaftung", category: "legal_form_liability", setupTopicKeys: ["personal_financial_risk", "roles_responsibilities"], status: "available" },
  { id: "bogus_self_employment", slug: "scheinselbststaendigkeit", category: "legal_form_liability", setupTopicKeys: ["compensation", "time_commitment"], status: "available" },

  { id: "articles_of_association", slug: "gesellschaftsvertrag", category: "contracts_governance", setupTopicKeys: ["founder_agreements", "legal_entity"], status: "available" },
  { id: "shareholder_resolution", slug: "gesellschafterbeschluss", category: "contracts_governance", setupTopicKeys: ["decision_rights"], status: "available" },
  { id: "casting_vote", slug: "stichentscheid", category: "contracts_governance", setupTopicKeys: ["decision_rights", "conflict_deadlock"], status: "available" },
  { id: "blocking_minority", slug: "sperrminoritaet", category: "contracts_governance", setupTopicKeys: ["decision_rights", "equity"], status: "available" },
  { id: "non_compete", slug: "wettbewerbsverbot", category: "contracts_governance", setupTopicKeys: ["outside_activities", "post_exit_competition"], status: "available" },
  { id: "severance_payment", slug: "abfindung", category: "contracts_governance", setupTopicKeys: ["founder_exit", "succession"], status: "available" },
  { id: "compulsory_redemption", slug: "einziehungsklausel", category: "contracts_governance", setupTopicKeys: ["founder_exit"], status: "available" },
  { id: "transfer_restriction", slug: "vinkulierung", category: "contracts_governance", setupTopicKeys: ["founder_exit", "succession"], status: "available" },
  { id: "succession_clause", slug: "nachfolgeklausel", category: "contracts_governance", setupTopicKeys: ["succession"], status: "available" },
  { id: "power_of_attorney", slug: "vollmacht", category: "contracts_governance", setupTopicKeys: ["prolonged_absence", "accounts_access"], status: "available" },
  { id: "account_authorization", slug: "verfuegungsberechtigung", category: "contracts_governance", setupTopicKeys: ["accounts_access", "prolonged_absence"], status: "available" },
  { id: "managing_director_contract", slug: "geschaeftsfuehreranstellungsvertrag", category: "contracts_governance", setupTopicKeys: ["roles_responsibilities", "compensation"], status: "available" },
  { id: "prokura", slug: "prokura", category: "contracts_governance", setupTopicKeys: ["roles_responsibilities", "accounts_access"], status: "available" },
  { id: "advisory_board", slug: "beirat", category: "contracts_governance", setupTopicKeys: ["decision_rights"], status: "available" },
  { id: "nda", slug: "geheimhaltungsvereinbarung", category: "contracts_governance", setupTopicKeys: ["intellectual_property"], status: "available" },
  { id: "trademark", slug: "marke", category: "contracts_governance", setupTopicKeys: ["intellectual_property"], status: "available" },
  { id: "open_source_license", slug: "open-source-lizenz", category: "contracts_governance", setupTopicKeys: ["intellectual_property"], status: "available" },

  { id: "traction", slug: "traction", category: "company_building", setupTopicKeys: [], status: "available" },
  { id: "unit_economics", slug: "unit-economics", category: "company_building", setupTopicKeys: [], status: "available" },
  { id: "arr_mrr", slug: "arr-mrr", category: "company_building", setupTopicKeys: [], status: "available" },
  { id: "churn", slug: "churn", category: "company_building", setupTopicKeys: [], status: "available" },
  { id: "pitch_deck", slug: "pitch-deck", category: "company_building", setupTopicKeys: [], status: "available" },
] as const satisfies readonly FounderLibraryTerm[];

export type FounderLibraryCategoryFilter = "all" | FounderLibraryCategoryKey;

export function toggleFounderLibraryOpenTerm(currentId: string | null, selectedId: string) {
  return currentId === selectedId ? null : selectedId;
}

export function retainVisibleFounderLibraryOpenTerm(
  currentId: string | null,
  visibleTerms: readonly Pick<FounderLibraryTerm, "id">[],
) {
  return currentId !== null && visibleTerms.some((entry) => entry.id === currentId) ? currentId : null;
}

export function filterFounderLibraryTerms(
  terms: readonly LocalizedFounderLibraryTerm[],
  query: string,
  category: FounderLibraryCategoryFilter,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return terms.filter((entry) => {
    const matchesCategory = category === "all" || entry.category === category;
    const matchesQuery = normalizedQuery.length === 0
      || entry.term.toLocaleLowerCase().includes(normalizedQuery)
      || entry.shortDefinition.toLocaleLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  });
}

export function sortFounderLibraryTerms(
  terms: readonly LocalizedFounderLibraryTerm[],
  locale: string,
) {
  return [...terms].sort((left, right) => left.term.localeCompare(right.term, locale, { sensitivity: "base" }));
}
