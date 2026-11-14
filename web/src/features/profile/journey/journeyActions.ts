"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizeNextPath } from "@/features/auth/authRedirects";
import { writeDisplayNameToCore } from "@/features/profile/displayNameWrite";
import { writeInterests } from "@/features/profile/interestsData";
import {
  focusSkillFor,
  intentionFor,
  interestsFor,
  nextPathFor,
  parseJourneyPayload,
  parseSetupPayload,
  rolesFor,
} from "@/features/profile/journey/journeyModel";
import { markOnboardingComplete } from "@/features/profile/onboardingCompletion";
import { getProfileBasicsRow, upsertProfileBasicsRow } from "@/features/profile/profileData";
import { createClient } from "@/lib/supabase/server";

const BACK = "/welcome/reise";
const SETUP = "/welcome/profil";

/**
 * Der Abschluss der Kartenreise.
 *
 * DERSELBE ENDZUSTAND WIE DER BISHERIGE EINSTIEG, nur ueber andere Fragen:
 *   - Align oder Find: `profiles` mit Rolle founder, Advisor mit Rolle advisor
 *     (beides zusammen geht), dazu Schwerpunkt und Absicht
 *     (`upsertProfileBasicsAction`).
 *   - Nur Connect: KEINE profiles-Zeile. `profiles.roles` traegt
 *     `default '{founder}'`; eine Zeile anzulegen, um "keine Rolle"
 *     auszudruecken, machte die Person zur Founderin (siehe
 *     `completeConnectOnboardingAction`).
 *   - Der Kern (`person_core`): Name, Headline, Kurzvorstellung, Arbeitsmodus,
 *     Expertise.
 *   - Connect gewaehlt: Mitgliedschaft ueber `join_network_as_member`.
 *   - Interessen und die Markierung "eingefuehrt".
 *
 * NICHTS WIRD VEROEFFENTLICHT. Weder Find noch das Connect-Profil entstehen
 * hier; beides hat seine eigene ausdrueckliche Freigabe auf seiner Seite. Auch
 * die Fotosichtbarkeit wird nicht beruehrt.
 *
 * REIHENFOLGE: Erst alles Inhaltliche und die Mitgliedschaft, ZULETZT die
 * Markierung. Bricht es dazwischen ab, bekommt die Person den Einstieg noch
 * einmal - und landet nicht ohne Bereich ausserhalb des Produkts.
 */
