import { NextRequest, NextResponse } from "next/server";

export type AuthErrorCode = "magic_link_failed" | "auth_callback_failed";

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
