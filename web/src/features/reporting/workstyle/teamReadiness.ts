/**
 * Phase 11.5 - Bereitschaft des gemeinsamen Teamberichts.
 *
 * Der Teambericht ist ein gemeinsames Artefakt: Er erscheint fuer alle
 * aktuellen Mitglieder gleichzeitig, sobald JEDE Person ihr aktuelles
 * Arbeitsprofil fuer JEDE andere vollstaendig freigegeben hat (durchgesetzt in
 * get_workstyle_product_team). Bis dahin zeigt die Seite, was fehlt - aus
 * get_workstyle_team_share_readiness, das nur zwei Wahrheitswerte je Person
 * liefert, keine Antworten.
 *
 * Freigaben bleiben gerichtet: Hier wird nichts freigegeben, und fuer andere
 * gibt es keinen Knopf, der ihre Freigabe simuliert.
 */

export type ReadinessMember = {
  person_id: string;
  name: string;
  is_viewer: boolean;
  has_current_workstyle: boolean;
  shared_with_all_members: boolean;
};

export type TeamReadiness = { status: "ready" | "missing" | "unavailable"; members: ReadinessMember[] };

export type ReadinessState =
  | "READY"
  | "MISSING_MINE"
  | "MISSING_OTHERS"
  | "MISSING_MULTIPLE"
  | "INSUFFICIENT_WORKSTYLE"
  | "UNAVAILABLE";

export function parseTeamReadiness(value: unknown): TeamReadiness | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as { status?: unknown; members?: unknown };
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
          shared_with_all_members: r.shared_with_all_members === true,
        }];
      })
    : [];
  return { status: raw.status, members };
}

export function readinessState(readiness: TeamReadiness): {
  state: ReadinessState;
  /** Wer noch etwas tun muss - ausser der betrachtenden Person. */
  waitingFor: string[];
  /** Was die betrachtende Person selbst tun kann. */
  viewerAction: "complete_workstyle" | "review_shares" | null;
} {
  if (readiness.status === "unavailable") return { state: "UNAVAILABLE", waitingFor: [], viewerAction: null };
  if (readiness.status === "ready") return { state: "READY", waitingFor: [], viewerAction: null };
  const viewer = readiness.members.find((m) => m.is_viewer);
  const others = readiness.members.filter((m) => !m.is_viewer);
  if (readiness.members.some((m) => !m.has_current_workstyle)) {
    return {
      state: "INSUFFICIENT_WORKSTYLE",
      waitingFor: others.filter((m) => !m.has_current_workstyle || !m.shared_with_all_members).map((m) => m.name),
      viewerAction: viewer && !viewer.has_current_workstyle ? "complete_workstyle" : viewer && !viewer.shared_with_all_members ? "review_shares" : null,
    };
  }
  const mine = viewer ? !viewer.shared_with_all_members : false;
  const waitingFor = others.filter((m) => !m.shared_with_all_members).map((m) => m.name);
  return {
    state: mine && waitingFor.length ? "MISSING_MULTIPLE" : mine ? "MISSING_MINE" : "MISSING_OTHERS",
    waitingFor,
    viewerAction: mine ? "review_shares" : null,
  };
}
