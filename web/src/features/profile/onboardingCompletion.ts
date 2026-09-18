import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Haelt fest, dass die Person den Einstieg durchlaufen hat.
 *
 * Bewusst KEINE "use server"-Datei: Dort wird jeder Export zur Serveraktion
 * mit eigener ID und Aufrufgrenze. Das hier ist ein Helfer, den zwei Aktionen
 * gemeinsam nutzen, kein Endpunkt.
 *
 * `is null` in der Bedingung, damit ein spaeterer Aufruf den urspruenglichen
 * Zeitpunkt nicht ueberschreibt - die Spalte beantwortet "seit wann", und
 * eine Antwort, die sich mitbewegt, beantwortet nichts.
 */
export async function markOnboardingComplete(client: Client, userId: string) {
  await client
    .from("person_core")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("onboarding_completed_at", null);
}
