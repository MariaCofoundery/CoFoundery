"use server";

import { createHash, randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";
import { bindLatestSubmittedInvitationMatchingInputs } from "@/features/assessments/matchingBindings";
import { getRequestLocale } from "@/i18n/getLocale";
import { buildLocaleContinuationPath } from "@/i18n/localeContinuation";
import { sendCoFounderInviteEmail } from "@/lib/email/sendCoFounderInviteEmail";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";
import { createClient } from "@/lib/supabase/server";

type EmailStatus = "sent" | "not_sent";

export type InviteActionResult =
  | {
      ok: true;
      sessionId: string;
      inviteUrl: string;
      emailStatus: EmailStatus;
      emailError?: string;
      emailRecipient: string;
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

function parseTeamContextEntry(value: FormDataEntryValue | null): TeamContext | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "pre_founder") return "pre_founder";
  if (normalized === "existing_team") return "existing_team";
  return null;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function buildInviteUrl(token: string, locale: "de" | "en") {
  return buildLocaleContinuationPath(`/join?token=${encodeURIComponent(token)}`, locale);
}

function getSiteUrlOrigin() {
  return getPublicAppOrigin();
}

function buildAbsoluteInviteUrl(token: string, locale: "de" | "en") {
  const relative = buildInviteUrl(token, locale);
  const origin = getSiteUrlOrigin();
  return origin ? `${origin}${relative}` : relative;
}

async function createInvitation(params: {
  invitedEmail: string;
  label?: string | null;
  reportScope: "basis" | "basis_plus_values";
  teamContext: TeamContext;
  sendEmail?: boolean;
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
  if (!inviterEmail || invitedEmail === inviterEmail) {
    return { ok: false, error: "self_invite_not_allowed" };
  }

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

  const { data: invitationRows, error: inviteError } = await supabase.rpc(
    "create_founder_invitation_reliable",
    {
      p_invitee_email: invitedEmail,
      p_label: params.label ?? invitedEmail,
      p_inviter_display_name: inviterDisplayName,
      p_inviter_email: inviterEmail,
      p_team_context: params.teamContext,
      p_report_scope: params.reportScope,
      p_token_hash: tokenHash,
      p_expires_at: expiresAt,
    }
  );
  const invitation = (invitationRows as Array<{ invitation_id: string }> | null)?.[0] ?? null;

  if (inviteError || !invitation?.invitation_id) {
    return {
      ok: false,
      error:
        inviteError?.code === "23505" || inviteError?.message?.includes("duplicate_open_invitation")
          ? "duplicate_invite"
          : "invite_create_failed",
    };
  }

  const invitationId = invitation.invitation_id;
  const modules: Array<"base" | "values"> =
    params.reportScope === "basis_plus_values" ? ["base", "values"] : ["base"];

  try {
    await bindLatestSubmittedInvitationMatchingInputs(invitationId, user.id, modules, {
      client: supabase,
      replaceExisting: false,
    });
  } catch (error) {
    const { data: revokedInvitation, error: revokeError } = await supabase
      .from("invitations")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", invitationId)
      .eq("inviter_user_id", user.id)
      .in("status", ["sent", "opened"])
      .select("id")
      .maybeSingle();
    console.error("createInvitation matching binding bootstrap failed", {
      invitationId,
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
      compensated: !revokeError && Boolean(revokedInvitation),
    });
    return { ok: false, error: "invite_create_failed" };
  }

  let emailStatus: EmailStatus = "not_sent";
  let emailError: string | undefined;

  if (params.sendEmail) {
    const locale = await getRequestLocale();
    const sendResult = await sendCoFounderInviteEmail({
      inviteeEmail: invitedEmail,
      inviteUrl: buildAbsoluteInviteUrl(token, locale),
      inviterDisplayName,
      teamName: params.label ?? null,
      reportScope: params.reportScope,
      teamContext: params.teamContext,
      locale,
    }).catch(() => ({ ok: false as const, error: "email_delivery_failed" }));

    if (sendResult.ok) {
      emailStatus = "sent";
    } else {
      emailError = "email_delivery_failed";
      console.error("createInvitation email send failed", {
        invitationId,
        userId: user.id,
        invitedEmail,
        error: sendResult.error,
      });
    }
  }

  return {
    ok: true,
    sessionId: invitationId,
    inviteUrl: buildInviteUrl(token, await getRequestLocale()),
    emailStatus,
    emailError,
    emailRecipient: invitedEmail,
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
    .select("id, inviter_user_id, status, updated_at")
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
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: rotatedInvitation, error: rotateError } = await supabase
    .from("invitations")
    .update({
      token_hash: tokenHash,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", normalizedInvitationId)
    .eq("inviter_user_id", user.id)
    .eq("updated_at", invitation.updated_at)
    .select("id")
    .maybeSingle();

  if (rotateError || !rotatedInvitation) {
    return {
      ok: false,
      reason: "rotate_failed",
      error: rotateError?.message ?? "concurrent_rotation",
    };
  }

  return {
    ok: true,
    invitationId: normalizedInvitationId,
    inviteUrl: buildAbsoluteInviteUrl(token, await getRequestLocale()),
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

export async function signOutAllSessionsAction() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
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
  const label = normalizeDisplayName(formData.get("label"));
  const reportScope = parseReportScope(formData.get("reportScope"));
  const teamContext = parseTeamContextEntry(formData.get("teamContext"));
  if (!teamContext) {
    return { ok: false, error: "ungueltiger_teamkontext" };
  }
  return createInvitation({ invitedEmail, label, reportScope, teamContext });
}

export async function deleteArchivedSessionAction() {
  redirect("/dashboard?error=legacy_sessions_disabled");
}

export async function deleteSessionAction(): Promise<{ ok: boolean; error?: string }> {
  return { ok: false, error: "legacy_sessions_disabled" };
}

export async function getMySessionResponsesAction(): Promise<
  { ok: true; rows: MySessionResponseRow[]; role: string | null } | { ok: false; error: string }
> {
  return {
    ok: false,
    error: "legacy_responses_disabled",
  };
}

export async function restoreResponsesToSessionAction(): Promise<{ ok: boolean; error?: string }> {
  return { ok: false, error: "legacy_responses_disabled" };
}

export async function createComparisonFromExistingAction(formData: FormData): Promise<InviteActionResult> {
  const invitedEmail = String(formData.get("invitedEmail") ?? "");
  const label = normalizeDisplayName(formData.get("label"));
  const reportScope = parseReportScope(formData.get("reportScope"));
  const teamContext = parseTeamContextEntry(formData.get("teamContext"));
  if (!teamContext) {
    return { ok: false, error: "ungueltiger_teamkontext" };
  }
  return createInvitation({ invitedEmail, label, reportScope, teamContext });
}

export async function createCoFounderInvitationAction(formData: FormData): Promise<InviteActionResult> {
  const invitedEmail = String(formData.get("invitedEmail") ?? "");
  const labelRaw = String(formData.get("label") ?? "").trim();
  const includeValues = parseBooleanEntry(formData.get("includeValues"));
  const teamContext = parseTeamContextEntry(formData.get("teamContext"));

  if (!teamContext) {
    return { ok: false, error: "ungueltiger_teamkontext" };
  }

  return createInvitation({
    invitedEmail,
    label: labelRaw.length > 0 ? labelRaw : null,
    reportScope: includeValues ? "basis_plus_values" : "basis",
    teamContext,
    sendEmail: true,
  });
}
