import { AREAS } from "@/features/reporting/workstyle/model";
const TOPICS: Record<string, string> = { EVI: "decision_rights", EXP: "decision_rights", EL: "decision_rights", VOICE: "communication", AMB: "decision_rights", ORG: "roles_responsibilities" };
/** Allowlisted topic/question only. No raw answers in URLs or automatic writes. */
export function workstyleSetupHandoff(area: string) {
  const definition = AREAS.find(a => a.key === area);
  return definition && TOPICS[area] ? { topic: TOPICS[area], question: definition.question } : null;
}
export function workstyleSetupHref(teamId: string, area: string) {
  const handoff = workstyleSetupHandoff(area);
  return handoff ? `/teams/${encodeURIComponent(teamId)}/setup/${handoff.topic}?workstyle=${encodeURIComponent(area)}#discussion` : `/teams/${encodeURIComponent(teamId)}/setup`;
}
