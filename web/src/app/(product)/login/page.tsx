import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { type AuthErrorCode, normalizeNextPath } from "@/features/auth/authRedirects";
import { resolvePostAuthRedirectPath } from "@/features/auth/postAuthRedirect";
import { MagicLinkForm } from "@/features/auth/MagicLinkForm";
import { createClient } from "@/lib/supabase/server";

type AuthT = Awaited<ReturnType<typeof getTranslations>>;

function authErrorMessage(error: string | undefined, t: AuthT) {
  const normalized = (error ?? "").trim() as AuthErrorCode | "";
  if (normalized === "magic_link_failed") {
    return t("login.errors.magicLinkFailed");
  }
  if (normalized === "auth_callback_failed") {
    return t("login.errors.authCallbackFailed");
  }
  return error ? t("login.errors.generic", { error }) : null;
}

function canCreateUserFromLogin(nextPath: string) {
  return (
    nextPath === "/join/continue" ||
    nextPath.startsWith("/join/continue?") ||
    nextPath.startsWith("/team-invite/") ||
    nextPath === "/advisor/invite/continue" ||
    nextPath.startsWith("/advisor/invite/continue?")
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("auth");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const nextPath = normalizeNextPath(params.next);
  const errorMessage = authErrorMessage(params.error, t);
  const shouldCreateUser = canCreateUserFromLogin(nextPath);

  if (user) {
    redirect(await resolvePostAuthRedirectPath(supabase, nextPath));
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-5 py-14 md:px-8">
      <section className="rounded-2xl border border-[color:var(--line)] bg-white p-6 shadow-[0_20px_40px_rgba(16,26,42,0.1)] md:p-8">
        <p className="text-xs tracking-[0.14em] text-[color:var(--ink-soft)]">
          {t("login.eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">
          {t("login.title")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
          {t("login.subtitle")}
        </p>
        <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
          {shouldCreateUser ? t("login.invitationSignupHint") : t("login.newUserHint")}
        </p>
        {errorMessage ? (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}
        <div className="mt-6">
          <MagicLinkForm nextPath={nextPath} shouldCreateUser={shouldCreateUser} />
        </div>
        <div className="mt-5 border-t border-slate-200 pt-5">
          <Link
            href={`/start?next=${encodeURIComponent(nextPath)}`}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            {t("login.startWithCode")}
          </Link>
        </div>
      </section>
    </main>
  );
}
