"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/features/moderation/access";
import { radarRoot, signalInput, sourceInput, uuid } from "@/features/problem-radar/model";
import { withCollectorDb } from "@/features/problem-radar/collector/pgCollectorDb";
import { runRadarCollection } from "@/features/problem-radar/collector/runCollection";

function identity(form: FormData) {
  const id = form.get("id");
  const revision = Number(form.get("revision"));
  if (id && (!uuid(id) || !Number.isSafeInteger(revision) || revision < 1)) redirect(`${radarRoot}?result=invalid`);
  return { p_id: id || null, p_revision: id ? revision : null };
}
function failure(code: string | undefined, destination: string): never {
  redirect(`${destination}?result=${code === "40001" ? "conflict" : "invalid"}`);
}
export async function saveRadarSourceAction(form: FormData) {
  const client = await requirePlatformAdmin();
  const { data, error } = await client.rpc("save_radar_source", { ...identity(form), p_input: sourceInput(form) });
  if (error) failure(error.code, `${radarRoot}/sources`);
  revalidatePath(radarRoot, "layout");
  redirect(`${radarRoot}/sources?source=${data}&result=saved`);
}
export async function reviewRadarSourceAction(form: FormData) {
  const client = await requirePlatformAdmin();
  const { error } = await client.rpc("review_radar_source", { ...identity(form), p_permission: form.get("permission_state"), p_status: form.get("status"), p_due: form.get("review_due_at") || null });
  if (error) failure(error.code, `${radarRoot}/sources`);
  revalidatePath(radarRoot, "layout");
  redirect(`${radarRoot}/sources?result=saved`);
}
export async function saveRadarSignalAction(form: FormData) {
  const client = await requirePlatformAdmin();
  const input = signalInput(form);
  if (!input) redirect(`${radarRoot}?result=invalid`);
  const { data, error } = await client.rpc("save_radar_signal", { ...identity(form), p_input: input });
  if (error) failure(error.code, radarRoot);
  // Kam der Fund aus dem Kandidatenfach, ist er damit uebernommen.
  const candidate = form.get("candidate_id");
  if (uuid(candidate)) await client.rpc("review_radar_candidate", { p_id: candidate, p_action: "take" });
  revalidatePath(radarRoot, "layout");
  redirect(`${radarRoot}/signals/${data.id}?result=${data.duplicate ? "duplicate" : "saved"}`);
}
export async function reviewRadarSignalAction(form: FormData) {
  const client = await requirePlatformAdmin();
  const keys = identity(form);
  const { error } = await client.rpc("review_radar_signal", { ...keys, p_action: form.get("action"), p_reason: form.get("reason") || "manual_review" });
  const destination = uuid(keys.p_id) ? `${radarRoot}/signals/${keys.p_id}` : radarRoot;
  if (error) failure(error.code, destination);
  revalidatePath(radarRoot, "layout");
  redirect(`${destination}?result=saved`);
}
export async function purgeRadarAction() {
  const client = await requirePlatformAdmin();
  const { error } = await client.rpc("purge_radar_expired");
  if (error) failure(error.code, radarRoot);
  revalidatePath(radarRoot, "layout");
  redirect(`${radarRoot}?result=purged`);
}

const candidates = `${radarRoot}/candidates`;
export async function reviewRadarCandidateAction(form: FormData) {
  const client = await requirePlatformAdmin();
  const id = form.get("id");
  if (!uuid(id)) redirect(`${candidates}?result=invalid`);
  const { error } = await client.rpc("review_radar_candidate", { p_id: id, p_action: "dismiss" });
  if (error) failure(error.code, candidates);
  revalidatePath(radarRoot, "layout");
  redirect(`${candidates}?result=saved`);
}
export async function setRadarCollectionAction(form: FormData) {
  const client = await requirePlatformAdmin();
  const { error } = await client.rpc("set_radar_collection_enabled", { p_enabled: form.get("enabled") === "on" });
  if (error) failure(error.code, candidates);
  revalidatePath(radarRoot, "layout");
  redirect(`${candidates}?result=saved`);
}
export async function saveRadarSourceCollectionAction(form: FormData) {
  const client = await requirePlatformAdmin();
  const keys = identity(form);
  const adapter = String(form.get("collection_adapter") ?? "");
  const queries = String(form.get("collection_queries") ?? "").split("\n").map((line) => line.trim()).filter(Boolean);
  const { error } = await client.rpc("save_radar_source_collection", { ...keys, p_adapter: adapter || null, p_queries: queries });
  if (error) failure(error.code, `${radarRoot}/sources`);
  revalidatePath(radarRoot, "layout");
  redirect(`${radarRoot}/sources?source=${keys.p_id}&result=saved`);
}
/** "Jetzt scannen": derselbe Lauf wie der Wochenlauf, mit einer Stunde Mindestabstand statt sechs Tagen. */
export async function runRadarScanAction() {
  await requirePlatformAdmin();
  let destination = `${candidates}?scan=error`;
  try {
    const result = await withCollectorDb((db) => runRadarCollection({ db, minGapSeconds: 3600 }));
    if (result === "not_configured") destination = `${candidates}?scan=notconfigured`;
    else if (result.sources === 0) destination = `${candidates}?scan=none`;
    else destination = `${candidates}?scan=${result.failed ? "partial" : "ok"}&added=${result.added}`;
  } catch {
    destination = `${candidates}?scan=error`;
  }
  revalidatePath(radarRoot, "layout");
  redirect(destination);
}
