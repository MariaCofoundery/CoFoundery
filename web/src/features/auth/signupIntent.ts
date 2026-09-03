const NETWORK_SIGNUP_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

function readNestedParam(rawUrl: string | null | undefined, name: string) {
  const trimmed = (rawUrl ?? "").trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed).searchParams.get(name);
  } catch {
    return null;
  }
}

export function readNetworkSignupToken(requestUrl: URL) {
  const value =
    requestUrl.searchParams.get("network_signup_token") ??
    readNestedParam(requestUrl.searchParams.get("redirect_to"), "network_signup_token") ??
    readNestedParam(requestUrl.searchParams.get("redirectTo"), "network_signup_token");
  const token = value?.trim() ?? "";
  return NETWORK_SIGNUP_TOKEN_PATTERN.test(token) ? token : null;
}

export function readProfileSignupIntent(requestUrl: URL) {
  const value =
    requestUrl.searchParams.get("profile_signup_intent") ??
    readNestedParam(requestUrl.searchParams.get("redirect_to"), "profile_signup_intent") ??
    readNestedParam(requestUrl.searchParams.get("redirectTo"), "profile_signup_intent");
  return value === "advisor" ? "advisor" as const : value === "founder" ? "founder" as const : null;
}
