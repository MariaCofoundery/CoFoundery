"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getProfileBasicsRow, upsertProfileBasicsRow } from "@/features/profile/profileData";
import { normalizeAvatarId } from "@/features/profile/avatarLibrary";
import { createClient } from "@/lib/supabase/server";
import { normalizeProfileRoles } from "@/features/profile/profileRoles";
import { randomUUID } from "node:crypto";

const ALLOWED_INTENTIONS = ["Suche", "Partner-Match", "Selbsttest"] as const;

function normalizeRedirectTarget(value: FormDataEntryValue | null, fallback: string) {
  const normalized = String(value ?? "").trim();
  if (!normalized.startsWith("/")) {
    return fallback;
  }
  if (normalized.startsWith("//")) {
    const sanitized = `/${normalized.replace(/^\/+/, "")}`;
    return sanitized.length > 1 ? sanitized : fallback;
  }
  return normalized;
}

function withError(path: string, error: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}error=${encodeURIComponent(error)}`;
}

function parseDisplayName(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim().slice(0, 80);
  return normalized;
}

function parseFocusSkill(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().slice(0, 80);
}

function parseIntention(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return ALLOWED_INTENTIONS.includes(normalized as (typeof ALLOWED_INTENTIONS)[number])
    ? normalized
    : "";
}

function parseRoles(formData: FormData) {
  const primaryRole = String(formData.get("primaryRole") ?? "").trim().toLowerCase();
  if (primaryRole === "both") {
    return normalizeProfileRoles(["founder", "advisor"]);
  }

  if (primaryRole.length > 0) {
    return normalizeProfileRoles(primaryRole);
  }

  return normalizeProfileRoles(formData.getAll("roles"));
}

function parseAvatarId(value: FormDataEntryValue | null) {
  return normalizeAvatarId(typeof value === "string" ? value : null);
}

function parseAvatarImageUrl(value: FormDataEntryValue | null) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return null;
  if (normalized.startsWith("data:image/")) {
    return normalized;
  }
  return null;
}

function parseStoredAvatarPath(value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  if (!normalized.startsWith("avatars/")) {
    return null;
  }

  const objectPath = normalized.slice("avatars/".length);
  return objectPath.length > 0 ? objectPath : null;
}

function sanitizeExistingAvatarUrl(value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  if (!normalized || normalized.startsWith("data:image/")) {
    return null;
  }
  return normalized;
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

async function uploadAvatarToStorage(
  supabase: Awaited<ReturnType<typeof createClient>>,
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

async function deleteStoredAvatarIfOwned(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  avatarUrl: string | null | undefined
) {
  const objectPath = parseStoredAvatarPath(avatarUrl);
  if (!objectPath || !objectPath.startsWith(`${userId}/`)) {
    return;
  }

  await supabase.storage.from("avatars").remove([objectPath]);
}

export async function upsertProfileBasicsAction(formData: FormData) {
  const successRedirectTo = normalizeRedirectTarget(formData.get("onSuccessRedirectTo"), "/dashboard");
  const errorRedirectTo = normalizeRedirectTarget(formData.get("onErrorRedirectTo"), successRedirectTo);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect(`/login?next=${encodeURIComponent(successRedirectTo)}`);
  }

  const displayName = parseDisplayName(formData.get("displayName"));
  const focusSkill = parseFocusSkill(formData.get("focusSkill"));
  const intention = parseIntention(formData.get("intention"));
  const roles = parseRoles(formData);
  const avatarId = parseAvatarId(formData.get("avatarId"));
  const avatarImageUrl = parseAvatarImageUrl(formData.get("avatarImageUrl"));

  if (!displayName || !focusSkill || !intention) {
    redirect(withError(errorRedirectTo, "profile_basics_incomplete"));
  }

  const existingProfile = await getProfileBasicsRow(supabase, user.id).catch(() => null);
  const previousAvatarUrl = sanitizeExistingAvatarUrl(existingProfile?.avatar_url ?? null);
  let nextAvatarUrl = avatarId ? null : previousAvatarUrl;
  let avatarToDeleteAfterSave: string | null = null;

  if (avatarImageUrl) {
    const upload = await uploadAvatarToStorage(supabase, user.id, avatarImageUrl);
    if (upload.error || !upload.path) {
      redirect(withError(errorRedirectTo, upload.error ?? "avatar_upload_failed"));
    }

    nextAvatarUrl = upload.path;
    avatarToDeleteAfterSave =
      previousAvatarUrl && previousAvatarUrl !== upload.path ? previousAvatarUrl : null;
  } else if (avatarId && previousAvatarUrl) {
    nextAvatarUrl = null;
    avatarToDeleteAfterSave = previousAvatarUrl;
  }

  const { error } = await upsertProfileBasicsRow(supabase, {
    user_id: user.id,
    display_name: displayName,
    focus_skill: focusSkill,
    intention,
    roles,
    avatar_id: avatarId,
    avatar_url: nextAvatarUrl,
    headline: existingProfile?.headline ?? null,
    experience: existingProfile?.experience ?? null,
    skills: existingProfile?.skills ?? null,
    linkedin_url: existingProfile?.linkedin_url ?? null,
    imported_at: existingProfile?.imported_at ?? null,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    if (avatarImageUrl && nextAvatarUrl) {
      await deleteStoredAvatarIfOwned(supabase, user.id, nextAvatarUrl);
    }
    redirect(withError(errorRedirectTo, error.message ?? "profile_save_failed"));
  }

  if (avatarToDeleteAfterSave) {
    await deleteStoredAvatarIfOwned(supabase, user.id, avatarToDeleteAfterSave);
  }

  const currentMetadataAvatarUrl =
    typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;

  if (currentMetadataAvatarUrl?.startsWith("data:image/")) {
    const { error: authMetadataError } = await supabase.auth.updateUser({
      data: {
        avatar_url: null,
      },
    });

    if (authMetadataError) {
      redirect(withError(errorRedirectTo, authMetadataError.message ?? "profile_avatar_sync_failed"));
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/founder-alignment/workbook");
  revalidatePath(successRedirectTo);

  redirect(successRedirectTo);
}
