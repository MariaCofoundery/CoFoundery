/**
 * Welche Bestaetigungen heute gelten.
 *
 * Eine Bestaetigung zaehlt nur, wenn die Person danach nicht aus dem Team ausgetreten ist - tritt sie
 * wieder ein, muss sie erneut bestaetigen. Nichts wird geloescht; die Zeile bleibt als Historie, gilt aber
 * nicht als aktuell. `exitedAt` nennt je Person den letzten Austritt (Datenbank: `founder_team_member_exits`).
 */
export function filterCurrentConfirmations<T extends { user_id: string; confirmed_at: string }>(
  rows: readonly T[],
  exitedAt: ReadonlyMap<string, string>
): T[] {
  return rows.filter((row) => {
    const exited = exitedAt.get(row.user_id);
    return !exited || new Date(exited).getTime() <= new Date(row.confirmed_at).getTime();
  });
}
