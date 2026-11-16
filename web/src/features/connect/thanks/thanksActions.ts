"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { runThanksNotifications } from "./thanksNotifications";
import { parseDirectThanksForm, parseThanksForm, thanksHref } from "./thanksModel";

const CONTACTS = "/connect/contacts";

export async function sendThanksAction(formData: FormData) {
  const { client } = await requireConnectMember(CONTACTS);
  const parsed = parseThanksForm(formData);
  const id = String(formData.get("conversation_id") ?? "").trim();
  if (!parsed) redirect(`/connect/danke/${encodeURIComponent(id)}?error=invalid`);
  const { error } = await client.rpc("send_network_thanks", {
    p_conversation_id: parsed.conversationId, p_help_types: parsed.helpTypes, p_outcome: parsed.outcome ?? "", p_body: parsed.body ?? "", p_show: parsed.show,
  });
  if (error) redirect(`${CONTACTS}?error=thanks`);
  await runThanksNotifications().catch(() => null);
  revalidatePath(CONTACTS);
  redirect(`${CONTACTS}?changed=thanked`);
}

export async function setThanksHiddenAction(formData: FormData) {
  const { client } = await requireConnectMember(CONTACTS);
  const id = String(formData.get("id") ?? "").trim();
  const hidden = formData.get("hidden") === "1";
  if (!id) redirect(`${CONTACTS}?error=thanks`);
  const { error } = await client.rpc("set_network_thanks_hidden", { p_thanks_id: id, p_hidden: hidden });
  if (error) redirect(`${CONTACTS}?error=thanks`);
  revalidatePath(CONTACTS);
  redirect(`${CONTACTS}?changed=${hidden ? "thanks_hidden" : "thanks_shown"}`);
}

/** Dank ohne Gespraech. Fehler kommen als Schluessel zurueck, damit die Seite sagen kann, was los ist. */
export async function sendDirectThanksAction(formData: FormData) {
  const { client } = await requireConnectMember(CONTACTS);
  const parsed = parseDirectThanksForm(formData);
  const helper = String(formData.get("helper_user_id") ?? "").trim();
  const via = String(formData.get("via") ?? "person");
  const viaId = String(formData.get("via_id") ?? "").trim();
  const back = (error: string) => {
    const base = thanksHref(helper, via === "listing" || via === "problem" || via === "venture" ? via : "person", viaId);
    redirect(`${base}${base.includes("?") ? "&" : "?"}error=${error}`);
  };
  if (!parsed) back("invalid");
  const { error } = await client.rpc("send_network_thanks_direct", {
    p_helper_user_id: parsed!.helperUserId, p_via_kind: parsed!.via, p_via_id: parsed!.viaId, p_help_types: parsed!.helpTypes,
    p_outcome: parsed!.outcome ?? "", p_body: parsed!.body ?? "", p_show: parsed!.show,
  });
  if (error) back(error.message.includes("thanks_recent") ? "recent" : error.message.includes("thanks_limit") ? "limit" : "failed");
  await runThanksNotifications().catch(() => null);
  revalidatePath(CONTACTS);
  redirect(`/connect/people/${encodeURIComponent(parsed!.helperUserId)}?thanked=1`);
}
