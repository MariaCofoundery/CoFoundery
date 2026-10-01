import "server-only";

import { randomUUID } from "node:crypto";

import type { createClient } from "@/lib/supabase/server";

/**
 * Wo ein hochgeladenes Profilbild liegt - und wie es wieder verschwindet.
 *
 * HERAUSGELOEST AM 01.10.2026 aus `actions.ts`. Dort standen diese Wege seit
 * dem Einstiegsassistenten; seit das Foto auch unter „Ueber dich" aenderbar
 * ist, brauchen sie zwei Aktionen. Kopiert waeren es zwei Fassungen von
 * „ersetzen heisst: die alte Datei geht" - und eine davon wuerde irgendwann
 * vergessen.
 *
 * ---------------------------------------------------------------------------
 * DER EIMER IST PRIVAT, DER PFAD TRAEGT DIE PERSON
 * ---------------------------------------------------------------------------
 *
 * `avatars/<user-id>/<zeit>-<zufall>.<endung>` - und ausgeliefert wird ueber
 * `/api/profile/photo/...`, eine Route, die eine Sitzung verlangt. Vorher war
 * jede hochgeladene Datei ohne Anmeldung per Direkt-URL abrufbar.
 *
 * `deleteStoredAvatarIfOwned` prueft den Praefix noch einmal selbst: Eine
 * Loeschung, die sich nur auf die Zeilensicherheit verlaesst, loescht beim
 * naechsten Umbau vielleicht die Datei eines anderen Menschen.
 */

type Client = Awaited<ReturnType<typeof createClient>>;

export function parseStoredAvatarPath(value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  if (!normalized.startsWith("avatars/")) {
    return null;
  }

  const objectPath = normalized.slice("avatars/".length);
  return objectPath.length > 0 ? objectPath : null;
}

function decodeDataUrlImage(value: string) {
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  const mimeType = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length === 0) {
    return null;
  }

  return {
    mimeType,
    buffer,
  };
}

function extensionForMimeType(mimeType: string) {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

export async function uploadAvatarToStorage(
  supabase: Client,
  userId: string,
  dataUrl: string
) {
  const decoded = decodeDataUrlImage(dataUrl);
  if (!decoded) {
    return { path: null, error: "avatar_decode_failed" as const };
  }

  if (decoded.buffer.byteLength > 2 * 1024 * 1024) {
    return { path: null, error: "avatar_too_large" as const };
  }

  const extension = extensionForMimeType(decoded.mimeType);
  const filePath = `${userId}/${Date.now()}-${randomUUID()}.${extension}`;
  const result = await supabase.storage.from("avatars").upload(filePath, decoded.buffer, {
    contentType: decoded.mimeType,
    upsert: false,
  });

  if (result.error) {
    return { path: null, error: result.error.message ?? "avatar_upload_failed" as const };
  }

  return { path: `avatars/${filePath}`, error: null as string | null };
}

export async function deleteStoredAvatarIfOwned(
  supabase: Client,
  userId: string,
  avatarUrl: string | null | undefined
) {
  const objectPath = parseStoredAvatarPath(avatarUrl);
  if (!objectPath || !objectPath.startsWith(`${userId}/`)) {
    return;
  }

  await supabase.storage.from("avatars").remove([objectPath]);
}
