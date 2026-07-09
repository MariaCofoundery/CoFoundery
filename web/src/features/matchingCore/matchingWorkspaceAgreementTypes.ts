import type { MatchingWorkspace } from "@/features/matchingCore/matchingWorkspaceTypes";

export const MATCHING_WORKSPACE_AGREEMENT_STATUSES = ["draft"] as const;

export type MatchingWorkspaceAgreementStatus =
  (typeof MATCHING_WORKSPACE_AGREEMENT_STATUSES)[number];

export const MATCHING_WORKSPACE_AGREEMENT_SECTION_KEYS = [
  "roles",
  "commitment",
  "decisions",
  "conflict",
  "communication",
  "equity_conversation",
  "next_90_days",
] as const;

export type MatchingWorkspaceAgreementSectionKey =
  (typeof MATCHING_WORKSPACE_AGREEMENT_SECTION_KEYS)[number];

export type MatchingWorkspaceAgreementSection = {
  notes: string;
  agreement: string;
  updatedAt: string | null;
};

export type MatchingWorkspaceAgreementSections = Record<
  MatchingWorkspaceAgreementSectionKey,
  MatchingWorkspaceAgreementSection
>;

export type MatchingWorkspaceAgreement = {
  id: string;
  matchingWorkspaceId: string;
  relationshipId: string;
  status: MatchingWorkspaceAgreementStatus;
  sections: MatchingWorkspaceAgreementSections;
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type MatchingWorkspaceAgreementSummary = {
  workspace: MatchingWorkspace;
  agreement: MatchingWorkspaceAgreement | null;
};

export function isMatchingWorkspaceAgreementStatus(
  value: string
): value is MatchingWorkspaceAgreementStatus {
  return MATCHING_WORKSPACE_AGREEMENT_STATUSES.includes(
    value as MatchingWorkspaceAgreementStatus
  );
}

export function isMatchingWorkspaceAgreementSectionKey(
  value: string
): value is MatchingWorkspaceAgreementSectionKey {
  return MATCHING_WORKSPACE_AGREEMENT_SECTION_KEYS.includes(
    value as MatchingWorkspaceAgreementSectionKey
  );
}

export function createInitialMatchingWorkspaceAgreementSections(): MatchingWorkspaceAgreementSections {
  return Object.fromEntries(
    MATCHING_WORKSPACE_AGREEMENT_SECTION_KEYS.map((key) => [
      key,
      {
        notes: "",
        agreement: "",
        updatedAt: null,
      },
    ])
  ) as MatchingWorkspaceAgreementSections;
}

export const MATCHING_WORKSPACE_AGREEMENT_FIELD_LIMITS = {
  notes: 4000,
  agreement: 4000,
} as const;

function normalizeAgreementText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.slice(0, maxLength);
}

export function normalizeMatchingWorkspaceAgreementSectionInput(input: {
  notes?: unknown;
  agreement?: unknown;
}) {
  return {
    notes: normalizeAgreementText(input.notes, MATCHING_WORKSPACE_AGREEMENT_FIELD_LIMITS.notes),
    agreement: normalizeAgreementText(
      input.agreement,
      MATCHING_WORKSPACE_AGREEMENT_FIELD_LIMITS.agreement
    ),
  };
}

export function normalizeMatchingWorkspaceAgreementSections(
  value: unknown
): MatchingWorkspaceAgreementSections {
  const initial = createInitialMatchingWorkspaceAgreementSections();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return initial;
  }

  const rawSections = value as Record<string, unknown>;
  return Object.fromEntries(
    MATCHING_WORKSPACE_AGREEMENT_SECTION_KEYS.map((key) => {
      const rawSection = rawSections[key];
      if (!rawSection || typeof rawSection !== "object" || Array.isArray(rawSection)) {
        return [key, initial[key]];
      }

      const section = rawSection as Record<string, unknown>;
      return [
        key,
        {
          notes: typeof section.notes === "string" ? section.notes : "",
          agreement: typeof section.agreement === "string" ? section.agreement : "",
          updatedAt: typeof section.updatedAt === "string" ? section.updatedAt : null,
        },
      ];
    })
  ) as MatchingWorkspaceAgreementSections;
}

export function mergeMatchingWorkspaceAgreementSection(params: {
  sections: unknown;
  sectionKey: MatchingWorkspaceAgreementSectionKey;
  notes: string;
  agreement: string;
  updatedAt: string;
}): MatchingWorkspaceAgreementSections {
  const sections = normalizeMatchingWorkspaceAgreementSections(params.sections);
  return {
    ...sections,
    [params.sectionKey]: {
      notes: params.notes,
      agreement: params.agreement,
      updatedAt: params.updatedAt,
    },
  };
}

export function canCreateMatchingWorkspaceAgreement(params: {
  workspaceStatus: string;
  currentUserIsParticipant: boolean;
  existingAgreementId?: string | null;
}) {
  if (params.existingAgreementId) {
    return true;
  }

  return params.workspaceStatus === "prepared" && params.currentUserIsParticipant;
}
