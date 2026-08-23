import { type NextRequest, NextResponse } from "next/server";
import { normalizeNextPath } from "@/features/auth/authRedirects";
import { LOCALE_COOKIE_NAME, normalizeLocale } from "@/i18n/config";

export function GET(request: NextRequest) {
  const locale = normalizeLocale(request.nextUrl.searchParams.get("locale"));
  const nextPath = normalizeNextPath(request.nextUrl.searchParams.get("next"), "/");
  const response = NextResponse.redirect(new URL(nextPath, request.url));

  response.cookies.set(LOCALE_COOKIE_NAME, locale, {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
