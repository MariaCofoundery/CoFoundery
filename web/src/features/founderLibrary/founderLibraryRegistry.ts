import type { FounderSetupItemKey } from "@/features/teams/founderSetupCatalog";

export const FOUNDER_LIBRARY_CATEGORY_KEYS = [
  "collaboration_responsibility",
  "equity_money",
  "contracts_rights",
  "change",
  "protection_governance",
] as const;

export type FounderLibraryCategoryKey = (typeof FOUNDER_LIBRARY_CATEGORY_KEYS)[number];

export const FOUNDER_LIBRARY_RESOURCE_TYPES = [
  "orientation",
  "conversation_guide",
  "checklist",
  "external_source",
  "professional_review",
] as const;

export type FounderLibraryResourceType = (typeof FOUNDER_LIBRARY_RESOURCE_TYPES)[number];

export const FOUNDER_LIBRARY_PHASES = [
  "getting_to_know",
  "pre_founding",
  "founding",
  "funding",
  "first_hires",
  "growth",
  "change_crisis",
] as const;

export type FounderLibraryPhase = (typeof FOUNDER_LIBRARY_PHASES)[number];
export type FounderLibraryResourceStatus = "draft" | "available";

export type FounderLibraryResource = {
  id: string;
  slug: string;
  category: FounderLibraryCategoryKey;
  phases: readonly FounderLibraryPhase[];
  resourceTypes: readonly FounderLibraryResourceType[];
  setupTopicKeys: readonly FounderSetupItemKey[];
  status: FounderLibraryResourceStatus;
};

export const FOUNDER_LIBRARY_RESOURCES = [
  {
    id: "co_founder_agreement",
    slug: "co-founder-agreement",
    category: "contracts_rights",
    phases: ["pre_founding", "founding"],
    resourceTypes: ["orientation", "professional_review"],
    setupTopicKeys: ["founder_agreements"],
    status: "draft",
  },
  {
    id: "roles_responsibilities",
    slug: "roles-and-responsibilities",
    category: "collaboration_responsibility",
    phases: ["getting_to_know", "pre_founding", "founding", "growth"],
    resourceTypes: ["conversation_guide"],
    setupTopicKeys: ["roles_responsibilities"],
    status: "draft",
  },
  {
    id: "decision_rights",
    slug: "decision-rights",
    category: "collaboration_responsibility",
    phases: ["pre_founding", "founding", "growth"],
    resourceTypes: ["conversation_guide"],
    setupTopicKeys: ["decision_rights"],
    status: "draft",
  },
  {
    id: "deadlocks",
    slug: "deadlocks",
    category: "protection_governance",
    phases: ["founding", "growth", "change_crisis"],
    resourceTypes: ["checklist"],
    setupTopicKeys: ["conflict_deadlock"],
    status: "draft",
  },
  {
    id: "commitment",
    slug: "commitment",
    category: "collaboration_responsibility",
    phases: ["getting_to_know", "pre_founding", "founding", "change_crisis"],
    resourceTypes: ["conversation_guide"],
    setupTopicKeys: ["time_commitment", "changing_commitment"],
    status: "draft",
  },
  {
    id: "equity",
    slug: "equity",
    category: "equity_money",
    phases: ["pre_founding", "founding", "funding"],
    resourceTypes: ["orientation"],
    setupTopicKeys: ["equity"],
    status: "draft",
  },
  {
    id: "vesting",
    slug: "vesting",
    category: "equity_money",
    phases: ["founding", "funding", "first_hires"],
    resourceTypes: ["orientation", "professional_review"],
    setupTopicKeys: ["vesting"],
    status: "draft",
  },
  {
    id: "founder_exit",
    slug: "founder-exit",
    category: "change",
    phases: ["founding", "growth", "change_crisis"],
    resourceTypes: ["checklist", "professional_review"],
    setupTopicKeys: ["founder_exit"],
    status: "draft",
  },
] as const satisfies readonly FounderLibraryResource[];

export function getFounderLibraryResourcesByCategory(category: FounderLibraryCategoryKey) {
  return FOUNDER_LIBRARY_RESOURCES.filter((resource) => resource.category === category);
}
