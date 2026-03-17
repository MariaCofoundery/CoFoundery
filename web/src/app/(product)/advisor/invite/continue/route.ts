import { NextRequest, NextResponse } from "next/server";
import {
  clearPendingTokenCookieOptions,
  normalizeOpaqueToken,
  PENDING_ADVISOR_INVITE_COOKIE,
} from "@/features/security/pendingTokenCookies";

export async function GET(request: NextRequest) {
  const token = normalizeOpaqueToken(request.cookies.get(PENDING_ADVISOR_INVITE_COOKIE)?.value);
  const target = token ? `/advisor/invite/${encodeURIComponent(token)}` : "/advisor/dashboard";
  const response = NextResponse.redirect(new URL(target, request.url));
  response.cookies.set(PENDING_ADVISOR_INVITE_COOKIE, "", clearPendingTokenCookieOptions());
  return response;
}
