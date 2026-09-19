import "server-only";
import { redirect } from "next/navigation";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Zugang zum Postfach - fuer JEDE angemeldete Person.
 *
 * WARUM NICHT `requireConnectMember`: Das Postfach traegt seit dem 19.09.2026
 * drei Urspruenge, und einer davon kommt aus Find. Wer nur Align und Find
 * nutzt, kaeme sonst an sein eigenes Gespraech nicht heran - und bekaeme eine
 * Weiterleitung mit der Begruendung, er sei kein Connect-Mitglied, was mit der
 * Sache nichts zu tun hat.
 *
 * Die Einschraenkung passiert weiterhin in der Datenbank, nicht hier:
 * `list_network_conversations` und `list_network_messages` geben
 * ausschliesslich Gespraeche heraus, in denen die anfragende Person
 * Teilnehmerin ist. Wer keine hat, sieht eine leere Liste. Diese Funktion
 * prueft also nur, DASS jemand angemeldet ist.
 */
export async function requireSignedInForMessages(next = "/messages") {
  const client = await createClient();
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return { client, user };
}
