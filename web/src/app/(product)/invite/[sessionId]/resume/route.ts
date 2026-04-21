import { NextRequest, NextResponse } from "next/server";
import { buildInvitationStartHref } from "@/features/onboarding/invitationFlow";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { sessionId } = await context.params;
  const invitationId = sessionId.trim();

  if (!invitationId) {
    return NextResponse.redirect(new URL("/dashboard?error=missing_invitation_id", request.url));
  }

  return NextResponse.redirect(new URL(buildInvitationStartHref(invitationId), request.url));
}
