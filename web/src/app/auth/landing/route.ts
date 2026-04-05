import { NextRequest, NextResponse } from "next/server";
import { normalizeNextPath, redirectToLoginError } from "@/features/auth/authRedirects";
import { cleanupOversizedAvatarMetadata } from "@/features/auth/authSessionHygiene";
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

  await cleanupOversizedAvatarMetadata(supabase, user);
  const destination = await resolvePostAuthRedirectPath(supabase, nextPath);
  return NextResponse.redirect(new URL(destination, request.url));
}
