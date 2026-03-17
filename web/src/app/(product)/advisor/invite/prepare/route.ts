import { NextRequest, NextResponse } from "next/server";
import {
  normalizeOpaqueToken,
  PENDING_ADVISOR_INVITE_COOKIE,
  pendingTokenCookieOptions,
} from "@/features/security/pendingTokenCookies";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token = normalizeOpaqueToken(requestUrl.searchParams.get("token"));

  const target = new URL("/login?next=%2Fadvisor%2Finvite%2Fcontinue", request.url);
  const response = NextResponse.redirect(target);

  if (token) {
    response.cookies.set(PENDING_ADVISOR_INVITE_COOKIE, token, pendingTokenCookieOptions());
  }

  return response;
}
