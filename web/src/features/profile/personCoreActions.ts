"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const REMOTE_MODES = ["onsite", "hybrid", "remote", "flexible"];

/**
 * Kommaliste zu Werteliste. Leer bleibt null, nicht [] - im Kern bedeutet
 * leer "noch nichts eingetragen", und ein leeres Array wuerde bei der
 * Verteilung in die Kontextzeilen deren Werte ueberschreiben.
 */
function parseList(value: FormDataEntryValue | null, max: number) {
  const items = [
    ...new Set(
      String(value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ].slice(0, max);
  return items.length ? items : null;
}

function parseText(value: FormDataEntryValue | null, max: number) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, max);
}

/**
 * Der eine Ort, an dem Identitaet bearbeitet wird. Von hier verteilt der
 * Trigger aus 20260907180000 die Werte in Basis-, Discovery- und
 * Connect-Profil, damit ein hier geaenderter Name auch dort ankommt, wo
 * andere Menschen ihn sehen.
 */
export async function saveIdentityAction(formData: FormData) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/login?next=/profile");

  const remoteMode = String(formData.get("remote_mode") ?? "").trim();

  const { error } = await client
    .from("person_core")
    .update({
      display_name: parseText(formData.get("display_name"), 80),
      headline: parseText(formData.get("headline"), 160),
      bio: parseText(formData.get("bio"), 1200),
      location_region: parseText(formData.get("location_region"), 120),
      remote_mode: REMOTE_MODES.includes(remoteMode) ? remoteMode : null,
      expertise: parseList(formData.get("expertise"), 8),
      industries: parseList(formData.get("industries"), 5),
    })
    .eq("user_id", user.id);

  if (error) {
    // Der Kern ist permissiv, die Veroeffentlichung ist streng. Wer ein
    // aktives Connect-Profil hat und eine Angabe unter die dort geforderte
    // Mindestlaenge kuerzt, bekommt die Aenderung abgewiesen. Das ist
    // gewollt - die Alternative waere ein stiller Widerspruch zwischen Kern
    // und veroeffentlichtem Profil. Der Fall braucht aber eine eigene
    // Meldung, sonst liest er sich wie ein technischer Fehler.
    const published = error.message.includes("active_complete");
    revalidatePath("/profile");
    redirect(`/profile?error=${published ? "published_incomplete" : "save"}`);
  }

  revalidatePath("/profile");
  redirect("/profile?saved=identity");
}
