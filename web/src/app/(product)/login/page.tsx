import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { type AuthErrorCode, normalizeNextPath } from "@/features/auth/authRedirects";
import {
  BETA_ACCESS_COOKIE_NAME,
  getBetaAccessRequestHref,
  hasBetaAccessCookie,
  isInviteBypassPath,
  isValidBetaAccessCode,
} from "@/features/auth/betaAccess";
import { resolvePostAuthRedirectPath } from "@/features/auth/postAuthRedirect";
import { MagicLinkForm } from "@/features/auth/MagicLinkForm";
import { createClient } from "@/lib/supabase/server";

function authErrorMessage(error: string | undefined) {
  const normalized = (error ?? "").trim() as AuthErrorCode | "";
  if (normalized === "magic_link_failed") {
    return "Der Magic Link konnte nicht bestätigt werden. Bitte fordere einen neuen Link an.";
  }
  if (normalized === "auth_callback_failed") {
    return "Die Anmeldung konnte nicht abgeschlossen werden. Bitte versuche es erneut.";
  }
  return error ? `Anmeldefehler: ${error}` : null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ beta?: string; error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const nextPath = normalizeNextPath(params.next);
  const errorMessage = authErrorMessage(params.error);
  const cookieStore = await cookies();
  const betaAccessGranted = hasBetaAccessCookie(cookieStore);
  const inviteBypass = isInviteBypassPath(nextPath);
  const betaGateRequired = !betaAccessGranted && !inviteBypass;
  const betaError =
    params.beta === "invalid"
      ? "Dieser Zugangscode ist aktuell nicht freigeschaltet."
      : null;

  if (user) {
    redirect(await resolvePostAuthRedirectPath(supabase, nextPath));
  }

  async function unlockBetaAccessAction(formData: FormData) {
    "use server";

    const code = String(formData.get("betaCode") ?? "");
    const redirectNextPath = normalizeNextPath(String(formData.get("nextPath") ?? "/dashboard"));

    if (!isValidBetaAccessCode(code)) {
      redirect(`/login?beta=invalid&next=${encodeURIComponent(redirectNextPath)}`);
    }

    const actionCookieStore = await cookies();
    actionCookieStore.set(BETA_ACCESS_COOKIE_NAME, "granted", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    redirect(`/login?next=${encodeURIComponent(redirectNextPath)}`);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-5 py-14 md:px-8">
      <section className="rounded-2xl border border-[color:var(--line)] bg-white p-6 shadow-[0_20px_40px_rgba(16,26,42,0.1)] md:p-8">
        <p className="text-xs tracking-[0.14em] text-[color:var(--ink-soft)]">Login</p>
        <h1 className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">CoFoundery Align</h1>
        {betaGateRequired ? (
          <>
            <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
              Cofoundery befindet sich aktuell in einer kontrollierten Testphase.
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              Du benötigst aktuell einen Zugangscode.
            </p>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
              Melde dich per Magic Link an. Es gibt keine Passwörter und keine anonymen Flows.
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              Wenn keine Mail ankommt, prüfe bitte auch deinen Spam-Ordner.
            </p>
          </>
        )}
        {errorMessage ? (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}
        {betaGateRequired ? (
          <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-5">
            {betaError ? (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{betaError}</p>
            ) : null}
            <form action={unlockBetaAccessAction} className="grid gap-3">
              <input type="hidden" name="nextPath" value={nextPath} />
              <label
                htmlFor="beta-code"
                className="text-sm font-medium text-[color:var(--ink)]"
              >
                Zugangscode
              </label>
              <input
                id="beta-code"
                name="betaCode"
                type="text"
                required
                placeholder="Code eingeben"
                className="rounded-lg border border-[color:var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[color:var(--ink-soft)]"
              />
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg bg-[color:var(--ink)] px-4 py-3 text-sm font-semibold text-white"
                >
                  Zugang öffnen
                </button>
                <a
                  href={getBetaAccessRequestHref()}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Zugang anfragen
                </a>
              </div>
            </form>
          </div>
        ) : (
          <div className="mt-6">
            <MagicLinkForm nextPath={nextPath} />
          </div>
        )}
      </section>
    </main>
  );
}
