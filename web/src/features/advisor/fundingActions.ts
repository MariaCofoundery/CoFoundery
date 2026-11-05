"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadFunding } from "@/features/advisor/fundingData";
import { getOrgTeamPrograms } from "@/features/advisor/teamProgramData";
import { grantOf, isEventKind, isRequirementKind, isRequirementMeasure, MEASURES_OF_KIND } from "@/features/advisor/fundingModel";
import { teamraumHref } from "@/features/advisor/teamraumRoutes";

/**
 * Foerderauflagen schreiben. Wer darf, prueft die Datenbank (20270314120000): Foerderung, Auflagen
 * und festgehaltene Staende die Fuehrung, Nachweise jedes Mitglied (fuer ein Team nur, wer es sieht).
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const uuidOrNull = (value: FormDataEntryValue | null) => {
  const text = String(value ?? "").trim();
  return UUID.test(text) ? text : null;
};
const dateOrNull = (value: FormDataEntryValue | null) => {
  const text = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
};
const numberOrNull = (value: FormDataEntryValue | null) => {
  const text = String(value ?? "").trim().replace(",", ".");
  return /^\d{1,6}(\.\d{1,2})?$/.test(text) ? Number(text) : null;
};

/** Zurueck in den Reiter - zusammengesetzt, nie eine uebergebene Adresse. */
function backTo(formData: FormData, extra: Record<string, string> = {}) {
  const orgId = uuidOrNull(formData.get("orgId"));
  if (!orgId) return "/advisor/organisation";
  const params = new URLSearchParams({ org: orgId, tab: "funding" });
  const grantId = uuidOrNull(formData.get("grantId"));
  if (grantId) params.set("grant", grantId);
  for (const [key, value] of Object.entries(extra)) params.set(key, value);
  return `/advisor/organisation?${params.toString()}`;
}

async function requireUser(next: string) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect(`/login?next=${encodeURIComponent(next)}`);
  return client;
}

const errorOf = (message: string | undefined) =>
  /owner_required/.test(message ?? "")
    ? "owner"
    : /team_needed/.test(message ?? "")
      ? "team"
      : /program_not_visible/.test(message ?? "")
        ? "program"
        : /org_funding_invalid/.test(message ?? "")
          ? "invalid"
          : "failed";

function finish(path: string) {
  revalidatePath("/advisor/organisation");
  redirect(path);
}

export async function saveGrantAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  const grantId = uuidOrNull(formData.get("grantId"));
  const { data, error } = await client.rpc("save_org_grant", {
    p_grant_id: grantId,
    p_org_id: uuidOrNull(formData.get("orgId")),
    p_name: String(formData.get("name") ?? "").slice(0, 160),
    p_funder: String(formData.get("funder") ?? "").slice(0, 160),
    p_reference: String(formData.get("reference") ?? "").slice(0, 80),
    p_starts_on: dateOrNull(formData.get("startsOn")),
    p_ends_on: dateOrNull(formData.get("endsOn")),
    p_notes: String(formData.get("notes") ?? "").slice(0, 2000),
  });
  if (error) finish(backTo(formData, { fundingError: errorOf(error.message), ...(grantId ? {} : { newGrant: "1" }) }));
  finish(backTo(formData, { grant: String(data ?? grantId ?? ""), fundingSaved: "1" }));
}

export async function deleteGrantAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  const { error } = await client.rpc("delete_org_grant", { p_grant_id: uuidOrNull(formData.get("grantId")) });
  if (error) finish(backTo(formData, { fundingError: errorOf(error.message) }));
  const orgId = uuidOrNull(formData.get("orgId"));
  finish(orgId ? `/advisor/organisation?${new URLSearchParams({ org: orgId, tab: "funding", fundingDeleted: "1" }).toString()}` : "/advisor/organisation");
}

