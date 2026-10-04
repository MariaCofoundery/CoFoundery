export type FounderWorkProfileState = "new" | "legacy" | "started" | "completed";

/** Presentation only: completion stays defined by the existing submission flow. */
export function resolveFounderWorkProfileState(input: {
  answered: number;
  started?: boolean;
  submitted: boolean;
  legacyBaseSubmitted: boolean;
}): FounderWorkProfileState {
  if (input.submitted) return "completed";
  if (input.started || input.answered > 0) return "started";
  return input.legacyBaseSubmitted ? "legacy" : "new";
}

export function founderWorkProfileHref(state: FounderWorkProfileState): string {
  return state === "completed" ? "/me/profile/workstyle" : "/research/workstyle-pretest?version=8.5a-v3";
}
