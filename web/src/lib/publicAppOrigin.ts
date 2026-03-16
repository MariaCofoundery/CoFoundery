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

export function getPublicAppOrigin(fallbackOrigin = "") {
  const configured =
    typeof window === "undefined"
      ? process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        process.env.SITE_URL?.trim() ||
        process.env.APP_URL?.trim() ||
        ""
      : process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || "";

  if (configured) {
    return normalizeOrigin(configured);
  }

  return isLocalDevelopmentOrigin(fallbackOrigin) ? normalizeOrigin(fallbackOrigin) : "";
}
