import { NextRequest, NextResponse } from "next/server";
import {
  completeAuthRedirectSession,
  normalizeNextPath,
  readNetworkSignupToken,
  readProfileSignupIntent,
} from "@/features/auth/authRedirects";
import { claimNetworkSignupIntent } from "@/features/auth/networkSignup";
import { resolvePostAuthRedirectPath } from "@/features/auth/postAuthRedirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  return completeAuthRedirectSession(request, supabase, {
    errorCode: "auth_callback_failed",
    onSuccessRedirect: async (nextPath) => {
      const requestUrl = new URL(request.url);
      const networkSignupToken = readNetworkSignupToken(requestUrl);
      if (networkSignupToken && !(await claimNetworkSignupIntent(supabase, networkSignupToken))) {
        return NextResponse.redirect(new URL("/start?status=network_failed&intent=network", request.url));
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
