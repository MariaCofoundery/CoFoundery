export function normalizeSafeInternalPath(
  value: string | null | undefined,
  fallback = "/dashboard"
) {
  const trimmed = (value ?? "").trim();
  if (!trimmed.startsWith("/")) {
    return fallback;
  }

  const pathOnly = trimmed.split(/[?#]/, 1)[0] ?? "";
  let decodedPath = pathOnly;

  try {
    // URL/search-param processing can decode more than once across redirects. Inspect a
    // bounded second pass so encoded slash/backslash variants cannot become an origin later.
    decodedPath = decodeURIComponent(decodedPath);
    decodedPath = decodeURIComponent(decodedPath);
  } catch {
    return fallback;
  }

  if (
    trimmed.includes("\\") ||
    decodedPath.includes("\\") ||
    decodedPath.startsWith("//") ||
    /[\u0000-\u001f\u007f]/.test(decodedPath)
  ) {
    return fallback;
  }

  try {
    const internalOrigin = "https://internal.cofoundery.invalid";
    const resolved = new URL(trimmed, internalOrigin);
    if (resolved.origin !== internalOrigin) {
      return fallback;
    }
  } catch {
    return fallback;
  }

  return trimmed;
}
