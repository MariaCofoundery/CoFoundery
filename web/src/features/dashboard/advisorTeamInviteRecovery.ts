/**
 * Phase 12C.1C: Wann eine Advisor-Team-Einladung einen Wiederholungsweg braucht.
 *
 * Scheitert der Abschluss nach einem legitimen Slot-Klick technisch, bleibt die
 * Einladung offen (`pending`/`activating`), der Slot ist aber vergeben: Ein
 * zweiter Klick ist nicht mehr moeglich (`already_claimed`). Bisher leitete die
 * Seite dann sofort in den Fragebogen weiter, und der Abschluss lief nie wieder
 * - eine dauerhafte Sackgasse.
 *
 * Der Wiederholungsweg verlangt keine neue Zustimmung: Die Zustimmung IST der
 * Slot-Klick, und der ist gespeichert. Er steht nur der Person offen, die den
 * Slot selbst beansprucht hat (gleiche Kennung UND gleiche Adresse) - der Token
 * allein genuegt nicht.
 */
export type AdvisorTeamInviteRecoveryRow = {
  status: string;
  founder_a_email: string;
  founder_b_email: string;
  founder_a_user_id: string | null;
  founder_b_user_id: string | null;
  invitation_id: string | null;
};

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function isAdvisorTeamInviteSlotOwner(
  row: AdvisorTeamInviteRecoveryRow,
  slot: "founderA" | "founderB",
  viewer: { userId: string | null | undefined; email: string | null | undefined }
) {
  if (!viewer.userId) return false;
  const slotUserId = slot === "founderA" ? row.founder_a_user_id : row.founder_b_user_id;
  const slotEmail = slot === "founderA" ? row.founder_a_email : row.founder_b_email;
  return slotUserId === viewer.userId && normalize(slotEmail) === normalize(viewer.email);
}

/**
 * Offen und vom Betrachter beansprucht - und entweder fehlt die
 * Founder-Einladung ganz (erster Abschluss gescheitert) oder beide Slots sind
 * vergeben, ohne dass die Einladung aktiviert wurde (zweiter Abschluss
 * gescheitert). Wartet nur noch die andere Person, ist nichts zu reparieren.
 */
export function needsAdvisorTeamInviteRecovery(
  row: AdvisorTeamInviteRecoveryRow,
  slot: "founderA" | "founderB",
  viewer: { userId: string | null | undefined; email: string | null | undefined }
) {
  if (row.status !== "pending" && row.status !== "activating") return false;
  if (!isAdvisorTeamInviteSlotOwner(row, slot, viewer)) return false;
  const bothClaimed = Boolean(row.founder_a_user_id && row.founder_b_user_id);
  return !row.invitation_id || bothClaimed;
}
