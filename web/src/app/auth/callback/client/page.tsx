"use client";

import { type EmailOtpType } from "@supabase/supabase-js";
import { useEffect, useMemo } from "react";
import { normalizeNextPath } from "@/features/auth/authRedirects";
import { createClient } from "@/lib/supabase/client";

const AUTH_CALLBACK_SESSION_STORAGE_KEY = "cofoundery.auth.callback.tokens";

function buildLoginErrorHref(nextPath: string) {
  const params = new URLSearchParams({
    error: "auth_callback_failed",
    next: normalizeNextPath(nextPath),
  });

  return `/login?${params.toString()}`;
}

function buildAuthLandingHref(nextPath: string) {
  const params = new URLSearchParams({
    next: normalizeNextPath(nextPath),
  });

  return `/auth/landing?${params.toString()}`;
}

function readHashParams() {
  if (!window.location.hash.startsWith("#")) {
    return null;
  }

  return new URLSearchParams(window.location.hash.slice(1));
}

function readStoredCallbackTokens() {
  let rawValue: string | null = null;

  try {
    rawValue = window.sessionStorage.getItem(AUTH_CALLBACK_SESSION_STORAGE_KEY);
    window.sessionStorage.removeItem(AUTH_CALLBACK_SESSION_STORAGE_KEY);
  } catch {
    return null;
  }

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<{
      accessToken: unknown;
      refreshToken: unknown;
    }>;
    const accessToken = typeof parsed.accessToken === "string" ? parsed.accessToken : "";
    const refreshToken = typeof parsed.refreshToken === "string" ? parsed.refreshToken : "";
    return accessToken && refreshToken ? { accessToken, refreshToken } : null;
  } catch {
    return null;
  }
}

export default function AuthCallbackClientPage() {
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;

    const finish = async () => {
      const requestUrl = new URL(window.location.href);
      const hashParams = readHashParams();
      const storedTokens = readStoredCallbackTokens();
      const getParam = (key: string) =>
        requestUrl.searchParams.get(key) ?? hashParams?.get(key) ?? null;
      const nextPath = normalizeNextPath(getParam("next"));
      const code = getParam("code");
      const tokenHash = getParam("token_hash");
      const type = getParam("type") as EmailOtpType | null;
      const accessToken = storedTokens?.accessToken ?? getParam("access_token");
      const refreshToken = storedTokens?.refreshToken ?? getParam("refresh_token");
      const callbackError =
        getParam("error") ?? getParam("error_code") ?? getParam("error_description");

      const fail = () => {
        if (!cancelled) {
          window.location.replace(buildLoginErrorHref(nextPath));
        }
      };

      try {
        if (callbackError) {
          fail();
          return;
        }

        if (code) {
          const result = await supabase.auth.exchangeCodeForSession(code);
          if (result.error) {
            fail();
            return;
          }
        } else if (tokenHash && type) {
          const result = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          });
          if (result.error) {
            fail();
            return;
          }
        } else if (accessToken && refreshToken) {
          const result = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (result.error) {
            fail();
            return;
          }
        } else {
          const existing = await supabase.auth.getUser();
          if (existing.error || !existing.data.user) {
            fail();
            return;
          }
        }

        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          fail();
          return;
        }

        if (!cancelled) {
          window.location.replace(buildAuthLandingHref(nextPath));
        }
      } catch {
        fail();
      }
    };

    void finish();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-5 py-14 md:px-8">
      <section className="rounded-2xl border border-[color:var(--line)] bg-white p-6 shadow-[0_20px_40px_rgba(16,26,42,0.1)] md:p-8">
        <p className="text-xs tracking-[0.14em] text-[color:var(--ink-soft)]">
          Authentifizierung
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">
          Anmeldung wird abgeschlossen
        </h1>
        <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
          Einen Moment bitte. Deine Session wird aufgebaut und du wirst direkt weitergeleitet.
        </p>
      </section>
    </main>
  );
}
