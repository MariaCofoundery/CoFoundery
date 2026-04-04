import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export type AuthErrorCode = "magic_link_failed" | "auth_callback_failed";
type AuthSessionLikeClient = {
  auth: {
    exchangeCodeForSession: (code: string) => Promise<{ error: { message?: string | null } | null }>;
    verifyOtp: (params: {
      token_hash: string;
      type: EmailOtpType;
    }) => Promise<{ error: { message?: string | null } | null }>;
  };
};

export function normalizeNextPath(value: string | null | undefined, fallback = "/dashboard") {
  const trimmed = (value ?? "").trim();
  return trimmed.startsWith("/") ? trimmed : fallback;
}

function readNestedNextPath(rawUrl: string | null | undefined) {
  const trimmed = (rawUrl ?? "").trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    return url.searchParams.get("next");
  } catch {
    return null;
  }
}

export function readAuthNextPath(requestUrl: URL, fallback = "/dashboard") {
  return normalizeNextPath(
    requestUrl.searchParams.get("next") ??
      readNestedNextPath(requestUrl.searchParams.get("redirect_to")) ??
      readNestedNextPath(requestUrl.searchParams.get("redirectTo")),
    fallback
  );
}

export function redirectToNextPath(request: NextRequest, nextPath: string) {
  return NextResponse.redirect(new URL(normalizeNextPath(nextPath), request.url));
}

export function redirectToLoginError(
  request: NextRequest,
  error: AuthErrorCode,
  nextPath?: string
) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", error);

  const normalizedNext = normalizeNextPath(nextPath, "");
  if (normalizedNext) {
    loginUrl.searchParams.set("next", normalizedNext);
  }

  return NextResponse.redirect(loginUrl);
}

export function buildAuthCallbackClientBridgeResponse(
  request: NextRequest,
  nextPath: string,
  errorCode: AuthErrorCode
) {
  const clientUrl = new URL("/auth/callback/client", request.url);
  clientUrl.searchParams.set("next", normalizeNextPath(nextPath));

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", errorCode);
  loginUrl.searchParams.set("next", normalizeNextPath(nextPath));

  const html = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Authentifizierung wird abgeschlossen</title>
  </head>
  <body style="margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;color:#0f172a;">
    <main style="min-height:100vh;display:grid;place-items:center;padding:24px;">
      <section style="max-width:440px;width:100%;background:#fff;border:1px solid rgba(148,163,184,.28);border-radius:20px;padding:28px;box-shadow:0 18px 40px rgba(15,23,42,.06);">
        <p style="margin:0 0 10px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#64748b;">Authentifizierung</p>
        <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;">Anmeldung wird abgeschlossen</h1>
        <p style="margin:0;color:#475569;font-size:14px;line-height:1.7;">
          Einen Moment bitte. Wir übernehmen deinen Login und leiten dich direkt weiter.
        </p>
      </section>
    </main>
    <script>
      (function () {
        var hash = window.location.hash ? new URLSearchParams(window.location.hash.slice(1)) : null;
        if (!hash) {
          window.location.replace(${JSON.stringify(loginUrl.toString())});
          return;
        }

        var accessToken = hash.get("access_token");
        var refreshToken = hash.get("refresh_token");
        if (!accessToken || !refreshToken) {
          window.location.replace(${JSON.stringify(loginUrl.toString())});
          return;
        }

        var target = new URL(${JSON.stringify(clientUrl.toString())});
        ["access_token", "refresh_token", "expires_in", "expires_at", "token_type", "type"].forEach(function (key) {
          var value = hash.get(key);
          if (value) target.searchParams.set(key, value);
        });

        window.location.replace(target.toString());
      })();
    </script>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function completeAuthRedirectSession(
  request: NextRequest,
  supabase: AuthSessionLikeClient,
  options?: {
    errorCode?: AuthErrorCode;
  }
) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const nextPath = readAuthNextPath(requestUrl);
  const errorCode = options?.errorCode ?? "auth_callback_failed";

  let error: string | null = null;
  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error?.message ?? null;
  } else if (tokenHash && type) {
    const result = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    error = result.error?.message ?? null;
  } else if (
    requestUrl.searchParams.get("error") ||
    requestUrl.searchParams.get("error_code") ||
    requestUrl.searchParams.get("error_description")
  ) {
    error =
      requestUrl.searchParams.get("error_description") ??
      requestUrl.searchParams.get("error") ??
      requestUrl.searchParams.get("error_code");
  } else {
    return buildAuthCallbackClientBridgeResponse(request, nextPath, errorCode);
  }

  if (error) {
    return redirectToLoginError(request, errorCode, nextPath);
  }

  return redirectToNextPath(request, nextPath);
}
