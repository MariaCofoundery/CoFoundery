export const PENDING_FOUNDER_INVITE_COOKIE = "pending_founder_invite_token_v1";
export const PENDING_ADVISOR_INVITE_COOKIE = "pending_advisor_invite_token_v1";

export function pendingTokenCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 15,
  };
}

export function clearPendingTokenCookieOptions() {
  return {
    ...pendingTokenCookieOptions(),
    maxAge: 0,
  };
}

export function normalizeOpaqueToken(value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : "";
}
