import { NextRequest, NextResponse } from "next/server";
import {
  clearPendingTokenCookieOptions,
  normalizeOpaqueToken,
  PENDING_FOUNDER_INVITE_COOKIE,
} from "@/features/security/pendingTokenCookies";

export async function GET(request: NextRequest) {
  const token = normalizeOpaqueToken(request.cookies.get(PENDING_FOUNDER_INVITE_COOKIE)?.value);
  const target = token ? `/join?token=${encodeURIComponent(token)}` : "/join";
  const response = NextResponse.redirect(new URL(target, request.url));
  response.cookies.set(PENDING_FOUNDER_INVITE_COOKIE, "", clearPendingTokenCookieOptions());
  return response;
}
