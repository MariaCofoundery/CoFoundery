"use server";

import { createHash, randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type EmailStatus = "sent" | "not_sent";

export type InviteActionResult =
  | {
      ok: true;
      sessionId: string;
      inviteUrl: string;
      emailStatus: EmailStatus;
    }
  | {
      ok: false;
      error: string;
    };

export type SentInvitationLinkActionResult =
  | {
      ok: true;
      invitationId: string;
      inviteUrl: string;
    }
  | {
      ok: false;
      reason: "not_authenticated" | "invalid_invitation_id" | "not_found" | "status_not_linkable" | "rotate_failed";
      error?: string;
    };

type MySessionResponseRow = {
  questionId: string;
  prompt: string;
  dimension: string | null;
  category: string | null;
  type: string | null;
  choiceValue: string;
  choiceLabel: string | null;
  sortOrder: number | null;
  answeredAt: string | null;
};

function normalizeEmail(value: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function normalizeDisplayName(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim().slice(0, 80);
  return normalized.length > 0 ? normalized : null;
}

function parseReportScope(value: FormDataEntryValue | null) {
  return value === "basis_plus_values" ? "basis_plus_values" : "basis";
}

function parseBooleanEntry(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "on" || normalized === "yes";
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function buildInviteUrl(token: string) {
  return `/join?token=${encodeURIComponent(token)}`;
}

function getSiteUrlOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
  if (!configured) return "";
  return configured.replace(/\/+$/, "");
}

function buildAbsoluteInviteUrl(token: string) {
  const relative = buildInviteUrl(token);
  const origin = getSiteUrlOrigin();
  return origin ? `${origin}${relative}` : relative;
}

async function createInvitation(params: {
  invitedEmail: string;
  label?: string | null;
  reportScope: "basis" | "basis_plus_values";
}): Promise<InviteActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false, error: "not_authenticated" };
  }

  const invitedEmail = normalizeEmail(params.invitedEmail);
  if (!invitedEmail || !invitedEmail.includes("@")) {
    return { ok: false, error: "ungueltige_email" };
  }

  const inviterEmail = normalizeEmail(user.email ?? null) || null;
  const { data: inviterProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .maybeSingle();
  const inviterDisplayName =
    (inviterProfile as { display_name?: string | null } | null)?.display_name?.trim() ||
    inviterEmail ||
    "Co-Founder";

  const token = randomBytes(24).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: invitation, error: inviteError } = await supabase
    .from("invitations")
    .insert({
      inviter_user_id: user.id,
      invitee_email: invitedEmail,
      label: params.label ?? invitedEmail,
      inviter_display_name: inviterDisplayName,
      inviter_email: inviterEmail,
      token_hash: tokenHash,
      expires_at: expiresAt,
      status: "sent",
    })
    .select("id")
    .single();

  if (inviteError || !invitation?.id) {
    return { ok: false, error: inviteError?.message ?? "invite_create_failed" };
  }

  const modules: Array<{ invitation_id: string; module: "base" | "values" }> =
    params.reportScope === "basis_plus_values"
      ? [
          { invitation_id: invitation.id, module: "base" },
          { invitation_id: invitation.id, module: "values" },
        ]
      : [{ invitation_id: invitation.id, module: "base" }];

  const { error: moduleError } = await supabase.from("invitation_modules").insert(modules);
  if (moduleError) {
    return { ok: false, error: moduleError.message };
  }

  return {
    ok: true,
    sessionId: invitation.id,
    inviteUrl: buildInviteUrl(token),
    emailStatus: "not_sent",
  };
}

export async function getSentInvitationLinkAction(
  invitationId: string
): Promise<SentInvitationLinkActionResult> {
  const normalizedInvitationId = invitationId.trim();
  if (!normalizedInvitationId) {
    return { ok: false, reason: "invalid_invitation_id" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false, reason: "not_authenticated" };
  }

  const { data: invitation, error: invitationError } = await supabase
    .from("invitations")
    .select("id, inviter_user_id, status")
    .eq("id", normalizedInvitationId)
    .maybeSingle();

  if (invitationError || !invitation || invitation.inviter_user_id !== user.id) {
    return { ok: false, reason: "not_found" };
  }

  if (invitation.status !== "sent" && invitation.status !== "opened") {
    return { ok: false, reason: "status_not_linkable" };
  }

  const token = randomBytes(24).toString("hex");
  const tokenHash = hashToken(token);
  const { error: rotateError } = await supabase
    .from("invitations")
    .update({
      token_hash: tokenHash,
      updated_at: new Date().toISOString(),
    })
    .eq("id", normalizedInvitationId)
    .eq("inviter_user_id", user.id);

  if (rotateError) {
    return {
      ok: false,
      reason: "rotate_failed",
      error: rotateError.message,
    };
  }

  return {
    ok: true,
    invitationId: normalizedInvitationId,
    inviteUrl: buildAbsoluteInviteUrl(token),
  };
}

export async function createSessionAction() {
  redirect("/dashboard?error=session_flow_disabled_use_invitations");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function updateDisplayNameAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect("/login");
  }

  const displayName = normalizeDisplayName(formData.get("displayName"));
  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      display_name: displayName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function saveProfileOnboardingAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect("/login");
  }

  const focusSkill = String(formData.get("focusSkill") ?? "").trim();
  const intention = String(formData.get("intention") ?? "").trim();

  if (!focusSkill || !intention) {
    redirect("/dashboard?error=onboarding_incomplete");
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      focus_skill: focusSkill,
      intention,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function inviteParticipantBAction(formData: FormData): Promise<InviteActionResult> {
  const invitedEmail = String(formData.get("invitedEmail") ?? "");
  const reportScope = parseReportScope(formData.get("reportScope"));
  return createInvitation({ invitedEmail, reportScope });
}

export async function deleteArchivedSessionAction(_formData: FormData) {
  redirect("/dashboard?error=legacy_sessions_disabled");
}

export async function deleteSessionAction(_sessionId: string): Promise<{ ok: boolean; error?: string }> {
  return { ok: false, error: "legacy_sessions_disabled" };
}

export async function getMySessionResponsesAction(_sessionId: string): Promise<
  { ok: true; rows: MySessionResponseRow[]; role: string | null } | { ok: false; error: string }
> {
  return {
    ok: false,
    error: "legacy_responses_disabled",
  };
}

export async function restoreResponsesToSessionAction(
  _sourceSessionId: string,
  _targetSessionId: string
): Promise<{ ok: boolean; error?: string }> {
  return { ok: false, error: "legacy_responses_disabled" };
}

export async function createComparisonFromExistingAction(formData: FormData): Promise<InviteActionResult> {
  const invitedEmail = String(formData.get("invitedEmail") ?? "");
  const reportScope = parseReportScope(formData.get("reportScope"));
  return createInvitation({ invitedEmail, reportScope });
}

export async function createCoFounderInvitationAction(formData: FormData): Promise<InviteActionResult> {
  const invitedEmail = String(formData.get("invitedEmail") ?? "");
  const labelRaw = String(formData.get("label") ?? "").trim();
  const includeValues = parseBooleanEntry(formData.get("includeValues"));

  return createInvitation({
    invitedEmail,
    label: labelRaw.length > 0 ? labelRaw : null,
    reportScope: includeValues ? "basis_plus_values" : "basis",
  });
}
