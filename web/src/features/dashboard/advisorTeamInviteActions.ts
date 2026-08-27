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
import {
  deriveAdvisorInviteEmailStatus,
  type AdvisorInviteEmailStatus,
  type AdvisorInviteRecipientEmailStatus,
} from "@/features/dashboard/advisorTeamInviteDelivery";
import { getRequestLocale } from "@/i18n/getLocale";
import { buildLocaleContinuationPath } from "@/i18n/localeContinuation";
import { sendAdvisorTeamFounderInviteEmail } from "@/lib/email/sendAdvisorTeamFounderInviteEmail";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";
import { createClient } from "@/lib/supabase/server";

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
      emailStatus: AdvisorInviteEmailStatus;
      founderAInviteUrl: string;
      founderBInviteUrl: string;
      founderAEmail: string;
      founderBEmail: string;
      founderAEmailStatus: AdvisorInviteRecipientEmailStatus;
      founderBEmailStatus: AdvisorInviteRecipientEmailStatus;
    }
  | {
      ok: false;
      error: CreateAdvisorTeamInviteError;
    };

function buildInvitePath(token: string) {
  return `/team-invite/${encodeURIComponent(token)}`;
}

function buildAbsoluteInviteUrl(token: string, locale: "de" | "en") {
  const origin = getPublicAppOrigin();
  const path = buildLocaleContinuationPath(buildInvitePath(token), locale);
  return origin ? `${origin}${path}` : path;
}

async function recordRecipientDelivery(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  inviteId: string;
  founderSlot: "founder_a" | "founder_b";
  status: AdvisorInviteRecipientEmailStatus;
}) {
  const { error } = await params.supabase.rpc("record_advisor_team_invite_delivery", {
    p_invite_id: params.inviteId,
    p_founder_slot: params.founderSlot,
    p_send_status: params.status,
    p_error_code: params.status === "failed" ? "delivery_failed" : null,
  });
  if (error) {
    console.error("Failed to persist advisor invite recipient delivery state", {
      inviteId: params.inviteId,
      founderSlot: params.founderSlot,
      code: error.code ?? null,
    });
  }
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
  const locale = await getRequestLocale();
  const fallbackCounterpartLabel =
    locale === "en" ? "the other founder" : "die zweite Founder-Person";

  const founderAToken = createOpaqueToken();
  const founderBToken = createOpaqueToken();
  const founderAInviteUrl = buildAbsoluteInviteUrl(founderAToken, locale);
  const founderBInviteUrl = buildAbsoluteInviteUrl(founderBToken, locale);

  const { data: insertedRow, error: insertError } = await supabase.rpc(
    "create_advisor_team_invite_reliable",
    {
      p_advisor_name: advisorName,
      p_team_name: teamName,
      p_founder_a_email: normalizedEmails.founderAEmail,
      p_founder_b_email: normalizedEmails.founderBEmail,
      p_founder_a_token_hash: hashOpaqueToken(founderAToken),
      p_founder_b_token_hash: hashOpaqueToken(founderBToken),
    }
  );

  if (insertError || !insertedRow?.id) {
    if (insertError?.code === "23505") {
      return { ok: false, error: "duplicate_invite" };
    }
    console.error("Failed to create advisor team invite", {
      code: insertError?.code ?? null,
      message: insertError?.message ?? "unknown_error",
    });
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
    }).catch(() => ({ ok: false as const, error: "email_delivery_failed" })),
    sendAdvisorTeamFounderInviteEmail({
      inviteeEmail: normalizedEmails.founderBEmail,
      inviteUrl: founderBInviteUrl,
      advisorName,
      teamName,
      counterpartLabel:
        normalizedEmails.founderAEmail.split("@")[0]?.trim() || fallbackCounterpartLabel,
      locale,
    }).catch(() => ({ ok: false as const, error: "email_delivery_failed" })),
  ]);

  const founderAEmailStatus: AdvisorInviteRecipientEmailStatus = founderAEmailResult.ok ? "sent" : "failed";
  const founderBEmailStatus: AdvisorInviteRecipientEmailStatus = founderBEmailResult.ok ? "sent" : "failed";
  const emailStatus = deriveAdvisorInviteEmailStatus(founderAEmailStatus, founderBEmailStatus);
  await Promise.all([
    recordRecipientDelivery({
      supabase,
      inviteId: insertedRow.id,
      founderSlot: "founder_a",
      status: founderAEmailStatus,
    }),
    recordRecipientDelivery({
      supabase,
      inviteId: insertedRow.id,
      founderSlot: "founder_b",
      status: founderBEmailStatus,
    }),
  ]);
  revalidatePath("/advisor/dashboard");

  return {
    ok: true,
    pendingTeamId: insertedRow.id,
    emailStatus,
    founderAInviteUrl,
    founderBInviteUrl,
    founderAEmail: normalizedEmails.founderAEmail,
    founderBEmail: normalizedEmails.founderBEmail,
    founderAEmailStatus,
    founderBEmailStatus,
  };
}

export async function resendAdvisorTeamInviteFounderAction(formData: FormData): Promise<void> {
  const inviteId = String(formData.get("pendingTeamId") ?? "").trim();
  const slotValue = String(formData.get("founderSlot") ?? "");
  const founderSlot = slotValue === "founderA" ? "founder_a" : slotValue === "founderB" ? "founder_b" : null;
  if (!inviteId || !founderSlot) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return;

  const locale = await getRequestLocale();
  const token = createOpaqueToken();
  const { data, error } = await supabase.rpc("rotate_advisor_team_invite_founder_token", {
    p_invite_id: inviteId,
    p_founder_slot: founderSlot,
    p_token_hash: hashOpaqueToken(token),
  });
  if (error || !data) return;

  const row = data as {
    advisor_name: string | null;
    team_name: string | null;
    founder_a_email: string;
    founder_b_email: string;
  };
  const recipientEmail = founderSlot === "founder_a" ? row.founder_a_email : row.founder_b_email;
  const counterpartEmail = founderSlot === "founder_a" ? row.founder_b_email : row.founder_a_email;
  const delivery = await sendAdvisorTeamFounderInviteEmail({
    inviteeEmail: recipientEmail,
    inviteUrl: buildAbsoluteInviteUrl(token, locale),
    advisorName: row.advisor_name,
    teamName: row.team_name,
    counterpartLabel: counterpartEmail.split("@")[0]?.trim() || (locale === "en" ? "the other founder" : "die zweite Founder-Person"),
    locale,
  }).catch(() => ({ ok: false as const, error: "email_delivery_failed" }));

  await recordRecipientDelivery({
    supabase,
    inviteId,
    founderSlot,
    status: delivery.ok ? "sent" : "failed",
  });
  revalidatePath("/advisor/dashboard");
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

  await supabase.rpc("revoke_pending_advisor_team_invite", {
    p_invite_id: pendingTeamId,
  });

  revalidatePath("/advisor/dashboard");
}
