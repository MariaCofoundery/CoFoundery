export const DEFAULT_PUBLIC_APP_ORIGIN = "https://cofoundery.de";

function normalizeOrigin(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

export function isLocalDevelopmentOrigin(value: string) {
  const origin = normalizeOrigin(value);
  if (!origin) return false;

  try {
    const url = new URL(origin);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function getConfiguredPublicAppOrigin() {
  const configured =
    typeof window === "undefined"
      ? process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        process.env.SITE_URL?.trim() ||
        process.env.APP_URL?.trim() ||
        ""
      : process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || "";

  return configured ? normalizeOrigin(configured) : "";
}

export function getPublicAppOrigin(fallbackOrigin = "") {
  const configured = getConfiguredPublicAppOrigin();
  if (configured) {
    return configured;
  }

  if (isLocalDevelopmentOrigin(fallbackOrigin)) {
    return normalizeOrigin(fallbackOrigin);
  }

  return DEFAULT_PUBLIC_APP_ORIGIN;
}

export function toPublicAppUrl(value: string, fallbackOrigin = "") {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (!trimmed.startsWith("/")) return trimmed;

  const origin = getPublicAppOrigin(fallbackOrigin);
  return origin ? `${origin}${trimmed}` : trimmed;
}
