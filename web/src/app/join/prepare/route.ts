import { NextRequest, NextResponse } from "next/server";
import {
  normalizeOpaqueToken,
  PENDING_FOUNDER_INVITE_COOKIE,
  pendingTokenCookieOptions,
} from "@/features/security/pendingTokenCookies";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token = normalizeOpaqueToken(
    requestUrl.searchParams.get("token") ?? requestUrl.searchParams.get("inviteToken")
  );

  const target = new URL("/login?next=%2Fjoin%2Fcontinue", request.url);
  const response = NextResponse.redirect(target);

  if (token) {
    response.cookies.set(PENDING_FOUNDER_INVITE_COOKIE, token, pendingTokenCookieOptions());
  }

  return response;
}
