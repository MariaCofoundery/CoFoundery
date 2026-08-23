"use server";

import { revalidatePath } from "next/cache";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import {
  claimAdvisorTeamInviteFounder,
  createOpaqueToken,
  getAdvisorPendingTeamInvites,
  hashOpaqueToken,
  normalizeEmail,
  normalizeTeamName,
  type ClaimAdvisorTeamInviteResult,
} from "@/features/dashboard/advisorTeamInviteData";
import { getRequestLocale } from "@/i18n/getLocale";
import { sendAdvisorTeamFounderInviteEmail } from "@/lib/email/sendAdvisorTeamFounderInviteEmail";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";
import { createClient } from "@/lib/supabase/server";

type EmailStatus = "sent" | "partial" | "not_sent";
export type CreateAdvisorTeamInviteError =
  | "invalid_founder_a_email"
  | "invalid_founder_b_email"
  | "founder_emails_must_differ"
  | "not_authenticated"
  | "duplicate_invite"
  | "create_failed";

export type CreateAdvisorTeamInviteActionResult =
  | {
      ok: true;
      pendingTeamId: string;
      emailStatus: EmailStatus;
      founderAInviteUrl: string;
      founderBInviteUrl: string;
      founderAEmail: string;
      founderBEmail: string;
    }
  | {
      ok: false;
      error: CreateAdvisorTeamInviteError;
    };

function buildInvitePath(token: string) {
  return `/team-invite/${encodeURIComponent(token)}`;
}

function buildAbsoluteInviteUrl(token: string) {
  const origin = getPublicAppOrigin();
  const path = buildInvitePath(token);
  return origin ? `${origin}${path}` : path;
}

function normalizeDistinctFounderEmails(params: { founderAEmail: FormDataEntryValue | null; founderBEmail: FormDataEntryValue | null }) {
  const founderAEmail = normalizeEmail(String(params.founderAEmail ?? ""));
  const founderBEmail = normalizeEmail(String(params.founderBEmail ?? ""));
  if (!founderAEmail || !founderAEmail.includes("@")) {
    return { ok: false as const, error: "invalid_founder_a_email" as const };
  }
  if (!founderBEmail || !founderBEmail.includes("@")) {
    return { ok: false as const, error: "invalid_founder_b_email" as const };
  }
  if (founderAEmail === founderBEmail) {
    return { ok: false as const, error: "founder_emails_must_differ" as const };
  }

  return {
    ok: true as const,
    founderAEmail,
    founderBEmail,
  };
}

export async function createAdvisorTeamInviteAction(
  formData: FormData
): Promise<CreateAdvisorTeamInviteActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false, error: "not_authenticated" };
  }

  const normalizedEmails = normalizeDistinctFounderEmails({
    founderAEmail: formData.get("founderAEmail"),
    founderBEmail: formData.get("founderBEmail"),
  });
  if (!normalizedEmails.ok) {
    return { ok: false, error: normalizedEmails.error };
  }

  const teamName = normalizeTeamName(String(formData.get("teamName") ?? ""));
  const existingPendingInvites = await getAdvisorPendingTeamInvites(user.id);
  const duplicateInvite = existingPendingInvites.find((invite) => {
    const leftPair = [invite.founderAEmail, invite.founderBEmail].sort().join("|");
    const rightPair = [normalizedEmails.founderAEmail, normalizedEmails.founderBEmail].sort().join("|");
    return leftPair === rightPair;
  });

  if (duplicateInvite) {
    return {
      ok: false,
      error: "duplicate_invite",
    };
  }

  const profile = await getProfileBasicsRow(supabase, user.id).catch(() => null);
  const metadataName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name.trim()
      : "";
  const advisorName = profile?.display_name?.trim() || metadataName || null;
  const advisorEmail = normalizeEmail(user.email ?? null) || null;
  const locale = await getRequestLocale();
  const fallbackCounterpartLabel =
    locale === "en" ? "the other founder" : "die zweite Founder-Person";

  const founderAToken = createOpaqueToken();
  const founderBToken = createOpaqueToken();
  const founderAInviteUrl = buildAbsoluteInviteUrl(founderAToken);
  const founderBInviteUrl = buildAbsoluteInviteUrl(founderBToken);

  const { data: insertedRow, error: insertError } = await supabase
    .from("advisor_team_invites")
    .insert({
      advisor_user_id: user.id,
      advisor_email: advisorEmail,
      advisor_name: advisorName,
      team_name: teamName,
      founder_a_email: normalizedEmails.founderAEmail,
      founder_b_email: normalizedEmails.founderBEmail,
      founder_a_token_hash: hashOpaqueToken(founderAToken),
      founder_b_token_hash: hashOpaqueToken(founderBToken),
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !insertedRow?.id) {
    console.error("Failed to create advisor team invite", insertError);
    return { ok: false, error: "create_failed" };
  }

  const [founderAEmailResult, founderBEmailResult] = await Promise.all([
    sendAdvisorTeamFounderInviteEmail({
      inviteeEmail: normalizedEmails.founderAEmail,
      inviteUrl: founderAInviteUrl,
      advisorName,
      teamName,
      counterpartLabel:
        normalizedEmails.founderBEmail.split("@")[0]?.trim() || fallbackCounterpartLabel,
      locale,
    }),
    sendAdvisorTeamFounderInviteEmail({
      inviteeEmail: normalizedEmails.founderBEmail,
      inviteUrl: founderBInviteUrl,
      advisorName,
      teamName,
      counterpartLabel:
        normalizedEmails.founderAEmail.split("@")[0]?.trim() || fallbackCounterpartLabel,
      locale,
    }),
  ]);

  const emailResults = [founderAEmailResult, founderBEmailResult];
  const sentCount = emailResults.filter((result) => result.ok).length;
  const emailStatus: EmailStatus =
    sentCount === 2 ? "sent" : sentCount === 0 ? "not_sent" : "partial";
  revalidatePath("/advisor/dashboard");

  return {
    ok: true,
    pendingTeamId: insertedRow.id,
    emailStatus,
    founderAInviteUrl,
    founderBInviteUrl,
    founderAEmail: normalizedEmails.founderAEmail,
    founderBEmail: normalizedEmails.founderBEmail,
  };
}

export async function claimAdvisorTeamInviteFounderAction(params: {
  token: string;
}): Promise<ClaimAdvisorTeamInviteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false, reason: "not_authenticated" };
  }

  const result = await claimAdvisorTeamInviteFounder({
    token: params.token,
    userId: user.id,
    userEmail: user.email,
  });

  if (result.ok) {
    revalidatePath("/advisor/dashboard");
    revalidatePath("/dashboard");
  }

  return result;
}

export async function revokeAdvisorPendingTeamInviteAction(
  formData: FormData
): Promise<void> {
  const pendingTeamId = String(formData.get("pendingTeamId") ?? "").trim();
  if (!pendingTeamId) {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return;
  }

  await supabase
    .from("advisor_team_invites")
    .update({
      status: "revoked",
    })
    .eq("id", pendingTeamId)
    .eq("advisor_user_id", user.id)
    .eq("status", "pending")
    .is("relationship_id", null);

  revalidatePath("/advisor/dashboard");
}
