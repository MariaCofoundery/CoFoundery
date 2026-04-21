import { NextRequest, NextResponse } from "next/server";
import {
  normalizeOpaqueToken,
  PENDING_ADVISOR_INVITE_COOKIE,
  pendingTokenCookieOptions,
} from "@/features/security/pendingTokenCookies";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token = normalizeOpaqueToken(requestUrl.searchParams.get("token"));
  const continueTarget = token
    ? `/advisor/invite/continue?token=${encodeURIComponent(token)}`
    : "/advisor/invite/continue";
  const target = new URL(`/login?next=${encodeURIComponent(continueTarget)}`, request.url);
  const response = NextResponse.redirect(target);

  if (token) {
    response.cookies.set(PENDING_ADVISOR_INVITE_COOKIE, token, pendingTokenCookieOptions());
  }

  return response;
}
