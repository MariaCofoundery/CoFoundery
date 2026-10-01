"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { normalizeAvatarId } from "@/features/profile/avatarLibrary";
import {
  deleteStoredAvatarIfOwned,
  uploadAvatarToStorage,
} from "@/features/profile/avatarStorage";
import { syncConnectBasePhoto } from "@/features/connect/connectBasePhoto";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Das persönliche Foto — an der Stelle, an der alle anderen Basisangaben
 * stehen.
 *
 * ---------------------------------------------------------------------------
 * ES KONNTE BISHER NUR IM EINSTIEG GEÄNDERT WERDEN
 * ---------------------------------------------------------------------------
 *
 * Hochgeladen wurde es in `ProfileBasicsForm`, dem Einstiegsassistenten. Unter
 * „Über dich" stand zwar die Frage, ob andere Mitglieder es sehen dürfen —
 * aber kein Bild und kein Weg, es zu ändern. Ein Haken für etwas, das man
 * dort weder sieht noch anfassen kann.
 *
 * ---------------------------------------------------------------------------
 * DIE QUELLE BLEIBT, WO SIE IST
 * ---------------------------------------------------------------------------
 *
 * `profiles.avatar_id` und `profiles.avatar_url` — und das ist keine
 * Verlegenheitslösung, sondern die dokumentierte Architektur: `person_core`
 * trägt die Identität, `profiles` trägt Rollen und Avatar (siehe den Bericht
 * zu Phase 1.5). Das Foto ist dort kein Abbild von irgendetwas, sondern das
 * Original.
 *
 * Deshalb keine neue Spalte in `person_core`. Sie hätte die
 * Auslieferungsroute, die Freigabe-RPC `list_member_photos`, den
 * Speicherpfad, Connect und den Einstieg betroffen — für dieselbe Datei an
 * einem anderen Ort.
 *
 * ---------------------------------------------------------------------------
 * DREI WEGE, UND JEDER SCHREIBT GENAU ZWEI SPALTEN
 * ---------------------------------------------------------------------------
 *
 *   eigenes Bild    avatar_url = "avatars/<id>/…",  avatar_id = null
 *   Illustration    avatar_id  = "avatar-07",       avatar_url = null
 *   keins           beide null
 *
 * Sie schliessen sich aus: Zwei gesetzte Felder hiessen zwei Bilder, und
 * welches gilt, entschiede dann die Lesereihenfolge.
 *
 * ERSETZEN HEISST: DIE ALTE DATEI GEHT. Sonst sammeln sich im Eimer die
 * Bilder, die niemand mehr sieht und niemand mehr löschen kann.
 */

const ZURUECK = "/profile?step=identity";

function zurueck(query: string): never {
  revalidatePath("/profile");
  revalidatePath("/me/profile");
  // Connect kann das Basisfoto als Kopie tragen - siehe `syncConnectBasePhoto`.
  revalidatePath("/connect", "layout");
  redirect(`${ZURUECK}&${query}#foto`);
}

async function kontext() {
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(ZURUECK)}`);
  return { user, client: await createClient() };
}

/**
 * Connect zieht nach, wenn es das Basisfoto benutzt - siehe
 * `features/connect/connectBasePhoto.ts`. Eine Illustration wird als Kennung
 * uebernommen, ein eigenes Bild als eigene Kopie im Connect-Eimer; ein eigenes
 * Connect-Bild (`network_upload`) bleibt unberuehrt.
 */
/** Was gerade gespeichert ist - gebraucht, um die alte Datei loszuwerden. */
async function aktuellesBild(client: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await client
    .from("profiles")
    .select("avatar_url")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.avatar_url as string | null) ?? null;
}

export async function saveProfilePhotoAction(formData: FormData): Promise<void> {
  const { user, client } = await kontext();
  const vorher = await aktuellesBild(client, user.id);

  // Eine Illustration aus der Bibliothek.
  const avatarId = normalizeAvatarId(String(formData.get("avatar_id") ?? "") || null);
  if (avatarId) {
    const { error } = await client
      .from("profiles")
      .update({ avatar_id: avatarId, avatar_url: null })
      .eq("user_id", user.id);
    if (error) zurueck("error=photo_save");

    await syncConnectBasePhoto(client, user.id, { avatar_id: avatarId, avatar_url: null });
    await deleteStoredAvatarIfOwned(client, user.id, vorher);
    zurueck("saved=photo");
  }

  // Oder ein eigenes Bild. Es kommt als Daten-URL an, im Browser auf 320 px
  // verkleinert - siehe `avatarImage.ts`.
  const dataUrl = String(formData.get("avatar_image") ?? "");
  if (!dataUrl.startsWith("data:image/")) zurueck("error=photo_empty");

  const { path, error: uploadFehler } = await uploadAvatarToStorage(client, user.id, dataUrl);
  if (!path) {
    zurueck(uploadFehler === "avatar_too_large" ? "error=photo_too_large" : "error=photo_save");
  }

  const { error } = await client
    .from("profiles")
    .update({ avatar_url: path, avatar_id: null })
    .eq("user_id", user.id);
  if (error) {
    // Die Zeile ist nicht geschrieben - dann darf die gerade hochgeladene
    // Datei auch nicht liegen bleiben.
    await deleteStoredAvatarIfOwned(client, user.id, path);
    zurueck("error=photo_save");
  }

  // Nutzt Connect das Basisfoto, bekommt es eine neue Kopie - und die alte
  // Kopie verschwindet. Erst danach das alte Original.
  await syncConnectBasePhoto(client, user.id, { avatar_id: null, avatar_url: path });
  await deleteStoredAvatarIfOwned(client, user.id, vorher);
  zurueck("saved=photo");
}

/**
 * Entfernen heisst entfernen.
 *
 * Die Zeile verliert beide Felder UND die Datei verschwindet aus dem Eimer.
 * Ein Bild, das nur aus der Anzeige genommen wird, ist nicht gelöscht - und
 * genau das würde jemand annehmen, der hier klickt.
 */
export async function removeProfilePhotoAction(): Promise<void> {
  const { user, client } = await kontext();
  const vorher = await aktuellesBild(client, user.id);

  const { error } = await client
    .from("profiles")
    .update({ avatar_url: null, avatar_id: null })
    .eq("user_id", user.id);
  if (error) zurueck("error=photo_save");

  await syncConnectBasePhoto(client, user.id, null);
  await deleteStoredAvatarIfOwned(client, user.id, vorher);
  zurueck("saved=photo_removed");
}
