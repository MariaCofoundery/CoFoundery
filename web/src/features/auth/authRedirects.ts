import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export type AuthErrorCode = "magic_link_failed" | "auth_callback_failed";
type AuthSessionLikeClient = {
  auth: {
    exchangeCodeForSession: (code: string) => Promise<{ error: { message?: string | null } | null }>;
    verifyOtp: (params: {
      token_hash: string;
      type: EmailOtpType;
    }) => Promise<{ error: { message?: string | null } | null }>;
  };
};

export function normalizeNextPath(value: string | null | undefined, fallback = "/dashboard") {
  const trimmed = (value ?? "").trim();
  return trimmed.startsWith("/") ? trimmed : fallback;
}

export function redirectToNextPath(request: NextRequest, nextPath: string) {
  return NextResponse.redirect(new URL(normalizeNextPath(nextPath), request.url));
}

export function redirectToLoginError(request: NextRequest, error: AuthErrorCode) {
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, request.url));
}

export async function completeAuthRedirectSession(
  request: NextRequest,
  supabase: AuthSessionLikeClient,
  options?: {
    errorCode?: AuthErrorCode;
  }
) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const nextPath = normalizeNextPath(requestUrl.searchParams.get("next"));
  const errorCode = options?.errorCode ?? "auth_callback_failed";

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
    error = errorCode;
  }

  if (error) {
    return redirectToLoginError(request, errorCode);
  }

  return redirectToNextPath(request, nextPath);
}
