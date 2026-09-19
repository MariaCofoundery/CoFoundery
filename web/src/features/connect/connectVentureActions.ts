"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { decodePhotoData } from "@/features/connect/connectPhotoData";
import {
  VENTURE_AUDIENCE_MAX,
  VENTURE_AUDIENCE_MIN,
  VENTURE_MOTIVATION_MAX,
  VENTURE_MOTIVATION_MIN,
  VENTURE_NAME_MAX,
  VENTURE_NAME_MIN,
  VENTURE_WHAT_MAX,
  VENTURE_WHAT_MIN,
} from "@/features/connect/connectTypes";

const BUCKET = "network-profile-images";

/**
 * Unternehmen am Profil anlegen, aendern, verbergen, loeschen.
 *
 * Die Datenbank bleibt die Instanz - Laengen, die Fuenfergrenze und wer was
 * darf, stehen dort. Hier wird nur so viel geprueft, dass die Person eine
 * verstaendliche Meldung bekommt statt einer technischen.
 */

function back(error: string): never {
  revalidatePath("/connect/ventures");
  redirect(`/connect/ventures?error=${error}`);
}

function optional(value: FormDataEntryValue | null, min: number, max: number) {
  const text = String(value ?? "").trim().slice(0, max);
  // Unter der Mindestlaenge wird daraus leer statt einer Fehlermeldung: Wer
  // anfaengt zu schreiben und es sich anders ueberlegt, soll nicht haengen
  // bleiben. Die Bedingung in der Datenbank faengt den Rest ab.
  return text.length >= min ? text : null;
}

/**
 * Die Adresse des Unternehmens.
 *
 * GEAENDERT am 19.09.2026: Vorher gab diese Funktion bei einer unbrauchbaren
 * Eingabe `null` zurueck, und die Aktion speicherte still ohne Adresse. Wer
 * "http://meine-firma.de" eintrug - und http ist hier nicht erlaubt -, bekam
 * eine Erfolgsmeldung und ein leeres Feld. Man merkt so etwas erst Wochen
 * spaeter, wenn ueberhaupt.
 *
 * Jetzt sind "leer" und "unbrauchbar" zwei verschiedene Antworten.
 */
function parseWebsite(value: FormDataEntryValue | null): { ok: true; url: string | null } | { ok: false } {
  const text = String(value ?? "").trim().slice(0, 200);
  if (!text) return { ok: true, url: null };

  // Nur https: Ein http-Link auf einer https-Seite ist eine Browserwarnung
  // und ein schlechtes Bild fuer die Person.
  if (text.startsWith("http://")) return { ok: false };
  const withScheme = text.startsWith("https://") ? text : `https://${text}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return { ok: false };
  }
  // Ein Gastgebername ohne Punkt ist kein Ziel im Netz - "meine firma" wuerde
  // sonst als https://meine%20firma durchgehen.
  if (!parsed.hostname.includes(".") || parsed.hostname.endsWith(".")) return { ok: false };

  return { ok: true, url: parsed.toString() };
}

async function uploadLogo(
  client: Awaited<ReturnType<typeof requireConnectMember>>["client"],
  userId: string,
  value: string
) {
  const decoded = decodePhotoData(value);
  if (!decoded) return null;
  const extension =
    decoded.mimeType === "image/png" ? "png" : decoded.mimeType === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/venture-${Date.now()}-${randomUUID()}.${extension}`;
  const { error } = await client.storage
    .from(BUCKET)
    .upload(path, decoded.buffer, { contentType: decoded.mimeType, upsert: false });
  return error ? null : path;
}

export async function saveConnectVentureAction(formData: FormData) {
  const { client, user } = await requireConnectMember("/connect/ventures");
  const id = String(formData.get("venture_id") ?? "").trim();

  const name = String(formData.get("name") ?? "").trim().slice(0, VENTURE_NAME_MAX);
  const whatItDoes = String(formData.get("what_it_does") ?? "").trim().slice(0, VENTURE_WHAT_MAX);
  const audience = String(formData.get("audience") ?? "").trim().slice(0, VENTURE_AUDIENCE_MAX);

  if (name.length < VENTURE_NAME_MIN) back("venture_name");
  if (whatItDoes.length < VENTURE_WHAT_MIN) back("venture_what");
  if (audience.length < VENTURE_AUDIENCE_MIN) back("venture_audience");

  const website = parseWebsite(formData.get("website"));
  if (!website.ok) back("venture_website");

  const values = {
    name,
    role_label: optional(formData.get("role_label"), 2, VENTURE_NAME_MAX),
    what_it_does: whatItDoes,
    audience,
    motivation: optional(formData.get("motivation"), VENTURE_MOTIVATION_MIN, VENTURE_MOTIVATION_MAX),
    website: website.url,
  };

  const logoData = String(formData.get("logo_image_data") ?? "");
  let uploadedPath: string | null = null;
  if (logoData) {
    uploadedPath = await uploadLogo(client, user.id, logoData);
    if (!uploadedPath) back("venture_logo");
  }

  const { error } = id
    ? await client
        .from("network_ventures")
        .update({ ...values, ...(uploadedPath ? { logo_path: uploadedPath } : {}) })
        .eq("id", id)
        .eq("owner_user_id", user.id)
    : await client
        .from("network_ventures")
        .insert({ ...values, owner_user_id: user.id, logo_path: uploadedPath });

  if (error) {
    if (uploadedPath) await client.storage.from(BUCKET).remove([uploadedPath]);
    // Die Fuenfergrenze steht in der Datenbank, nicht nur in der Oberflaeche -
    // sie bekommt deshalb eine eigene Meldung statt "hat nicht geklappt".
    back(error.message.includes("venture_limit_reached") ? "venture_limit" : "save");
  }

  revalidatePath("/connect/ventures");
  revalidatePath("/connect/profile");
  redirect("/connect/ventures?saved=venture");
}

export async function setConnectVentureStatusAction(formData: FormData) {
  const { client, user } = await requireConnectMember();
  const id = String(formData.get("venture_id") ?? "").trim();
  const status = String(formData.get("status") ?? "") === "hidden" ? "hidden" : "active";

  const { error } = await client
    .from("network_ventures")
    .update({ status })
    .eq("id", id)
    .eq("owner_user_id", user.id);
  if (error) back("save");

  revalidatePath("/connect/ventures");
  redirect("/connect/ventures");
}

export async function deleteConnectVentureAction(formData: FormData) {
  const { client, user } = await requireConnectMember();
  const id = String(formData.get("venture_id") ?? "").trim();

  // Das Logo zuerst: Faellt die Zeile weg, ist der Pfad nicht mehr auffindbar
  // und die Datei bliebe fuer immer im Speicher liegen.
  const { data: existing } = await client
    .from("network_ventures")
    .select("logo_path")
    .eq("id", id)
    .eq("owner_user_id", user.id)
    .maybeSingle();
  const logoPath = (existing as { logo_path: string | null } | null)?.logo_path;

  const { error } = await client
    .from("network_ventures")
    .delete()
    .eq("id", id)
    .eq("owner_user_id", user.id);
  if (error) back("save");

  if (logoPath?.startsWith(`${user.id}/`)) {
    await client.storage.from(BUCKET).remove([logoPath]);
  }

  revalidatePath("/connect/ventures");
  redirect("/connect/ventures?saved=venture_deleted");
}
