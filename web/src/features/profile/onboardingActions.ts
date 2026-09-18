"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { markOnboardingComplete } from "@/features/profile/onboardingCompletion";
import { createClient } from "@/lib/supabase/server";

/**
 * Der Abschluss des Einstiegs fuer Menschen, die erstmal nur Leute
 * kennenlernen wollen.
 *
 * WARUM EINE EIGENE AKTION UND NICHT upsertProfileBasicsAction:
 *
 *   `profiles.roles` traegt `default '{founder}'`. Eine profiles-Zeile
 *   anzulegen, um "keine Rolle" auszudruecken, macht die Person zur
 *   Founderin - mit Align und Find, die sie gerade ausdruecklich nicht
 *   gewaehlt hat. Genau deshalb haben Connect-only-Konten bewusst gar keine
 *   profiles-Zeile.
 *
 *   Diese Aktion schreibt den Namen deshalb in person_core, die kanonische
 *   Identitaetszeile, und holt die Mitgliedschaft ueber eine eigene RPC. Kein
 *   Weg fuehrt hier zu einer Rolle.
 *
 * Kein Bild-Schritt in diesem Zweig: Das Connect-Foto haengt an einer
 * Sichtbarkeitsentscheidung, die auf /connect/profile getroffen wird. Sie
 * hier vorwegzunehmen hiesse, sie an zwei Orten zu stellen.
 */
export async function completeConnectOnboardingAction(formData: FormData) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect("/login?next=/welcome");

  const displayName = String(formData.get("displayName") ?? "").trim().slice(0, 80);
  if (displayName.length === 0) {
    redirect("/welcome?error=name");
  }

  const { error: coreError } = await client
    .from("person_core")
    .update({ display_name: displayName })
    .eq("user_id", user.id);
  if (coreError) {
    redirect("/welcome?error=save");
  }

  // Erst die Mitgliedschaft, dann die Markierung.
  //
  // Andersherum waere der Abbruch dazwischen der schlechtere Zustand: Die
  // Person gaelte als eingefuehrt, haette aber keinen Bereich - und landete
  // beim naechsten Login auf /start, also ausserhalb des Produkts. So herum
  // bekommt sie im schlimmsten Fall den kurzen Einstieg noch einmal.
  const { data: joined, error: joinError } = await client.rpc("join_network_as_member");
  if (joinError || joined !== true) {
    redirect("/welcome?error=join");
  }

  await markOnboardingComplete(client, user.id);

  revalidatePath("/connect");
  redirect("/connect/profile");
}
