"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getProfileBasicsRow, upsertProfileBasicsRow } from "@/features/profile/profileData";
import { normalizeAvatarId } from "@/features/profile/avatarLibrary";
import { writeDisplayNameToCore } from "@/features/profile/displayNameWrite";
import { markOnboardingComplete } from "@/features/profile/onboardingCompletion";
import { createClient } from "@/lib/supabase/server";
// Die Speicherwege liegen seit dem 01.10.2026 daneben: Das Formular unter
// „Ueber dich" benutzt dieselben, und zwei Fassungen von „alte Datei
// loeschen" waeren zwei verschiedene Regeln.
import {
  deleteStoredAvatarIfOwned,
  uploadAvatarToStorage,
} from "@/features/profile/avatarStorage";
import { normalizeProfileRoles } from "@/features/profile/profileRoles";

/**
 * Die bisherigen drei bleiben gueltig - Profile, die es schon gibt, tragen
 * sie. Dazu zwei fuer Advisor, denen keine der drei passte.
 */
const ALLOWED_INTENTIONS = [
  "Suche", "Partner-Match", "Selbsttest",
  "Begleiten", "Teamklaerung",
] as const;

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

function sanitizeExistingAvatarUrl(value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  if (!normalized || normalized.startsWith("data:image/")) {
    return null;
  }
  return normalized;
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

  // ---------------------------------------------------------------------------
  // DER NAME GEHOERT IN DEN KERN
  // ---------------------------------------------------------------------------
  //
  // Diese Aktion schreibt `profiles` weiter - sie traegt Rollen, Avatar,
  // Schwerpunkt und Absicht, und die liegen dort. Der NAME ist seit dem
  // 01.10.2026 etwas anderes: Er ist Identitaet, und die ist in `person_core`
  // kanonisch. Frueher trug ihn ein Trigger von `profiles` dorthin; jetzt
  // laeuft es andersherum.
  //
  // NACH dem Upsert und nicht davor: Wer gerade erst anfaengt, hat noch keine
  // `profiles`-Zeile, und die Propagation aus dem Kern legt keine an. Erst die
  // Zeile, dann der Kern - dann steht der Name an beiden Stellen.
  //
  // Ein Fehler hier ist dieselbe Art Fehler wie oben: Der Kern ist permissiv,
  // ein aktives Connect-Profil ist streng. Wer den Namen auf ein Zeichen
  // kuerzt, bekommt eine Abweisung statt eines stillen Widerspruchs.
  const coreName = await writeDisplayNameToCore(supabase, user.id, displayName);
  if (!coreName.ok) {
    redirect(withError(errorRedirectTo, coreName.reason));
  }

  if (avatarToDeleteAfterSave) {
    await deleteStoredAvatarIfOwned(supabase, user.id, avatarToDeleteAfterSave);
  }

  // Nur wenn das Formular aus dem Einstieg kommt. Dasselbe Formular bearbeitet
  // spaeter auch das Profil - ein Speichern dort ist kein Einstieg.
  if (formData.get("completesOnboarding") === "1") {
    await markOnboardingComplete(supabase, user.id);
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
