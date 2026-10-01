import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Der Anzeigename wird an einer Stelle geschrieben: in `person_core`.
 *
 * ---------------------------------------------------------------------------
 * WARUM ES DIESE DATEI GIBT
 * ---------------------------------------------------------------------------
 *
 * Bis zum 01.10.2026 schrieben fuenf Stellen den Namen nach
 * `profiles.display_name`, und ein Trigger trug ihn von dort in den Kern.
 * Damit konnte eine Nebentabelle die kanonische Identitaet aendern - dieselbe
 * Bauart, die bei Connect die Bio von 1200 auf 800 Zeichen gekuerzt hat
 * (Bestandsaufnahme v2, Abschnitt 4.2).
 *
 * Jetzt laeuft es andersherum: Der Kern wird geschrieben, und die Propagation
 * aus `20260907180000` traegt den Namen in `profiles`, `network_profiles` und
 * `founder_discovery_profiles`. Eine Richtung, ein Weg.
 *
 * ---------------------------------------------------------------------------
 * BEWUSST KEINE "use server"-DATEI
 * ---------------------------------------------------------------------------
 *
 * Dort wuerde jeder Export zur Serveraktion mit eigener Kennung und eigener
 * Aufrufgrenze. Das hier ist ein Helfer, den vier Aktionen gemeinsam
 * benutzen - kein Endpunkt. Dieselbe Ueberlegung wie in
 * `onboardingCompletion.ts`.
 *
 * ---------------------------------------------------------------------------
 * LEER GILT NICHT ALS EINGABE
 * ---------------------------------------------------------------------------
 *
 * Die Regel stammt aus dem Trigger, den diese Datei abloest, und sie bleibt
 * gueltig: Ein leerer Name ist "nicht angegeben", nicht "loeschen". Ohne sie
 * wuerde ein leer abgeschicktes Feld im Fragebogen den Namen ueberall
 * entfernen - auch dort, wo andere Menschen ihn sehen.
 */
export async function writeDisplayNameToCore(
  client: Client,
  userId: string,
  displayName: string | null
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const name = displayName?.trim() ?? "";
  if (name.length === 0) {
    return { ok: true };
  }

  // Die Zeile gibt es fuer jedes Konto: `ensure_person_core_for_user` legt sie
  // beim Anmelden an. Deshalb ein update und kein upsert - ein upsert koennte
  // bei einem fehlenden Fremdschluessel eine Zeile fuer eine Kennung anlegen,
  // die es nicht gibt.
  //
  // `count` statt stillem Erfolg: Ein update ohne passende Zeile ist fuer
  // PostgREST kein Fehler. Ohne diese Pruefung meldete die Oberflaeche
  // "gespeichert", ohne etwas geschrieben zu haben.
  const { error, count } = await client
    .from("person_core")
    .update({ display_name: name.slice(0, 80) }, { count: "exact" })
    .eq("user_id", userId);

  if (error) {
    // DER EINE FALL, DER WIRKLICH VORKOMMT: Wer ein aktives Connect-Profil
    // hat und den Namen auf ein Zeichen kuerzt, wird von
    // `network_profiles_active_complete_check` abgewiesen (23514). Der Kern
    // ist permissiv, die Veroeffentlichung ist streng - die Aktion gibt den
    // Grund zurueck, statt ihn zu verschlucken.
    return { ok: false, reason: error.message ?? "display_name_save_failed" };
  }

  if (count === 0) {
    return { ok: false, reason: "person_core_missing" };
  }

  return { ok: true };
}
