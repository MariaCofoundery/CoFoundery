"use client";

import { type EmailOtpType } from "@supabase/supabase-js";
import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { normalizeNextPath } from "@/features/auth/authRedirects";
import { createClient } from "@/lib/supabase/client";

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

export default function AuthCallbackClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;

    const finish = async () => {
      const nextPath = normalizeNextPath(searchParams.get("next"));
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type") as EmailOtpType | null;
      const accessToken = searchParams.get("access_token");
      const refreshToken = searchParams.get("refresh_token");

      const fail = () => {
        if (!cancelled) {
          router.replace(buildLoginErrorHref(nextPath));
        }
      };

      try {
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
          router.replace(buildAuthLandingHref(nextPath));
          router.refresh();
        }
      } catch {
        fail();
      }
    };

    void finish();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams, supabase]);

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
