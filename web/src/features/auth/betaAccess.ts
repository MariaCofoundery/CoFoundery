export const BETA_ACCESS_COOKIE_NAME = "cofoundery_beta_access";

type ReadonlyCookieStore = {
  get: (name: string) => { value: string } | undefined;
};

const LOCAL_ALLOWED_BETA_CODES = ["cofoundery-beta"];
const BETA_ACCESS_REQUEST_EMAIL =
  process.env.RESEND_REPLY_TO_EMAIL?.trim() || "business.mariaschulz@gmail.com";

function normalizeCode(value: string) {
  return value.trim().toLowerCase();
}

export function getBetaAccessRequestHref() {
  const subject = encodeURIComponent("Zugang anfragen - Cofoundery Beta");
  return `mailto:${BETA_ACCESS_REQUEST_EMAIL}?subject=${subject}`;
}

export function getAllowedBetaCodes() {
  const configuredCodes = (process.env.BETA_ACCESS_CODES ?? "")
    .split(/[\n,]+/)
    .map((value) => normalizeCode(value))
    .filter(Boolean);

  return configuredCodes.length > 0
    ? configuredCodes
    : LOCAL_ALLOWED_BETA_CODES.map((value) => normalizeCode(value));
}

export function isValidBetaAccessCode(value: string) {
  const normalized = normalizeCode(value);
  if (!normalized) return false;
  return getAllowedBetaCodes().includes(normalized);
}

export function hasBetaAccessCookie(cookieStore: ReadonlyCookieStore) {
  return cookieStore.get(BETA_ACCESS_COOKIE_NAME)?.value === "granted";
}

export function isInviteBypassPath(nextPath: string) {
  const normalized = nextPath.trim();
  if (!normalized.startsWith("/")) return false;

  let url: URL;
  try {
    url = new URL(normalized, "https://cofoundery.local");
  } catch {
    return false;
  }

  const path = url.pathname;
  if (
    path === "/join" ||
    path.startsWith("/join/") ||
    path.startsWith("/invite/") ||
    path.startsWith("/advisor/invite/") ||
    path.startsWith("/team-invite/")
  ) {
    return true;
  }

  if (url.searchParams.has("invitationId") || url.searchParams.has("token")) {
    return true;
  }

  return false;
}
