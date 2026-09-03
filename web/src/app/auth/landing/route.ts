import { NextRequest, NextResponse } from "next/server";
import { normalizeNextPath, readNetworkSignupToken, readProfileSignupIntent, redirectToLoginError } from "@/features/auth/authRedirects";
import { cleanupOversizedAvatarMetadata } from "@/features/auth/authSessionHygiene";
import { claimNetworkSignupIntent } from "@/features/auth/networkSignup";
import { resolvePostAuthRedirectPath } from "@/features/auth/postAuthRedirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const nextPath = normalizeNextPath(new URL(request.url).searchParams.get("next"));
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    return redirectToLoginError(request, "auth_callback_failed", nextPath);
  }

  const networkSignupToken = readNetworkSignupToken(new URL(request.url));
  if (networkSignupToken && !(await claimNetworkSignupIntent(supabase, networkSignupToken))) {
    return NextResponse.redirect(new URL("/start?status=network_failed&intent=network", request.url));
  }

  await cleanupOversizedAvatarMetadata(supabase, user);
  const destination = await resolvePostAuthRedirectPath(
    supabase,
    nextPath,
    readProfileSignupIntent(new URL(request.url))
  );
  return NextResponse.redirect(new URL(destination, request.url));
}
