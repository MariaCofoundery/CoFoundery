"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CONNECT_PHOTO_BUCKET,
  connectValuesForBasePhoto,
  removeConnectPhotoIfOwned,
} from "@/features/connect/connectBasePhoto";
import { decodePhotoData } from "@/features/connect/connectPhotoData";
import { parseIdentityReturnPath } from "@/features/profile/identityReadiness";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import { createClient } from "@/lib/supabase/server";

/**
 * "Wo dein Foto zu sehen ist" - speichert die beiden Entscheidungen in einem Schritt, am selben
 * Ort wie das Foto selbst:
 *
 *   1. Sichtbar fuer FIND und andere Mitglieder (`person_core.photo_visible_to_members`).
 *   2. Foto fuer Connect (nur mit bestehendem Connect-Profil): dasselbe Foto als Kopie, ein eigenes
 *      Bild nur fuer Connect, oder keins.
 *
 * Es wird NICHTS veroeffentlicht und kein Connect-Profil angelegt oder aktiviert - nur die Bildfelder
 * einer bestehenden Zeile aendern sich. Das Original im privaten Eimer wird nie angefasst.
 */
async function uploadConnectPhoto(client: Awaited<ReturnType<typeof createClient>>, userId: string, value: string) {
  const decoded = decodePhotoData(value);
  if (!decoded) return null;
  const extension = decoded.mimeType === "image/png" ? "png" : decoded.mimeType === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/${Date.now()}-${randomUUID()}.${extension}`;
  const { error } = await client.storage.from(CONNECT_PHOTO_BUCKET).upload(path, decoded.buffer, { contentType: decoded.mimeType, upsert: false });
  return error ? null : path;
}

export async function savePhotoUsageAction(formData: FormData) {
  const returnPath = parseIdentityReturnPath(formData.get("next"));
  const base = returnPath ?? "/profile?step=identity";
  const back = (query: string) => `${base}${base.includes("?") ? "&" : "?"}${query}`;

  const client = await createClient();
  const { data: auth } = await client.auth.getUser();
  const user = auth.user;
  if (!user) redirect(`/login?next=${encodeURIComponent(base)}`);

  // 1. FIND und Mitglieder.
  const { error: visibilityError, count } = await client
    .from("person_core")
    .update({ photo_visible_to_members: formData.get("photo_visible_to_members") === "yes" }, { count: "exact" })
    .eq("user_id", user.id);
  if (visibilityError || count === 0) redirect(back("error=save"));

  // 2. Connect - nur, wenn das Formular die Wahl mitgeschickt hat (es gibt ein Connect-Profil).
  const choice = String(formData.get("photo_choice") ?? "");
  if (choice === "none" || choice === "existing" || choice === "upload") {
    const current = await client
      .from("network_profiles")
      .select("photo_path,public_slug")
      .eq("user_id", user.id)
      .maybeSingle();
    if (current.error || !current.data) redirect(back("error=save"));

    let values: Record<string, string | null> = {};
    let newPath: string | null = null;
    if (choice === "none") {
      values = { photo_source: null, photo_avatar_id: null, photo_path: null };
    } else if (choice === "existing") {
      const basics = await getProfileBasicsRow(client, user.id).catch(() => null);
      const reused = await connectValuesForBasePhoto(client, user.id, basics);
      if (!reused.photo_source) redirect(back("error=photo_reuse"));
      values = { ...reused };
      newPath = reused.photo_path ?? null;
    } else {
      const upload = await uploadConnectPhoto(client, user.id, String(formData.get("photo_image_data") ?? ""));
      if (!upload) redirect(back("error=photo_upload"));
      values = { photo_source: "network_upload", photo_avatar_id: null, photo_path: upload };
      newPath = upload;
    }

    const { error } = await client.from("network_profiles").update(values).eq("user_id", user.id);
    if (error) {
      await removeConnectPhotoIfOwned(client, user.id, newPath);
      redirect(back("error=save"));
    }
    const oldPath = (current.data.photo_path as string | null)?.trim() || null;
    if (oldPath && oldPath !== newPath) await removeConnectPhotoIfOwned(client, user.id, oldPath);
    const slug = current.data.public_slug as string | null;
    if (slug) revalidatePath(`/connect/p/${slug}`);
  }

  for (const path of ["/profile", "/me/profile", "/connect", "/connect/profile", "/discovery/profile", "/dashboard"]) revalidatePath(path);
  redirect(back("saved=photo_usage"));
}
