import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import {
  redirectToLoginError,
  redirectToNextPath,
  normalizeNextPath,
} from "@/features/auth/authRedirects";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const nextPath = normalizeNextPath(requestUrl.searchParams.get("next"));
  const supabase = await createClient();

  let error: string | null = null;
  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error?.message ?? null;
  } else if (tokenHash && type) {
    const result = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    error = result.error?.message ?? null;
  } else {
    error = "auth_callback_failed";
  }

  if (error) {
    return redirectToLoginError(request, "auth_callback_failed");
  }

  return redirectToNextPath(request, nextPath);
}
