import "server-only";

import { randomUUID } from "node:crypto";

import { normalizeAvatarId } from "@/features/profile/avatarLibrary";
import { parseStoredAvatarPath } from "@/features/profile/avatarStorage";
import type { createClient } from "@/lib/supabase/server";

/**
 * Das Basisfoto in Connect - als Kopie, nie als Verweis auf das Original.
 *
 * ---------------------------------------------------------------------------
 * ZWEI EIMER, ZWEI PUBLIKA
 * ---------------------------------------------------------------------------
 *
 *   avatars                  das Original. Ausgeliefert nur, wenn die Person
 *                            `photo_visible_to_members` gesetzt hat
 *                            (`can_read_member_photo`).
 *   network-profile-images   was Connect zeigt. Ausgeliefert an
 *                            Connect-Mitglieder, sobald das Profil aktiv ist
 *                            (`can_read_network_profile_photo`).
 *
 * Connect auf das Original zeigen zu lassen hiesse: Die Connect-Freigabe
 * oeffnet den privaten Eimer. Statt dessen bekommt Connect eine EIGENE Datei -
 * erst, wenn jemand dort ausdruecklich „mein vorhandenes Profilfoto verwenden"
 * waehlt. Privates Basisfoto = Original, bewusste Connect-Freigabe =
 * Kontextkopie.
 *
 * Anonyme oeffentliche Seiten zeigen weiterhin KEIN Bild, auch diese Kopie
 * nicht - Produktentscheidung vom 07.09.2026, Migration
 * `20260907200000_remove_public_photo_delivery`.
 *
 * ---------------------------------------------------------------------------
 * WORAN MAN DIE KOPIE ERKENNT
 * ---------------------------------------------------------------------------
 *
 * An `photo_source = 'profile_avatar'` mit gesetztem `photo_path`. Eine
 * Illustration hat `photo_avatar_id` und keinen Pfad; ein eigenes Connect-Bild
 * hat `photo_source = 'network_upload'`. Keine neue Spalte, keine Bildtabelle.
 *
 * Und daran haengt die wichtigste Regel: Der Nachzug fasst NUR Zeilen mit
 * `profile_avatar` an. Ein eigenes Connect-Bild wird nie ueberschrieben und
 * nie geloescht.
 */

type Client = Awaited<ReturnType<typeof createClient>>;

export const CONNECT_PHOTO_BUCKET = "network-profile-images";

/** Was der Connect-Eimer annimmt - GIF gehoert nicht dazu. */
const CONNECT_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type ConnectBasePhotoValues = {
  photo_source: "profile_avatar" | null;
  photo_avatar_id: string | null;
  photo_path: string | null;
};

/**
 * Legt die Connect-Kopie eines eigenen Basisfotos an.
 *
 * Gibt den neuen Pfad im Connect-Eimer zurueck, oder `null`, wenn es kein
 * eigenes Bild dieser Person ist oder das Kopieren misslingt. Der Praefix wird
 * hier selbst geprueft, wie in `deleteStoredAvatarIfOwned`: Eine Kopie, die
 * sich nur auf die Zeilensicherheit verlaesst, kopiert beim naechsten Umbau
 * vielleicht das Bild eines anderen Menschen.
 */
export async function copyBasePhotoToConnect(
  client: Client,
  userId: string,
  avatarUrl: string | null | undefined
): Promise<string | null> {
  const source = parseStoredAvatarPath(avatarUrl);
  if (!source || !source.startsWith(`${userId}/`)) return null;

  const { data, error } = await client.storage.from("avatars").download(source);
  if (error || !data) return null;

  const mimeType = data.type || "image/jpeg";
  const extension = CONNECT_EXTENSIONS[mimeType];
  if (!extension) return null;

  const path = `${userId}/${Date.now()}-${randomUUID()}.${extension}`;
  const upload = await client.storage
    .from(CONNECT_PHOTO_BUCKET)
    .upload(path, await data.arrayBuffer(), { contentType: mimeType, upsert: false });
  return upload.error ? null : path;
}

/** Loescht eine Datei im Connect-Eimer - nur unter dem eigenen Praefix. */
export async function removeConnectPhotoIfOwned(
  client: Client,
  userId: string,
  path: string | null | undefined
) {
  const normalized = (path ?? "").trim();
  if (!normalized || !normalized.startsWith(`${userId}/`)) return;
  await client.storage.from(CONNECT_PHOTO_BUCKET).remove([normalized]);
}

/**
 * Welche Connect-Felder das aktuelle Basisfoto ergibt.
 *
 *   Illustration    profile_avatar · photo_avatar_id · kein Pfad
 *   eigenes Bild    profile_avatar · neue Kopie      · keine Kennung
 *   keins / Fehler  alles leer
 *
 * „Fehler" heisst bewusst leer und nicht „die alte Kopie behalten": Wer sein
 * Foto ersetzt, will das alte nicht mehr zeigen.
 */
export async function connectValuesForBasePhoto(
  client: Client,
  userId: string,
  base: { avatar_id?: string | null; avatar_url?: string | null } | null
): Promise<ConnectBasePhotoValues> {
  const avatarId = normalizeAvatarId(base?.avatar_id ?? null);
  if (avatarId) {
    return { photo_source: "profile_avatar", photo_avatar_id: avatarId, photo_path: null };
  }
  const copy = await copyBasePhotoToConnect(client, userId, base?.avatar_url);
  if (copy) {
    return { photo_source: "profile_avatar", photo_avatar_id: null, photo_path: copy };
  }
  return { photo_source: null, photo_avatar_id: null, photo_path: null };
}

/**
 * Connect zieht nach, wenn sich das Basisfoto aendert - und nur dort, wo
 * Connect das Basisfoto benutzt.
 *
 * Die Richtung stimmt: Die kanonische Quelle traegt ihre Aenderung nach
 * aussen, so wie `propagate_person_core_to_context_rows` es fuer Name und Bio
 * tut. Connect schreibt nichts auf `profiles` zurueck.
 *
 * Ein misslungener Nachzug darf das Speichern des eigenen Bildes nicht kosten -
 * deshalb wirft diese Funktion nicht. Neu laden lassen (`revalidatePath`) muss
 * die aufrufende Aktion. Eine gerade angelegte Kopie, deren Zeile
 * nicht geschrieben wurde, wird wieder entfernt.
 */
export async function syncConnectBasePhoto(
  client: Client,
  userId: string,
  base: { avatar_id?: string | null; avatar_url?: string | null } | null
) {
  try {
    const { data: row } = await client
      .from("network_profiles")
      .select("photo_path")
      .eq("user_id", userId)
      .eq("photo_source", "profile_avatar")
      .maybeSingle();
    if (!row) return;

    const next = await connectValuesForBasePhoto(client, userId, base);
    const { error } = await client
      .from("network_profiles")
      .update(next)
      .eq("user_id", userId)
      .eq("photo_source", "profile_avatar");
    if (error) {
      await removeConnectPhotoIfOwned(client, userId, next.photo_path);
      return;
    }

    const previous = (row.photo_path as string | null) ?? null;
    if (previous && previous !== next.photo_path) {
      await removeConnectPhotoIfOwned(client, userId, previous);
    }
  } catch {
    // Connect zeigt dann kurz das alte - beim naechsten Speichern dort wird es
    // ohnehin neu gesetzt.
  }
}
