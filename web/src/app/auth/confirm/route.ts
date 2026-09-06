import { NextRequest, NextResponse } from "next/server";
import { completeAuthRedirectSession, normalizeNextPath, readConnectSignupToken, readProfileSignupIntent } from "@/features/auth/authRedirects";
import { claimConnectSignupIntent } from "@/features/auth/connectSignup";
import { resolvePostAuthRedirectPath } from "@/features/auth/postAuthRedirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  return completeAuthRedirectSession(request, supabase, {
    errorCode: "auth_callback_failed",
    onSuccessRedirect: async (nextPath) => {
      const requestUrl = new URL(request.url);
      const connectSignupToken = readConnectSignupToken(requestUrl);
      if (connectSignupToken && !(await claimConnectSignupIntent(supabase, connectSignupToken))) {
        return NextResponse.redirect(new URL("/start?status=connect_failed&intent=connect", request.url));
      }
      const destination = await resolvePostAuthRedirectPath(
        supabase,
        normalizeNextPath(nextPath),
        readProfileSignupIntent(requestUrl)
      );
      return NextResponse.redirect(new URL(destination, request.url));
    },
  });
}
