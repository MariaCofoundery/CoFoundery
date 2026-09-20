import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyNetwork } from "@/features/notifications/networkNotification";

/**
 * Benachrichtigungen fuer Vorstellungsanfragen aus Find.
 *
 * DIE LUECKE, DIE SIE SCHLIESSEN: Eine Vorstellungsanfrage war der einzige
 * Vorgang, bei dem sich jemand persoenlich an eine andere Person wendet, ohne
 * dass diese es erfaehrt - nur ein Zaehler in der Leiste, sichtbar fuer den,
 * der ohnehin da ist. Wer nicht taeglich hereinschaut, laesst jemanden
 * wochenlang warten, ohne es zu wissen.
 *
 * DER NAME KOMMT AUS DEM DISCOVERY-PROFIL, nicht aus person_core.
 *   In Find sieht man einander als das, was im Discovery-Profil steht. Eine
 *   Benachrichtigung darf nicht mehr verraten als die Seite, von der sie
 *   handelt - sonst waere sie der Weg, auf dem ein Name herauskommt, den die
 *   Person dort gar nicht zeigt.
 *
 * EINE ABSAGE WIRD NICHT VERSCHICKT.
 *   Sie steht in der Liste und ist dort zu sehen. Eine Mail darueber macht aus
 *   einem stillen Nein eine Zustellung ins Postfach - und auf ein Nein folgt
 *   nichts, was man tun koennte. Wer angefragt hat, soll es erfahren, wenn er
 *   hinsieht, nicht mitten in etwas anderem.
 */

/** Beide Meldungen fuehren dorthin, wo der Vorgang steht. */
const INTRO_PATH = "/discovery/intros";

export async function notifyDiscoveryIntroRequest(
  client: SupabaseClient,
  params: { introRequestId: string; recipientUserId: string; requesterName: string | null }
) {
  await notifyNetwork(client, {
    kind: "discovery_intro_request",
    subjectId: params.introRequestId,
    recipientUserId: params.recipientUserId,
    path: INTRO_PATH,
    senderName: params.requesterName,
  });
}

/**
 * Die Zusage geht an die Person, die angefragt hat.
 *
 * Ohne sie erfaehrt sie es nur, wenn sie von sich aus nachsieht - und das
 * Gespraech, das sich mit der Zusage oeffnet, bliebe leer, weil beide Seiten
 * auf die andere warten.
 */
export async function notifyDiscoveryIntroAccepted(
  client: SupabaseClient,
  params: { introRequestId: string; requesterUserId: string; recipientName: string | null }
) {
  await notifyNetwork(client, {
    kind: "discovery_intro_accepted",
    subjectId: params.introRequestId,
    recipientUserId: params.requesterUserId,
    path: INTRO_PATH,
    senderName: params.recipientName,
  });
}