async function finishJourney(formData: FormData, toSetup: boolean, withReminder: boolean) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect("/login?next=/welcome/reise");

  const payload = parseJourneyPayload(formData.get("payload"));
  if (!payload || payload.areas.length === 0) redirect(`${BACK}?error=areas`);
  if (payload.name.length < 1) redirect(`${BACK}?error=name`);

  // Rollen: Align oder Find machen zur Founderin, Advisor zum Advisor, beides geht.
  // Nur Connect: keine Rolle, also keine profiles-Zeile.
  const roles = rolesFor(payload.areas);
  if (roles.length > 0) {
    const existing = await getProfileBasicsRow(client, user.id).catch(() => null);
    const { error } = await upsertProfileBasicsRow(client, {
      user_id: user.id,
      display_name: payload.name,
      focus_skill: focusSkillFor(payload.foci),
      intention: intentionFor(payload.areas, payload.start),
      roles,
      avatar_id: existing?.avatar_id ?? null,
      avatar_url: existing?.avatar_url ?? null,
      headline: existing?.headline ?? null,
      experience: existing?.experience ?? null,
      skills: existing?.skills ?? null,
      linkedin_url: existing?.linkedin_url ?? null,
      imported_at: existing?.imported_at ?? null,
      updated_at: new Date().toISOString(),
    });
    if (error) redirect(`${BACK}?error=save`);
  }

  const nameWrite = await writeDisplayNameToCore(client, user.id, payload.name);
  if (!nameWrite.ok) redirect(`${BACK}?error=save`);

  // Nur, was ausgefuellt wurde: Ein leeres Feld darf eine schon vorhandene
  // Angabe nicht ueberschreiben (die Person kann das Konto schon haben).
  const core: Record<string, unknown> = {};
  if (payload.headline) core.headline = payload.headline;
  if (payload.bio) core.bio = payload.bio;
  if (payload.expertise.length > 0) core.expertise = payload.expertise;
  if (payload.where) core.remote_mode = payload.where;
  if (Object.keys(core).length > 0) {
    const { error, count } = await client
      .from("person_core")
      .update(core, { count: "exact" })
      .eq("user_id", user.id);
    if (error || count === 0) redirect(`${BACK}?error=save`);
  }

  if (payload.areas.includes("connect")) {
    const { data: joined, error: joinError } = await client.rpc("join_network_as_member");
    if (joinError || joined !== true) redirect(`${BACK}?error=join`);
  }

  await writeInterests(client, user.id, interestsFor(payload.areas));
  await markOnboardingComplete(client, user.id);
  // Die Zustimmung zu den zwei Erinnerungs-Mails steckt im Knopf, den die Person drueckt - neben ihm steht die Gegenwahl
  // "Ohne Erinnerungen". Beides ist eine ausdrueckliche Entscheidung, nichts ist vorangekreuzt.
  // Scheitert das, bleibt der Einstieg trotzdem abgeschlossen - eine Erinnerung ist kein Muss.
  if (withReminder) await client.rpc("set_onboarding_reminder", { p_wants: true });

  revalidatePath("/dashboard");
  revalidatePath("/connect", "layout");

  // Wer das Profil gleich einrichten will, geht dorthin; sonst bleibt ein eigenes Ziel (Einladung und
  // Aehnliches), sonst kommt der erste Bereich.
  if (toSetup) redirect(SETUP);
  const requested = normalizeNextPath(String(formData.get("next") ?? ""));
  redirect(requested !== "/dashboard" ? requested : nextPathFor(payload));
}

export async function completeJourneyAction(formData: FormData) {
  return finishJourney(formData, false, true);
}

/** Die ausdrueckliche Gegenwahl: derselbe Abschluss, aber ohne Erinnerungs-Mails. */
export async function completeJourneyWithoutReminderAction(formData: FormData) {
  return finishJourney(formData, false, false);
}

/** "Erst mein Profil einrichten": derselbe Abschluss, aber das Ziel ist die Liste der kleinen Schritte. */
export async function completeJourneyToSetupAction(formData: FormData) {
  return finishJourney(formData, true, true);
}

/**
 * Ein Schritt des Profil-Setups, sofort gespeichert.
 *
 * Wird vom Browser nach JEDER Karte aufgerufen (Weiter oder Ueberspringen), nicht erst am Ende - wer mitten
 * drin aufhoert, hat das Bisherige. Nur Felder aus dem Setup, nur was ausgefuellt wurde: ein leeres Feld
 * ueberschreibt nichts, und es wird nichts veroeffentlicht (Sichtbarkeit, Freigaben, Foto bleiben unberuehrt).
 */
export async function saveSetupProgressAction(rawPayload: string): Promise<{ ok: boolean }> {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) return { ok: false };
  const payload = parseSetupPayload(rawPayload);
  if (!payload) return { ok: false };

  const core: Record<string, unknown> = {};
  if (payload.headline) core.headline = payload.headline;
  if (payload.bio) core.bio = payload.bio;
  if (payload.expertise.length > 0) core.expertise = payload.expertise;
  if (payload.where) core.remote_mode = payload.where;
  if (Object.keys(core).length === 0) return { ok: true };

  const { error, count } = await client.from("person_core").update(core, { count: "exact" }).eq("user_id", user.id);
  if (error || count === 0) return { ok: false };
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Das Ende des Setups: noch einmal alles speichern (nur Gefuelltes), dann zur Uebersicht. */
export async function finishSetupAction(formData: FormData) {
  await saveSetupProgressAction(String(formData.get("payload") ?? ""));
  redirect("/dashboard");
}
