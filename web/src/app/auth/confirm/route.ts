import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { redirectToLoginError, redirectToNextPath, normalizeNextPath } from "@/features/auth/authRedirects";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const nextPath = normalizeNextPath(requestUrl.searchParams.get("next"));

  if (!tokenHash || !type) {
    return redirectToLoginError(request, "magic_link_failed");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    return redirectToLoginError(request, "magic_link_failed");
  }

  return redirectToNextPath(request, nextPath);
}