export async function saveRequirementAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  const kind = formData.get("kind");
  const measure = formData.get("measure");
  const safeKind = isRequirementKind(kind) ? kind : "once";
  // Eine Zaehlung, die nicht zur Art passt, wird "von Hand" - die Datenbank wuerde sie ablehnen.
  const safeMeasure = isRequirementMeasure(measure) && MEASURES_OF_KIND[safeKind].includes(measure) ? measure : "manual";
  const eventKind = formData.get("eventKind");
  const { error } = await client.rpc("save_org_requirement", {
    p_requirement_id: uuidOrNull(formData.get("requirementId")),
    p_grant_id: uuidOrNull(formData.get("grantId")),
    p_title: String(formData.get("title") ?? "").slice(0, 200),
    p_kind: safeKind,
    p_measure: safeMeasure,
    p_event_kind: (safeMeasure === "events" || safeMeasure === "event_attendance") && isEventKind(eventKind) ? eventKind : null,
    p_target: safeKind === "once" ? null : numberOrNull(formData.get("target")),
    p_unit: String(formData.get("unit") ?? "").slice(0, 40),
    p_due_on: dateOrNull(formData.get("dueOn")),
    p_notes: String(formData.get("notes") ?? "").slice(0, 2000),
    p_format_id: (safeMeasure === "events" || safeMeasure === "event_attendance") && uuidOrNull(formData.get("formatId")) ? uuidOrNull(formData.get("formatId")) : null,
  });
  finish(backTo(formData, error ? { fundingError: errorOf(error.message) } : { fundingSaved: "1" }));
}

export async function deleteRequirementAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  const { error } = await client.rpc("delete_org_requirement", { p_requirement_id: uuidOrNull(formData.get("requirementId")) });
  finish(backTo(formData, error ? { fundingError: errorOf(error.message) } : { fundingSaved: "1" }));
}

export async function addRequirementEntryAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  const { error } = await client.rpc("add_org_requirement_entry", {
    p_requirement_id: uuidOrNull(formData.get("requirementId")),
    p_program_id: uuidOrNull(formData.get("programId")),
    p_done_on: dateOrNull(formData.get("doneOn")) ?? new Date().toISOString().slice(0, 10),
    p_amount: numberOrNull(formData.get("amount")) ?? 1,
    p_note: String(formData.get("note") ?? "").slice(0, 1000),
  });
  finish(backTo(formData, error ? { fundingError: errorOf(error.message) } : { fundingSaved: "1" }));
}

export async function deleteRequirementEntryAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  const { error } = await client.rpc("delete_org_requirement_entry", { p_entry_id: uuidOrNull(formData.get("entryId")) });
  finish(backTo(formData, error ? { fundingError: errorOf(error.message) } : {}));
}

/** Eine einmalige Auflage als Aufgabe aufs Board - und gleich dorthin. */
export async function requirementTaskAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  const { data, error } = await client.rpc("create_org_task_for_requirement", { p_requirement_id: uuidOrNull(formData.get("requirementId")) });
  const orgId = uuidOrNull(formData.get("orgId"));
  if (error || !orgId || typeof data !== "string") finish(backTo(formData, { fundingError: "failed" }));
  finish(`${teamraumHref("tasks", orgId as string, { task: data as string })}#task-detail`);
}

/** Den Bericht so ablegen, wie er gerade ist. Gerechnet wird hier, mit denselben Daten wie im Reiter. */
export async function takeFundingSnapshotAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  const grantId = uuidOrNull(formData.get("grantId"));
  const orgId = uuidOrNull(formData.get("orgId"));
  const { data: grantRow } = grantId ? await client.from("advisor_org_grants").select("id, org_id, name, funder, reference, starts_on, ends_on, notes").eq("id", grantId).maybeSingle() : { data: null };
  if (!grantRow || !orgId) finish(backTo(formData, { fundingError: "failed" }));
  const programs = await getOrgTeamPrograms(client, orgId as string);
  const teamNames = new Map(programs.map((program) => [program.programId, program.teamName ?? ""]));
  const { report } = await loadFunding(client, grantOf(grantRow as Record<string, unknown>), teamNames, new Date().toISOString().slice(0, 10));
  const { error } = await client.rpc("save_org_funding_snapshot", { p_grant_id: grantId, p_note: String(formData.get("note") ?? "").slice(0, 500), p_data: report });
  finish(backTo(formData, error ? { fundingError: errorOf(error.message) } : { fundingSnapshot: "1" }));
}

export async function deleteFundingSnapshotAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  const { error } = await client.rpc("delete_org_funding_snapshot", { p_snapshot_id: uuidOrNull(formData.get("snapshotId")) });
  finish(backTo(formData, error ? { fundingError: errorOf(error.message) } : {}));
}
