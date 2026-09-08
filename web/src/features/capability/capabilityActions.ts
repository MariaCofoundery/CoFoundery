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
import { analyzeNarrativeWithRules } from "./narrativeAnalysis";

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
function back(step: string, error?: string, notice?: string): never {
  revalidatePath("/profile");
  const query = [error ? `error=${error}` : null, notice ? `notice=${notice}` : null]
    .filter(Boolean)
    .join("&");
  redirect(`/profile?step=${step}${query ? `&${query}` : ""}`);
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
  const level = parseApplicationLevel(formData.get("application_level"));

  if (narrative.length < NARRATIVE_MIN_LENGTH || narrative.length > NARRATIVE_MAX_LENGTH) {
    back("evidence", "narrative");
  }

  // Das System ordnet zu, nicht die Person. Sie soll erzaehlen, nicht
  // klassifizieren - die manuelle Bereichsauswahl hat den Blick auf
  // Arbeitsbereiche verengt, obwohl es um Staerken geht.
  const analysis = await analyzeNarrativeWithRules({ narrative, locale: "de" });

  // Erkennt die Analyse nichts, wandert die Erzaehlung in den Auffangwert
  // statt verloren zu gehen. Das ist ehrlicher als eine schlechte Zuordnung,
  // und haeufende Eintraege dort sind das Signal, die Begriffe zu ueberarbeiten.
  const suggested = analysis.areas.length ? analysis.areas.map((area) => area.areaId) : ["other"];
  const primary = suggested[0];

  const existing = await client
    .from("person_capability_entries")
    .select("id,area_id")
    .eq("user_id", user.id)
    .in("area_id", suggested);
  if (existing.error) back("evidence", "save");

  const known = new Map((existing.data ?? []).map((row) => [row.area_id as string, row.id as string]));
  const missing = suggested.filter((areaId) => !known.has(areaId));

  if (missing.length) {
    const inserted = await client
      .from("person_capability_entries")
      .insert(missing.map((areaId) => ({ user_id: user.id, area_id: areaId })))
      .select("id,area_id");
    if (inserted.error) back("evidence", "save");
    for (const row of inserted.data ?? []) {
      known.set(row.area_id as string, row.id as string);
    }
  }

  const primaryEntryId = known.get(primary);
  if (!primaryEntryId) back("evidence", "save");

  // Die Stufe gilt fuer den Bereich, dem die Erzaehlung zugeordnet wurde.
  // Eine vorhandene wird nur ueberschrieben, wenn jetzt eine angegeben ist -
  // leer heisst leer, nicht Stufe 1.
  if (level !== null) {
    const { error } = await client
      .from("person_capability_entries")
      .update({ application_level: level })
      .eq("id", primaryEntryId);
    if (error) back("evidence", "save");
  }

  const { error } = await client
    .from("person_capability_evidence")
    .insert({ entry_id: primaryEntryId, narrative });
  if (error) back("evidence", "save");

  // Zur Bestaetigung: die vorgeschlagenen Bereiche stehen dort schon
  // angehakt, die Person kann sie aendern.
  back("areas", undefined, analysis.areas.length ? "recognised" : "unmatched");
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
