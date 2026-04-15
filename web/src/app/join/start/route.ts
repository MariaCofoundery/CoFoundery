import { NextRequest, NextResponse } from "next/server";
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

  if (!invitationId) {
    return NextResponse.redirect(new URL("/dashboard?error=missing_invitation_id", request.url));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.redirect(buildLoginHref(request, invitationId));
  }

  const profile = await getProfileBasicsRow(supabase, user.id).catch(() => null);
  if (!isCoreProfileComplete(profile)) {
    return NextResponse.redirect(new URL(buildWelcomeHref(invitationId), request.url));
  }

  const nextTarget = await resolveInvitationContinueTarget(invitationId);
  if (!nextTarget.ok) {
    const separator = nextTarget.fallbackHref.includes("?") ? "&" : "?";
    const fallback = nextTarget.reason
      ? `${nextTarget.fallbackHref}${separator}error=${encodeURIComponent(nextTarget.reason)}`
      : nextTarget.fallbackHref;
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  return NextResponse.redirect(new URL(nextTarget.resolvedHref, request.url));
}
