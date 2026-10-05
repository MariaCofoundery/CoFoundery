/**
 * Bereitschaft des gemeinsamen Teamberichts.
 *
 * Phase 11.7B: Der Bericht erscheint fuer alle aktuellen Mitglieder
 * gleichzeitig, sobald JEDE Person ein aktuelles Arbeitsprofil hat und mit
 * diesem Team geteilt hat (Teamfreigabe; Bestand: vollstaendige gerichtete
 * Freigaben an alle anderen zaehlen weiter). Keine Paarmatrix mehr - je Person
 * nur "geteilt" oder "noch nicht geteilt", aus
 * get_workstyle_team_share_readiness (Wahrheitswerte, keine Antworten).
 *
 * Niemand teilt fuer andere: Es gibt nur einen Knopf fuer die eigene
 * Teamfreigabe.
 */

export type ReadinessMember = {
  person_id: string;
  name: string;
  is_viewer: boolean;
  has_current_workstyle: boolean;
  /** Fuer dieses Team geteilt (Teamfreigabe oder vollstaendiger Bestand). */
  shared_with_team: boolean;
  /** Ausdrueckliche Teamfreigabe aktiv. */
  team_share_active: boolean;
};

export type TeamReadiness = {
  status: "ready" | "missing" | "unavailable";
  members: ReadinessMember[];
  viewer_team_share: boolean;
};

export type ReadinessState =
  | "READY"
  | "MISSING_MINE"
  | "MISSING_OTHERS"
  | "MISSING_MULTIPLE"
  | "INSUFFICIENT_WORKSTYLE"
  | "UNAVAILABLE";

export function parseTeamReadiness(value: unknown): TeamReadiness | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as { status?: unknown; members?: unknown; viewer_team_share?: unknown };
  if (raw.status !== "ready" && raw.status !== "missing" && raw.status !== "unavailable") return null;
  const members = Array.isArray(raw.members)
    ? raw.members.flatMap((m) => {
        if (!m || typeof m !== "object") return [];
        const r = m as Record<string, unknown>;
        if (typeof r.person_id !== "string") return [];
        return [{
          person_id: r.person_id,
          name: typeof r.name === "string" && r.name.trim() ? r.name : "Founder",
          is_viewer: r.is_viewer === true,
          has_current_workstyle: r.has_current_workstyle === true,
          shared_with_team: r.shared_with_team === true || r.shared_with_all_members === true,
          team_share_active: r.team_share_active === true,
        }];
      })
    : [];
  return { status: raw.status, members, viewer_team_share: raw.viewer_team_share === true };
}

/**
 * Hat die Person fuer dieses Team geteilt? Die Teamfreigabe zaehlt auch, wenn
 * das Arbeitsprofil noch fehlt (die DB meldet shared_with_team dann false,
 * weil fuer den Bericht noch etwas fehlt).
 */
export const memberShared = (m: ReadinessMember) => m.shared_with_team || m.team_share_active;
/** Geteilt UND aktuelles Arbeitsprofil - nur dann zaehlt eine Person als bereit. */
export const memberReady = (m: ReadinessMember) => m.has_current_workstyle && memberShared(m);

export function readinessState(readiness: TeamReadiness): {
  state: ReadinessState;
  /** Wer noch etwas tun muss - ausser der betrachtenden Person. */
  waitingFor: string[];
  /** Was die betrachtende Person selbst tun kann. */
  viewerAction: "complete_workstyle" | "share_team" | null;
} {
  if (readiness.status === "unavailable") return { state: "UNAVAILABLE", waitingFor: [], viewerAction: null };
  if (readiness.status === "ready") return { state: "READY", waitingFor: [], viewerAction: null };
  const viewer = readiness.members.find((m) => m.is_viewer);
  const others = readiness.members.filter((m) => !m.is_viewer);
  const waitingFor = others.filter((m) => !memberReady(m)).map((m) => m.name);
  // Eigene Teamfreigabe kann man auch ohne fertiges Arbeitsprofil schon geben.
  const viewerAction =
    viewer && !memberShared(viewer) ? "share_team" : viewer && !viewer.has_current_workstyle ? "complete_workstyle" : null;
  if (readiness.members.some((m) => !m.has_current_workstyle)) return { state: "INSUFFICIENT_WORKSTYLE", waitingFor, viewerAction };
  const mine = viewer ? !memberShared(viewer) : false;
  return {
    state: mine && waitingFor.length ? "MISSING_MULTIPLE" : mine ? "MISSING_MINE" : "MISSING_OTHERS",
    waitingFor,
    viewerAction,
  };
}
