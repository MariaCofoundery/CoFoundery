import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { buildInvitationStartHref } from "@/features/onboarding/invitationFlow";
import { createClient } from "@/lib/supabase/server";

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

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { sessionId } = await context.params;
  const invitationId = sessionId.trim();

  if (!invitationId) {
    return NextResponse.redirect(new URL("/dashboard?error=missing_invitation_id", request.url));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) {
    const { data: invitationRow } = await supabase
      .from("invitations")
      .select("id, inviter_user_id, invitee_user_id, invitee_email, status, expires_at, revoked_at, accepted_at")
      .eq("id", invitationId)
      .maybeSingle();

    const invitation = invitationRow as
      | {
          id: string;
          inviter_user_id: string;
          invitee_user_id: string | null;
          invitee_email: string;
          status: string;
          expires_at: string;
          revoked_at: string | null;
          accepted_at: string | null;
        }
      | null;

    const normalizedUserEmail = (user.email ?? "").trim().toLowerCase();
    const isInvitee =
      invitation &&
      (invitation.invitee_user_id === user.id ||
        (normalizedUserEmail.length > 0 &&
          invitation.invitee_email.trim().toLowerCase() === normalizedUserEmail));
    const isExpired =
      invitation?.expires_at != null &&
      !Number.isNaN(Date.parse(invitation.expires_at)) &&
      Date.parse(invitation.expires_at) < Date.now();

    if (
      invitation &&
      isInvitee &&
      !invitation.revoked_at &&
      !isExpired &&
      (invitation.status !== "accepted" || !invitation.invitee_user_id)
    ) {
      const privileged = createPrivilegedClient();
      if (privileged) {
        await privileged
          .from("relationships")
          .upsert(
            {
              user_a_id: invitation.inviter_user_id,
              user_b_id: user.id,
            },
            { onConflict: "user_low,user_high", ignoreDuplicates: true }
          );

        await privileged
          .from("invitations")
          .update({
            status: "accepted",
            invitee_user_id: user.id,
            accepted_at: invitation.accepted_at ?? new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", invitationId);
      }
    }
  }

  return NextResponse.redirect(new URL(buildInvitationStartHref(invitationId), request.url));
}
