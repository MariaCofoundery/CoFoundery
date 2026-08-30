import type { FounderSetupItemKey } from "@/features/teams/founderSetupCatalog";

export const FOUNDER_LIBRARY_CATEGORY_KEYS = [
  "equity_financing",
  "contracts_governance",
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
