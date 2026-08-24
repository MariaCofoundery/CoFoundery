export const COMMITMENT_LAB_OBLIGATIONS = [
  "employment",
  "self_employment",
  "education",
  "family_care",
  "other_project",
  "other_regular",
] as const;

export const COMMITMENT_LAB_ASPECTS = [
  "priority",
  "reliability",
  "transparency",
  "responsibility",
  "renegotiation",
] as const;

// Capacity is captured by the Reality Check; the remaining concepts use reflection prompts.
export const COMMITMENT_LAB_CONCEPTS = ["capacity", ...COMMITMENT_LAB_ASPECTS] as const;

export const COMMITMENT_LAB_SCENARIOS = [
  "motivation_progress",
  "time_circumstances",
  "attractive_alternative",
  "team_responsibility",
] as const;

export type CommitmentLabObligation = (typeof COMMITMENT_LAB_OBLIGATIONS)[number];
export type CommitmentLabScenarioKey = (typeof COMMITMENT_LAB_SCENARIOS)[number];
export type CommitmentLabRealityFit = "realistic" | "partly" | "reconsider";
export type CommitmentLabScenarioAnswer = { action: string; expectation: string };

export type CommitmentLabFounderEntry = {
  relationshipId: string;
  userId: string;
  currentHours: number | null;
  difficultWeekHours: number | null;
  obligationCategories: CommitmentLabObligation[];
  changeNote: string;
  realityFit: CommitmentLabRealityFit | null;
  commitmentMeaning: string;
  priorityReflection: string;
  reliabilityReflection: string;
  transparencyReflection: string;
  responsibilityReflection: string;
  renegotiationReflection: string;
  scenarioAnswers: Record<CommitmentLabScenarioKey, CommitmentLabScenarioAnswer>;
  updatedAt: string;
};

export type CommitmentLabDiscussionEntry = {
  id: string;
  authorUserId: string;
  parentEntryId: string | null;
  body: string;
  createdAt: string;
};

export function emptyScenarioAnswers(): Record<CommitmentLabScenarioKey, CommitmentLabScenarioAnswer> {
  return Object.fromEntries(
    COMMITMENT_LAB_SCENARIOS.map((key) => [key, { action: "", expectation: "" }])
  ) as Record<CommitmentLabScenarioKey, CommitmentLabScenarioAnswer>;
}

export function normalizeScenarioAnswers(value: unknown) {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
  const result = emptyScenarioAnswers();
  for (const key of COMMITMENT_LAB_SCENARIOS) {
    const entry = source[key];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    result[key] = {
      action: typeof record.action === "string" ? record.action : "",
      expectation: typeof record.expectation === "string" ? record.expectation : "",
    };
  }
  return result;
}

export function isCommitmentLabFounderReady(entry: CommitmentLabFounderEntry | null) {
  if (!entry || entry.currentHours == null || entry.difficultWeekHours == null || !entry.realityFit) {
    return false;
  }
  return [
    entry.commitmentMeaning,
    entry.priorityReflection,
    entry.reliabilityReflection,
    entry.transparencyReflection,
    entry.responsibilityReflection,
    entry.renegotiationReflection,
    ...COMMITMENT_LAB_SCENARIOS.flatMap((key) => [
      entry.scenarioAnswers[key].action,
      entry.scenarioAnswers[key].expectation,
    ]),
  ].every((value) => value.trim().length > 0);
}

export function groupCommitmentLabDiscussion(entries: CommitmentLabDiscussionEntry[]) {
  const roots = entries.filter((entry) => !entry.parentEntryId);
  return roots.map((root) => ({
    root,
    replies: entries.filter((entry) => entry.parentEntryId === root.id),
  }));
}
