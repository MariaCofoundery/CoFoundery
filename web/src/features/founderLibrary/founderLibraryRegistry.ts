import type { FounderSetupItemKey } from "@/features/teams/founderSetupCatalog";

export const FOUNDER_LIBRARY_CATEGORY_KEYS = [
  "collaboration_responsibility",
  "equity_money",
  "contracts_rights",
  "change",
  "protection_governance",
] as const;

export type FounderLibraryCategoryKey = (typeof FOUNDER_LIBRARY_CATEGORY_KEYS)[number];

export type FounderLibraryResourceStatus = "draft" | "available";

export type FounderLibraryResource = {
  id: string;
  slug: string;
  category: FounderLibraryCategoryKey;
  status: FounderLibraryResourceStatus;
  setupTopicKeys?: readonly FounderSetupItemKey[];
};

export const FOUNDER_LIBRARY_RESOURCES = [
  {
    id: "co_founder_agreement",
    slug: "co-founder-agreement",
    category: "contracts_rights",
    setupTopicKeys: ["founder_agreements"],
    status: "draft",
  },
  {
    id: "roles_responsibilities",
    slug: "roles-and-responsibilities",
    category: "collaboration_responsibility",
    setupTopicKeys: ["roles_responsibilities"],
    status: "draft",
  },
  {
    id: "decision_rights",
    slug: "decision-rights",
    category: "collaboration_responsibility",
    setupTopicKeys: ["decision_rights"],
    status: "draft",
  },
  {
    id: "deadlocks",
    slug: "deadlocks",
    category: "protection_governance",
    setupTopicKeys: ["conflict_deadlock"],
    status: "draft",
  },
  {
    id: "commitment",
    slug: "commitment",
    category: "collaboration_responsibility",
    setupTopicKeys: ["time_commitment", "changing_commitment"],
    status: "draft",
  },
  {
    id: "equity",
    slug: "equity",
    category: "equity_money",
    setupTopicKeys: ["equity"],
    status: "draft",
  },
  {
    id: "vesting",
    slug: "vesting",
    category: "equity_money",
    setupTopicKeys: ["vesting"],
    status: "draft",
  },
  {
    id: "founder_exit",
    slug: "founder-exit",
    category: "change",
    setupTopicKeys: ["founder_exit"],
    status: "draft",
  },
] as const satisfies readonly FounderLibraryResource[];

export function getFounderLibraryResourcesByCategory(category: FounderLibraryCategoryKey) {
  return FOUNDER_LIBRARY_RESOURCES.filter((resource) => resource.category === category);
}
