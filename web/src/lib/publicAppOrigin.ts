function normalizeOrigin(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

export function getPublicAppOrigin(fallbackOrigin = "") {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "";

  if (configured) {
    return normalizeOrigin(configured);
  }

  return normalizeOrigin(fallbackOrigin);
}
