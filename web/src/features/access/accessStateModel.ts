/**
 * Phase 12C.1C: Welcher erklaerende Zustand fuer welche Statusauskunft.
 *
 * Die Auskunft kommt aus der Datenbank (get_team_access_state,
 * get_advisor_person_access_state, get_advisor_team_review_state) und nennt nur
 * Gruende, die die Person ohnehin kennen darf. Wer nie Zugang hatte, bekommt
 * dort 'none' - und hier `null`: Dann bleibt es bei der allgemeinen
 * Nicht-verfuegbar-Seite, genau wie fuer eine Kennung, die es nicht gibt.
 *
 * Statusinformation ist kein Datenzugriff. Diese Zustaende zeigen nie Inhalte.
 */

export type AccessStateLink = "connections" | "advisor" | "people";

export type TeamAccessState =
  | "member"
  | "readable"
  | "left"
  | "archived"
  | "team_inactive"
  | "org_membership_ended"
  | "org_suspended"
  | "review_ended"
  | "roster_changed"
  | "access_ended"
  | "none";

export type TeamAccessView = {
  messageKey:
    | "left"
    | "archived"
    | "rosterChanged"
    | "reviewEnded"
    | "orgMembershipEnded"
    | "orgSuspended"
    | "accessEnded";
  links: AccessStateLink[];
};

const TEAM_VIEWS: Partial<Record<TeamAccessState, TeamAccessView>> = {
  left: { messageKey: "left", links: ["connections"] },
  archived: { messageKey: "archived", links: ["connections"] },
  team_inactive: { messageKey: "archived", links: ["advisor"] },
  roster_changed: { messageKey: "rosterChanged", links: ["people", "advisor"] },
  review_ended: { messageKey: "reviewEnded", links: ["advisor"] },
  org_membership_ended: { messageKey: "orgMembershipEnded", links: ["advisor"] },
  org_suspended: { messageKey: "orgSuspended", links: ["advisor"] },
  access_ended: { messageKey: "accessEnded", links: ["advisor"] },
};

/** `member`, `readable`, `none` und Unbekanntes: keine Erklaerung, echte 404. */
export function teamAccessView(state: unknown): TeamAccessView | null {
  return typeof state === "string" ? (TEAM_VIEWS[state as TeamAccessState] ?? null) : null;
}

export type PersonAccessView = {
  messageKey: "ended" | "pending" | "orgMembershipEnded" | "orgSuspended";
};

const PERSON_VIEWS: Record<string, PersonAccessView> = {
  ended: { messageKey: "ended" },
  pending: { messageKey: "pending" },
  org_membership_ended: { messageKey: "orgMembershipEnded" },
  org_suspended: { messageKey: "orgSuspended" },
};

/** `active` (Seite rendert normal), `none` und Unbekanntes: `null`. */
export function personAccessView(state: unknown): PersonAccessView | null {
  return typeof state === "string" ? (PERSON_VIEWS[state] ?? null) : null;
}

export type TeamReviewState =
  | { state: "active_with_team"; teamId: string }
  | {
      state:
        | "active_without_team"
        | "active_team_changed"
        | "active_team_inactive"
        | "active_team_unavailable";
    }
  | { state: "requested" | "ended" | "org_membership_ended" | "org_suspended" | "none" };

const REVIEW_STATES = new Set([
  "active_without_team",
  "active_team_changed",
  "active_team_inactive",
  "active_team_unavailable",
  "requested",
  "ended",
  "org_membership_ended",
  "org_suspended",
]);

export function parseTeamReviewState(value: unknown): TeamReviewState {
  if (!value || typeof value !== "object") return { state: "none" };
  const record = value as { state?: unknown; team_id?: unknown };
  if (record.state === "active_with_team" && typeof record.team_id === "string" && record.team_id) {
    return { state: "active_with_team", teamId: record.team_id };
  }
  if (typeof record.state === "string" && REVIEW_STATES.has(record.state)) {
    return { state: record.state } as TeamReviewState;
  }
  return { state: "none" };
}

/** Ein aktiver Review, dessen Inhalt die Seite zeigen darf. */
export function isActiveReviewState(state: TeamReviewState) {
  return state.state.startsWith("active_");
}
