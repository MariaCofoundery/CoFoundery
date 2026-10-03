"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/features/moderation/access";
import { radarRoot, uuid } from "@/features/problem-radar/model";
import { hypothesisInput, handoffInput } from "@/features/problem-radar/hypotheses";
const root = `${radarRoot}/hypotheses`;
function identity(f: FormData, optional = false) {
  const id = f.get("id"),
    revision = Number(f.get("revision"));
  if (optional && !id) return { p_id: null, p_revision: null };
  if (!uuid(id) || !Number.isSafeInteger(revision) || revision < 1)
    redirect(`${root}?result=invalid`);
  return { p_id: id, p_revision: revision };
}
function failure(code?: string): never {
  redirect(`${root}?result=${code === "40001" ? "conflict" : "invalid"}`);
}
function done(id?: string): never {
  revalidatePath(radarRoot, "layout");
  redirect(`${root}${id ? `/${id}` : ""}?result=saved`);
}
export async function saveHypothesisAction(f: FormData) {
  const c = await requirePlatformAdmin();
  const { data, error } = await c.rpc("save_radar_hypothesis", {
    ...identity(f, true),
    p_input: hypothesisInput(f),
  });
  if (error) failure(error.code);
  done(data);
}
export async function linkHypothesisAction(f: FormData) {
  const c = await requirePlatformAdmin();
  const keys = identity(f);
  const [signal, revision] = String(f.get("signal") ?? "").split(":");
  if (!uuid(signal) || !Number.isSafeInteger(Number(revision))) failure();
  const { error } = await c.rpc("link_radar_hypothesis_signal", {
    ...keys,
    p_signal: signal,
    p_signal_revision: Number(revision),
    p_origin: String(f.get("origin") ?? "").trim() || null,
    p_remove: f.get("remove") === "true",
  });
  if (error) failure(error.code);
  done(keys.p_id!);
}
export async function reviewHypothesisAction(f: FormData) {
  const c = await requirePlatformAdmin();
  const keys = identity(f);
  const { error } = await c.rpc("review_radar_hypothesis", {
    ...keys,
    p_action: f.get("action"),
  });
  if (error) failure(error.code);
  done(keys.p_id!);
}
export async function handoffHypothesisAction(f: FormData) {
  const c = await requirePlatformAdmin();
  const input = handoffInput(f);
  if (!input?.p_confirm) failure();
  const { data, error } = await c.rpc("handoff_radar_hypothesis", input);
  if (error) failure(error.code);
  revalidatePath(radarRoot, "layout");
  revalidatePath("/connect/workspaces", "layout");
  redirect(`/connect/workspaces/${data}`);
}
export async function redactImportsAction(f: FormData) {
  const c = await requirePlatformAdmin();
  if (!uuid(f.get("signal")) || f.get("confirm") !== "on") failure();
  const { error } = await c.rpc("redact_radar_imports", {
    p_signal: f.get("signal"),
    p_confirm: true,
  });
  if (error) failure(error.code);
  revalidatePath(radarRoot, "layout");
  revalidatePath("/connect/workspaces", "layout");
  redirect(`${radarRoot}/imports?result=saved`);
}
export async function purgeHypothesesAction() {
  const c = await requirePlatformAdmin();
  const { error } = await c.rpc("purge_radar_hypotheses");
  if (error) failure(error.code);
  revalidatePath(radarRoot, "layout");
  redirect(`${root}?result=purged`);
}
