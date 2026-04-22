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
import { sendAdvisorTeamFounderInviteEmail } from "@/lib/email/sendAdvisorTeamFounderInviteEmail";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";
import { createClient } from "@/lib/supabase/server";

type EmailStatus = "sent" | "partial" | "not_sent";

export type CreateAdvisorTeamInviteActionResult =
  | {
      ok: true;
      pendingTeamId: string;
      emailStatus: EmailStatus;
      founderAInviteUrl: string;
      founderBInviteUrl: string;
      founderAEmail: string;
      founderBEmail: string;
      emailError?: string;
    }
  | {
      ok: false;
      error: string;
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
    return { ok: false as const, error: "Bitte eine gültige E-Mail für Founder A eingeben." };
  }
  if (!founderBEmail || !founderBEmail.includes("@")) {
    return { ok: false as const, error: "Bitte eine gültige E-Mail für Founder B eingeben." };
  }
  if (founderAEmail === founderBEmail) {
    return { ok: false as const, error: "Bitte zwei unterschiedliche Founder-E-Mails verwenden." };
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
    return { ok: false, error: "Bitte zuerst anmelden." };
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
      error: "Dieses Team ist bereits eingeladen und erscheint schon in deinem Advisor-Dashboard.",
    };
  }

  const profile = await getProfileBasicsRow(supabase, user.id).catch(() => null);
  const metadataName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name.trim()
      : "";
  const advisorName = profile?.display_name?.trim() || metadataName || null;
  const advisorEmail = normalizeEmail(user.email ?? null) || null;

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
    return { ok: false, error: insertError?.message ?? "Team konnte gerade nicht angelegt werden." };
  }

  const [founderAEmailResult, founderBEmailResult] = await Promise.all([
    sendAdvisorTeamFounderInviteEmail({
      inviteeEmail: normalizedEmails.founderAEmail,
      inviteUrl: founderAInviteUrl,
      advisorName,
      teamName,
      counterpartLabel: normalizedEmails.founderBEmail.split("@")[0]?.trim() || "die zweite Founder-Person",
    }),
    sendAdvisorTeamFounderInviteEmail({
      inviteeEmail: normalizedEmails.founderBEmail,
      inviteUrl: founderBInviteUrl,
      advisorName,
      teamName,
      counterpartLabel: normalizedEmails.founderAEmail.split("@")[0]?.trim() || "die zweite Founder-Person",
    }),
  ]);

  const emailResults = [founderAEmailResult, founderBEmailResult];
  const sentCount = emailResults.filter((result) => result.ok).length;
  const emailStatus: EmailStatus =
    sentCount === 2 ? "sent" : sentCount === 0 ? "not_sent" : "partial";
  const emailError =
    emailStatus === "sent"
      ? undefined
      : emailResults
          .filter((result): result is { ok: false; error: string } => !result.ok)
          .map((result) => result.error)
          .join(" | ");

  revalidatePath("/advisor/dashboard");

  return {
    ok: true,
    pendingTeamId: insertedRow.id,
    emailStatus,
    founderAInviteUrl,
    founderBInviteUrl,
    founderAEmail: normalizedEmails.founderAEmail,
    founderBEmail: normalizedEmails.founderBEmail,
    emailError,
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
