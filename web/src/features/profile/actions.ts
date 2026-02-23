"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_FOCUS_SKILLS = ["Tech", "Sales", "Marketing", "Product", "Operations", "Finance"] as const;
const ALLOWED_INTENTIONS = ["Suche", "Partner-Match", "Selbsttest"] as const;

function normalizeRedirectTarget(value: FormDataEntryValue | null, fallback: string) {
  const normalized = String(value ?? "").trim();
  if (!normalized.startsWith("/")) {
    return fallback;
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
  const normalized = String(value ?? "").trim();
  return ALLOWED_FOCUS_SKILLS.includes(normalized as (typeof ALLOWED_FOCUS_SKILLS)[number])
    ? normalized
    : "";
}

function parseIntention(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return ALLOWED_INTENTIONS.includes(normalized as (typeof ALLOWED_INTENTIONS)[number])
    ? normalized
    : "";
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

  if (!displayName || !focusSkill || !intention) {
    redirect(withError(errorRedirectTo, "profile_basics_incomplete"));
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      display_name: displayName,
      focus_skill: focusSkill,
      intention,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    redirect(withError(errorRedirectTo, error.message));
  }

  redirect(successRedirectTo);
}
