"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  NARRATIVE_MAX_LENGTH,
  NARRATIVE_MIN_LENGTH,
  parseApplicationLevel,
  parseCapabilityDisclosure,
  parseOwnershipWish,
} from "./capabilityTypes";

async function context() {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/login?next=/profile");
  return { client, user };
}

// Rueckgabetyp `never` ist notwendig, nicht kosmetisch: redirect() bricht den
// Kontrollfluss ab, aber TypeScript leitet fuer Funktionsdeklarationen kein
// `never` ab. Ohne die Annotation haelt der Compiler den Code nach jedem
// back()-Aufruf fuer erreichbar.
function back(step: string, error?: string): never {
  revalidatePath("/profile");
  redirect(`/profile?step=${step}${error ? `&error=${error}` : ""}`);
}

/**
 * Schritt 1 des Snapshots: eine erzaehlte Sache, die die Person selbst
 * hinbekommen hat, getaggt auf einen Bereich und eine Anwendungsstufe.
 *
 * Der Beleg haengt am Eintrag, weil er genau diese Einstufung begruendet.
 */
export async function saveCapabilityEvidenceAction(formData: FormData) {
  const { client, user } = await context();
  const narrative = String(formData.get("narrative") ?? "").trim();
  const areaId = String(formData.get("area_id") ?? "").trim();
  const level = parseApplicationLevel(formData.get("application_level"));

  if (narrative.length < NARRATIVE_MIN_LENGTH || narrative.length > NARRATIVE_MAX_LENGTH) {
    back("evidence", "narrative");
  }
  if (!areaId) back("evidence", "area");

  // Der Eintrag muss existieren, bevor der Beleg daran haengen kann. Eine
  // vorhandene Stufe wird nur ueberschrieben, wenn jetzt eine angegeben ist -
  // leer heisst leer, nicht Stufe 1.
  const existing = await client
    .from("person_capability_entries")
    .select("id,application_level")
    .eq("user_id", user.id)
    .eq("area_id", areaId)
    .maybeSingle();

  let entryId = existing.data?.id ?? null;

  if (entryId) {
    if (level !== null) {
      const { error } = await client
        .from("person_capability_entries")
        .update({ application_level: level })
        .eq("id", entryId);
      if (error) back("evidence", "save");
    }
  } else {
    const inserted = await client
      .from("person_capability_entries")
      .insert({ user_id: user.id, area_id: areaId, application_level: level })
      .select("id")
      .single();
    if (inserted.error) back("evidence", inserted.error.message.includes("area_id") ? "area" : "save");
    entryId = inserted.data.id;
  }

  const { error } = await client
    .from("person_capability_evidence")
    .insert({ entry_id: entryId, narrative });
  if (error) back("evidence", "save");

  back("areas");
}

/**
 * Schritt 2: die restlichen Bereiche auswaehlen.
 *
 * Abgewaehlte Bereiche werden nur entfernt, wenn kein Beleg daran haengt.
 * Eine erzaehlte Sache verschwindet nicht durch das Entfernen eines Hakens -
 * dafuer braucht es einen ausdruecklichen Schritt.
 */
export async function saveCapabilityAreasAction(formData: FormData) {
  const { client, user } = await context();
  const selected = new Set(
    formData
      .getAll("area_id")
      .map((value) => String(value).trim())
      .filter(Boolean)
  );

  const existing = await client
    .from("person_capability_entries")
    .select("id,area_id,person_capability_evidence(id)")
    .eq("user_id", user.id);
  if (existing.error) back("areas", "save");

  const rows = (existing.data ?? []) as {
    id: string;
    area_id: string;
    person_capability_evidence: { id: string }[] | null;
  }[];
  const known = new Map(rows.map((row) => [row.area_id, row]));

  const toInsert = [...selected]
    .filter((areaId) => !known.has(areaId))
    .map((areaId) => ({ user_id: user.id, area_id: areaId }));

  const toDelete = rows
    .filter((row) => !selected.has(row.area_id) && (row.person_capability_evidence ?? []).length === 0)
    .map((row) => row.id);

  if (toInsert.length) {
    const { error } = await client.from("person_capability_entries").insert(toInsert);
    if (error) back("areas", error.message.includes("area_id") ? "area" : "save");
  }
  if (toDelete.length) {
    const { error } = await client.from("person_capability_entries").delete().in("id", toDelete);
    if (error) back("areas", "save");
  }

  back("ownership");
}

/**
 * Schritt 3: der Ownership-Wunsch pro Bereich.
 *
 * Bewusst gefragt als "was moechtest du nicht dauerhaft verantworten" - das
 * ist die Frage, die Foundern sonst niemand stellt. Ein leeres Feld bleibt
 * leer; es gibt keinen Default-Wunsch.
 */
export async function saveCapabilityOwnershipAction(formData: FormData) {
  const { client, user } = await context();

  const existing = await client
    .from("person_capability_entries")
    .select("id,area_id,ownership_wish")
    .eq("user_id", user.id);
  if (existing.error) back("ownership", "save");

  const rows = (existing.data ?? []) as { id: string; area_id: string; ownership_wish: string | null }[];

  for (const row of rows) {
    const wish = parseOwnershipWish(formData.get(`ownership_${row.area_id}`));
    if (wish === row.ownership_wish) continue;
    const { error } = await client
      .from("person_capability_entries")
      .update({ ownership_wish: wish })
      .eq("id", row.id);
    if (error) back("ownership", "save");
  }

  revalidatePath("/profile");
  redirect("/profile?saved=snapshot");
}

/** Entfernt einen erzaehlten Beleg. Der Eintrag selbst bleibt bestehen. */
export async function deleteCapabilityEvidenceAction(formData: FormData) {
  const { client } = await context();
  const evidenceId = String(formData.get("evidence_id") ?? "").trim();
  if (!evidenceId) back("evidence", "save");

  // RLS laesst nur eigene Belege loeschen; ein fremder Wert traegt hier nicht.
  const { error } = await client.from("person_capability_evidence").delete().eq("id", evidenceId);
  if (error) back("evidence", "save");

  revalidatePath("/profile");
  redirect("/profile?saved=evidence_removed");
}

/**
 * Die Freigabestufe. Eigene Aktion und eigener Abschnitt, weil es eine eigene
 * Entscheidung ist: was ich eingetragen habe und wie weit ich es weitergebe
 * sind zwei Fragen.
 */
export async function saveCapabilityDisclosureAction(formData: FormData) {
  const { client, user } = await context();
  const level = parseCapabilityDisclosure(formData.get("capability_disclosure"));

  const { error } = await client
    .from("person_core")
    .update({ capability_disclosure: level })
    .eq("user_id", user.id);
  if (error) {
    revalidatePath("/profile");
    redirect("/profile?error=save");
  }

  revalidatePath("/profile");
  redirect("/profile?saved=disclosure");
}
