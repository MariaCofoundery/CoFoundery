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

export const COMMITMENT_LAB_DISCUSSION_MARKERS = [
  "commitment_meaning",
  ...COMMITMENT_LAB_ASPECTS.map((aspect) => `aspect:${aspect}` as const),
  ...COMMITMENT_LAB_SCENARIOS.map((scenario) => `scenario:${scenario}` as const),
  "difficulty_wish",
] as const;

export type CommitmentLabObligation = (typeof COMMITMENT_LAB_OBLIGATIONS)[number];
export type CommitmentLabScenarioKey = (typeof COMMITMENT_LAB_SCENARIOS)[number];
export type CommitmentLabDiscussionMarker = (typeof COMMITMENT_LAB_DISCUSSION_MARKERS)[number];
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
  difficultSituation: string;
  desiredAlternative: string;
  discussionMarkers: CommitmentLabDiscussionMarker[];
  updatedAt: string;
};

export type CommitmentLabSnapshot = {
  currentHours: number | null;
  difficultWeekHours: number | null;
  obligationCategories: CommitmentLabObligation[];
  changeNote: string;
  commitmentMeaning: string;
  difficultSituation: string;
  desiredAlternative: string;
  discussionMarkers: CommitmentLabDiscussionMarker[];
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

export function normalizeCommitmentLabDiscussionMarkers(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (marker, index): marker is CommitmentLabDiscussionMarker =>
      typeof marker === "string" &&
      (COMMITMENT_LAB_DISCUSSION_MARKERS as readonly string[]).includes(marker) &&
      value.indexOf(marker) === index
  ).slice(0, 3);
}

export function getCommitmentLabMarkerMessageKey(marker: CommitmentLabDiscussionMarker) {
  return `markers.labels.${marker.replace(":", "_")}`;
}

export function getCommitmentLabMarkerAnswer(
  entry: CommitmentLabFounderEntry,
  marker: CommitmentLabDiscussionMarker
) {
  if (marker === "commitment_meaning") return entry.commitmentMeaning;
  if (marker === "difficulty_wish") {
    return [entry.difficultSituation, entry.desiredAlternative].filter(Boolean).join("\n\n");
  }
  if (marker.startsWith("aspect:")) {
    const aspect = marker.slice(7);
    const field = `${aspect}Reflection` as keyof CommitmentLabFounderEntry;
    return typeof entry[field] === "string" ? entry[field] : "";
  }
  const scenario = marker.slice(9) as CommitmentLabScenarioKey;
  const answer = entry.scenarioAnswers[scenario];
  return answer ? [answer.action, answer.expectation].filter(Boolean).join("\n\n") : "";
}

export function buildCommitmentLabSnapshot(
  entry: CommitmentLabFounderEntry
): CommitmentLabSnapshot {
  return {
    currentHours: entry.currentHours,
    difficultWeekHours: entry.difficultWeekHours,
    obligationCategories: [...entry.obligationCategories],
    changeNote: entry.changeNote,
    commitmentMeaning: entry.commitmentMeaning,
    difficultSituation: entry.difficultSituation,
    desiredAlternative: entry.desiredAlternative,
    discussionMarkers: [...entry.discussionMarkers],
  };
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
