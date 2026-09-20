import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Die Hinweise, dass sich jemand geloescht hat.
 *
 * Sie stehen dort, wo vorher etwas war und jetzt nichts mehr ist: in den
 * Verbindungen und in der Team-Liste des Advisors. In Connect gibt es diesen
 * Hinweis laengst am Gespraech - dort bleibt das Gespraech ja stehen und kann
 * ihn tragen. In Align gibt es nichts mehr, woran er haengen koennte; deshalb
 * die eigene Zeile.
 *
 * Was sie NICHT enthaelt, steht in der Migration
 * (20261013120000_account_deletion_notices.sql): keinen Namen, keine Kennung,
 * nicht einmal das Team. Nur: an diesem Tag, in dieser Rolle, ist jemand
 * gegangen.
 */

export const ACCOUNT_DELETION_NOTICE_CONTEXTS = [
  "founder_connection",
  "advisor_team",
  "founder_advisor",
] as const;

export type AccountDeletionNoticeContext = (typeof ACCOUNT_DELETION_NOTICE_CONTEXTS)[number];

export type AccountDeletionNotice = {
  id: string;
  context: AccountDeletionNoticeContext;
  createdAt: string;
};

function isContext(value: unknown): value is AccountDeletionNoticeContext {
  return ACCOUNT_DELETION_NOTICE_CONTEXTS.includes(value as AccountDeletionNoticeContext);
}

/**
 * `contexts` waehlt aus, was an DIESER Stelle gezeigt wird - die Verbindungen
 * zeigen nicht, was den Advisor-Bereich angeht, und umgekehrt. Die
 * Zeilensicherheit begrenzt ohnehin schon auf die eigenen.
 */
export async function getAccountDeletionNotices(
  client: SupabaseClient,
  contexts: readonly AccountDeletionNoticeContext[]
): Promise<AccountDeletionNotice[]> {
  const { data, error } = await client
    .from("account_deletion_notices")
    .select("id, context, created_at")
    .in("context", [...contexts])
    .order("created_at", { ascending: false });

  // Ein Hinweis ist eine Beigabe. Faellt die Abfrage aus, fehlt er - die Seite
  // darum herum funktioniert weiter.
  if (error || !data) return [];

  return (data as { id: string; context: string; created_at: string }[])
    .filter((row) => isContext(row.context))
    .map((row) => ({
      id: row.id,
      context: row.context as AccountDeletionNoticeContext,
      createdAt: row.created_at,
    }));
}
