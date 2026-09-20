import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Laeuft die KI gerade?
 *
 * Die Antwort kommt aus einem Lebenszeichen in der Datenbank, nicht aus einem
 * Gesundheitsaufruf: Das Modell laeuft auf einem Laptop, und der ruft heraus.
 * Ein Aufruf in die andere Richtung braeuchte einen offenen Port und wuerde
 * jede Seite, die ihn stellt, um die Wartezeit verlaengern.
 *
 * ZWEI MINUTEN NACHLAUF bei einem Lebenszeichen alle dreissig Sekunden
 * (`get_ai_availability`): Ein ausgelassener Durchgang laesst die Anzeige nicht
 * flackern, ein ausgeschalteter Laptop wird innerhalb einer Minute sichtbar.
 *
 * Faellt die Abfrage aus, gilt "nicht verfuegbar". Lieber einmal zu wenig
 * versprochen als ein gruener Punkt, hinter dem nichts ist.
 */
export async function getAiAvailability(client: SupabaseClient): Promise<boolean> {
  const { data, error } = await client.rpc("get_ai_availability");
  return !error && data === true;
}

/**
 * Wie viele eigene Aufgaben noch warten.
 *
 * Ueber die normale Zeilensicherheit - jede Person sieht nur ihre eigenen.
 * Steht hier eine Zahl, ist "gerade nicht verfuegbar" keine Absage, sondern
 * eine Wartezeit.
 */
export async function getOwnPendingAiJobCount(client: SupabaseClient): Promise<number> {
  const { count, error } = await client
    .from("ai_jobs")
    .select("id", { count: "exact", head: true })
    .in("status", ["pending", "running"]);
  return error ? 0 : count ?? 0;
}
