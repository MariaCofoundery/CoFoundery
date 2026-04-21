import { NextRequest, NextResponse } from "next/server";
import { logInviteFlowDebug } from "@/features/onboarding/inviteFlowDebug";
import { isCoreProfileComplete } from "@/features/profile/profileCompletion";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import { resolveInvitationContinueTarget } from "@/features/onboarding/invitationFlow";
import { createClient } from "@/lib/supabase/server";

function buildWelcomeHref(invitationId: string) {
  return `/join/welcome?invitationId=${encodeURIComponent(invitationId)}`;
}

function buildStartHref(invitationId: string) {
  return `/join/start?invitationId=${encodeURIComponent(invitationId)}`;
}

function buildLoginHref(request: NextRequest, invitationId: string) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", buildStartHref(invitationId));
  return loginUrl;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const invitationId = (requestUrl.searchParams.get("invitationId") ?? "").trim();
  logInviteFlowDebug("join/start:request", {
    href: request.url,
    invitationId,
  });

  if (!invitationId) {
    logInviteFlowDebug("join/start:missing_invitation_id", {
      href: request.url,
      fallback: "/dashboard?error=missing_invitation_id",
    });
    return NextResponse.redirect(new URL("/dashboard?error=missing_invitation_id", request.url));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  logInviteFlowDebug("join/start:user", {
    invitationId,
    userId: user?.id ?? null,
  });

  if (!user?.id) {
    logInviteFlowDebug("join/start:redirect_login", {
      invitationId,
      redirectTo: buildLoginHref(request, invitationId).toString(),
    });
    return NextResponse.redirect(buildLoginHref(request, invitationId));
  }

  const { data: invitationSnapshot, error: invitationSnapshotError } = await supabase
    .from("invitations")
    .select("id, status, invitee_user_id, accepted_at")
    .eq("id", invitationId)
    .maybeSingle();
  logInviteFlowDebug("join/start:invitation_snapshot", {
    invitationId,
    userId: user.id,
    invitation: invitationSnapshot,
    invitationError: invitationSnapshotError?.message ?? null,
  });

  const profile = await getProfileBasicsRow(supabase, user.id).catch(() => null);
  if (!isCoreProfileComplete(profile)) {
    logInviteFlowDebug("join/start:redirect_welcome", {
      invitationId,
      userId: user.id,
      redirectTo: buildWelcomeHref(invitationId),
    });
    return NextResponse.redirect(new URL(buildWelcomeHref(invitationId), request.url));
  }

  const nextTarget = await resolveInvitationContinueTarget(invitationId);
  logInviteFlowDebug("join/start:next_target", {
    invitationId,
    userId: user.id,
    nextTarget,
  });
  if (!nextTarget.ok) {
    const separator = nextTarget.fallbackHref.includes("?") ? "&" : "?";
    const fallback = nextTarget.reason
      ? `${nextTarget.fallbackHref}${separator}error=${encodeURIComponent(nextTarget.reason)}`
      : nextTarget.fallbackHref;
    logInviteFlowDebug("join/start:fallback_dashboard", {
      invitationId,
      userId: user.id,
      reason: nextTarget.reason,
      detail: nextTarget.detail ?? null,
      fallback,
    });
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  logInviteFlowDebug("join/start:redirect_resolved", {
    invitationId,
    userId: user.id,
    redirectTo: nextTarget.resolvedHref,
  });
  return NextResponse.redirect(new URL(nextTarget.resolvedHref, request.url));
}
