"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireConnectMember } from "@/features/connect/connectAccess";
import {
  CONNECT_CATEGORIES,
  CONNECT_DIRECTIONS,
  CONNECT_GEOGRAPHIC_SCOPES,
  CONNECT_REMOTE_MODES,
  isOneOf,
} from "@/features/connect/connectTypes";

/**
 * Eine Suche speichern, aendern, loeschen.
 *
 * Gespeichert wird, was gerade eingegrenzt ist - die Person muss ihre
 * Kriterien nicht ein zweites Mal eingeben. Ein Name ist Pflicht, weil eine
 * Liste aus "Suche 1, Suche 2, Suche 3" nach drei Wochen niemandem mehr sagt,
 * wonach da gesucht wird.
 */

function parseList(value: FormDataEntryValue | null, max: number) {
  return [
    ...new Set(
      String(value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ].slice(0, max);
}

function optional<T extends string>(value: FormDataEntryValue | null, allowed: readonly T[]) {
  const candidate = String(value ?? "").trim();
  return isOneOf(allowed, candidate) ? candidate : null;
}

export async function saveConnectSearchAction(formData: FormData) {
  const { client, user } = await requireConnectMember("/connect");

  const label = String(formData.get("label") ?? "").trim();
  if (label.length < 2 || label.length > 80) {
    redirect("/connect?error=search_label");
  }

  const { error } = await client.from("saved_searches").insert({
    user_id: user.id,
    context: "connect",
    label,
    query: String(formData.get("q") ?? "").trim().slice(0, 200),
    topics: parseList(formData.get("topics"), 8),
    industries: parseList(formData.get("industries"), 5),
    locations: parseList(formData.get("locations"), 3),
    geographic_scope: optional(formData.get("geographic_scope"), CONNECT_GEOGRAPHIC_SCOPES),
    remote_mode: optional(formData.get("remote_mode"), CONNECT_REMOTE_MODES),
    capability_area_ids: [
      ...new Set(
        formData
          .getAll("capability_area_ids")
          .map((value) => String(value).trim())
          .filter((value) => value.length > 0 && value.length <= 64)
      ),
    ].slice(0, 8),
    connect_direction: optional(formData.get("direction"), CONNECT_DIRECTIONS),
    connect_category: optional(formData.get("category"), CONNECT_CATEGORIES),
    include_listings: formData.get("include_listings") !== null,
    include_problems: formData.get("include_problems") !== null,
  });

  if (error) {
    // Eine Suche ohne ein einziges Kriterium waere ein Abonnement auf alles -
    // die Datenbank laesst sie nicht zu, und die Meldung sagt warum.
    redirect(
      `/connect?error=${error.message.includes("not_empty") ? "search_empty" : "save"}`
    );
  }

  revalidatePath("/connect/searches");
  redirect("/connect/searches?saved=created");
}

export async function setConnectSearchNotifyAction(formData: FormData) {
  const { client } = await requireConnectMember();
  const id = String(formData.get("search_id") ?? "").trim();
  const notify = String(formData.get("notify") ?? "") === "true";

  const { error } = await client.from("saved_searches").update({ notify }).eq("id", id);
  if (error) redirect("/connect/searches?error=save");

  revalidatePath("/connect/searches");
  redirect("/connect/searches");
}

export async function deleteConnectSearchAction(formData: FormData) {
  const { client } = await requireConnectMember();
  const id = String(formData.get("search_id") ?? "").trim();

  const { error } = await client.from("saved_searches").delete().eq("id", id);
  if (error) redirect("/connect/searches?error=save");

  revalidatePath("/connect/searches");
  redirect("/connect/searches?saved=deleted");
}
