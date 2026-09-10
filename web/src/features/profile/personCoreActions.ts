"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseIdentityReturnPath } from "@/features/profile/identityReadiness";
import { createClient } from "@/lib/supabase/server";

const REMOTE_MODES = ["onsite", "hybrid", "remote", "flexible"];
// Muss mit PROFILE_ROLE_OPTIONS uebereinstimmen; ein Test vergleicht beide.
const PROFILE_ROLES: string[] = ["founder", "advisor"];

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
  // Wohin es danach zurueckgeht, wenn jemand von Connect oder Discovery
  // hierher geschickt wurde. Ohne diesen Rueckweg endet der Weg zur
  // Identitaet in einer Sackgasse: Die Kontextseite schickt einen hierher,
  // und von hier fuehrt nichts zurueck.
  const returnPath = parseIdentityReturnPath(formData.get("next"));
  const back = (query: string) =>
    `/profile?${query}${returnPath ? `&next=${encodeURIComponent(returnPath)}` : ""}`;

  const { error, count } = await client
    .from("person_core")
    .update(
      {
        display_name: parseText(formData.get("display_name"), 80),
        headline: parseText(formData.get("headline"), 160),
        bio: parseText(formData.get("bio"), 1200),
        location_region: parseText(formData.get("location_region"), 120),
        remote_mode: REMOTE_MODES.includes(remoteMode) ? remoteMode : null,
        expertise: parseList(formData.get("expertise"), 8),
        industries: parseList(formData.get("industries"), 5),
      },
      // Ohne count koennte diese Aktion "Gespeichert" melden, ohne etwas
      // geschrieben zu haben: Ein update ohne passende Zeile ist fuer
      // PostgREST kein Fehler. Der Trigger aus 20260907120000 legt die Zeile
      // fuer jedes neue Konto an, aber ein stiller Erfolg wiegt schwerer als
      // die Wahrscheinlichkeit, dass sie fehlt.
      { count: "exact" }
    )
    .eq("user_id", user.id);

  if (!error && count === 0) {
    revalidatePath("/profile");
    redirect(back("error=save"));
  }

  if (error) {
    // Der Kern ist permissiv, die Veroeffentlichung ist streng. Wer ein
    // aktives Connect-Profil hat und eine Angabe unter die dort geforderte
    // Mindestlaenge kuerzt, bekommt die Aenderung abgewiesen. Das ist
    // gewollt - die Alternative waere ein stiller Widerspruch zwischen Kern
    // und veroeffentlichtem Profil. Der Fall braucht aber eine eigene
    // Meldung, sonst liest er sich wie ein technischer Fehler.
    const published = error.message.includes("active_complete");
    revalidatePath("/profile");
    redirect(back(`error=${published ? "published_incomplete" : "save"}`));
  }

  await saveRoles(client, user.id, formData, returnPath);

  revalidatePath("/profile");
  // Der Rueckweg wird nicht automatisch genommen. Wer von Connect kommt, hat
  // hier vielleicht noch mehr vor - der Weg zurueck steht als Knopf da, statt
  // die Person wegzuschicken.
  redirect(back("saved=identity"));
}

/**
 * Rollen liegen auf `profiles`, nicht im Kern: Der Kern traegt, wer jemand
 * ist, nicht wozu die Person auf der Plattform gehoert.
 *
 * Rollen sind eine Navigationsangabe, keine Berechtigung. Wer "Advisor"
 * anhakt, bekommt das Advisor-Dashboard zu sehen; was darauf erscheint,
 * entscheidet weiterhin RLS ueber `advisor_user_id`. Ein Haken hier oeffnet
 * also keine fremden Daten - deshalb darf die Person das selbst aendern.
 *
 * Das Feld erscheint nur bei Menschen, die schon eine dieser Rollen haben,
 * und wird hier nur angefasst, wenn das Formular es mitgeschickt hat. Sonst
 * wuerde ein Speichern aus einem Formular ohne diesen Abschnitt die Rollen
 * loeschen.
 */
async function saveRoles(
  client: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  formData: FormData,
  returnPath: string | null
) {
  const back = (query: string) =>
    `/profile?${query}${returnPath ? `&next=${encodeURIComponent(returnPath)}` : ""}`;

  if (!formData.has("roles")) return;

  const roles = [
    ...new Set(
      formData
        .getAll("roles")
        .map((value) => String(value).trim().toLowerCase())
        .filter((value) => PROFILE_ROLES.includes(value))
    ),
  ];

  // Ohne Rolle greift die Weiche in resolveProductEntryPath nicht mehr und
  // die Person landet beim naechsten Login auf /start - aus dem Produkt
  // geworfen durch zwei abgewaehlte Haken. Das wird abgewiesen, statt es
  // stillschweigend zu tun.
  if (roles.length === 0) {
    revalidatePath("/profile");
    redirect(back("error=roles"));
  }

  const { error } = await client.from("profiles").update({ roles }).eq("user_id", userId);
  if (error) {
    revalidatePath("/profile");
    redirect(back("error=save"));
  }
}
