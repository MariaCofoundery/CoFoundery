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
  needsFounderRole,
  nextPathFor,
  parseJourneyPayload,
} from "@/features/profile/journey/journeyModel";
import { markOnboardingComplete } from "@/features/profile/onboardingCompletion";
import { getProfileBasicsRow, upsertProfileBasicsRow } from "@/features/profile/profileData";
import { createClient } from "@/lib/supabase/server";

const BACK = "/welcome/reise";

/**
 * Der Abschluss der Kartenreise.
 *
 * DERSELBE ENDZUSTAND WIE DER BISHERIGE EINSTIEG, nur ueber andere Fragen:
 *   - Align oder Find: `profiles` mit Rolle founder, Schwerpunkt und Absicht
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
export async function completeJourneyAction(formData: FormData) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect("/login?next=/welcome/reise");

  const payload = parseJourneyPayload(formData.get("payload"));
  if (!payload || payload.areas.length === 0) redirect(`${BACK}?error=areas`);
  if (payload.name.length < 1) redirect(`${BACK}?error=name`);

  if (needsFounderRole(payload.areas)) {
    const existing = await getProfileBasicsRow(client, user.id).catch(() => null);
    const { error } = await upsertProfileBasicsRow(client, {
      user_id: user.id,
      display_name: payload.name,
      focus_skill: focusSkillFor(payload.foci),
      intention: intentionFor(payload.areas),
      roles: ["founder"],
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

  revalidatePath("/dashboard");
  revalidatePath("/connect", "layout");

  const requested = normalizeNextPath(String(formData.get("next") ?? ""));
  // Ein eigenes Ziel (Einladung und Aehnliches) bleibt; sonst der erste Bereich.
  redirect(requested !== "/dashboard" ? requested : nextPathFor(payload));
}
