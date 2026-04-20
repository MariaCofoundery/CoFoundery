"use server";

import { createHash, randomBytes } from "crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";
import { deleteFounderAccount } from "@/features/account/deleteFounderAccount";
import { bindLatestSubmittedInvitationMatchingInputs } from "@/features/assessments/matchingBindings";
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

export type DeleteAccountActionResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "not_authenticated"
        | "missing_service_role"
        | "cleanup_failed";
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

function buildInviteUrl(token: string) {
  return `/join?token=${encodeURIComponent(token)}`;
}

function getSiteUrlOrigin() {
  return getPublicAppOrigin();
}

function buildAbsoluteInviteUrl(token: string) {
  const relative = buildInviteUrl(token);
  const origin = getSiteUrlOrigin();
  return origin ? `${origin}${relative}` : relative;
}

function createPrivilegedClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
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
      team_context: params.teamContext,
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

  await bindLatestSubmittedInvitationMatchingInputs(
    invitation.id,
    user.id,
    modules.map((row) => row.module),
    {
      client: supabase,
      replaceExisting: false,
    }
  ).catch((error) => {
    console.error("createInvitation matching binding bootstrap failed", {
      invitationId: invitation.id,
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  let emailStatus: EmailStatus = "not_sent";
  let emailError: string | undefined;

  if (params.sendEmail) {
    const sendResult = await sendCoFounderInviteEmail({
      inviteeEmail: invitedEmail,
      inviteUrl: buildAbsoluteInviteUrl(token),
      inviterDisplayName,
      reportScope: params.reportScope,
      teamContext: params.teamContext,
    });

    if (sendResult.ok) {
      emailStatus = "sent";
    } else {
      emailError = sendResult.error;
      console.error("createInvitation email send failed", {
        invitationId: invitation.id,
        userId: user.id,
        invitedEmail,
        error: sendResult.error,
      });
    }
  }

  return {
    ok: true,
    sessionId: invitation.id,
    inviteUrl: buildInviteUrl(token),
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

export async function signOutAllSessionsAction() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login");
}

export async function deleteCurrentUserAccountAction(): Promise<DeleteAccountActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false, error: "not_authenticated" };
  }

  const deleteResult = await deleteFounderAccount(user.id);
  if (!deleteResult.ok) {
    return { ok: false, error: deleteResult.error };
  }

  try {
    await supabase.auth.signOut();
  } catch {
    // Best effort: once the auth user is gone, stale sessions should no longer be usable.
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");

  redirect("/?status=account_deleted");
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
  const teamContext = parseTeamContextEntry(formData.get("teamContext"));
  if (!teamContext) {
    return { ok: false, error: "ungueltiger_teamkontext" };
  }
  return createInvitation({ invitedEmail, reportScope, teamContext });
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
  const reportScope = parseReportScope(formData.get("reportScope"));
  const teamContext = parseTeamContextEntry(formData.get("teamContext"));
  if (!teamContext) {
    return { ok: false, error: "ungueltiger_teamkontext" };
  }
  return createInvitation({ invitedEmail, reportScope, teamContext });
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
