import { redirect } from "next/navigation";
import { type AuthErrorCode, normalizeNextPath } from "@/features/auth/authRedirects";
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
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const nextPath = normalizeNextPath(params.next);
  const errorMessage = authErrorMessage(params.error);

  if (user) {
    redirect(await resolvePostAuthRedirectPath(supabase, nextPath));
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-5 py-14 md:px-8">
      <section className="rounded-2xl border border-[color:var(--line)] bg-white p-6 shadow-[0_20px_40px_rgba(16,26,42,0.1)] md:p-8">
        <p className="text-xs tracking-[0.14em] text-[color:var(--ink-soft)]">Login</p>
        <h1 className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">CoFoundery Align</h1>
        <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
          Melde dich per Magic Link an. Es gibt keine Passwörter und keine anonymen Flows.
        </p>
        <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
          Wenn keine Mail ankommt, prüfe bitte auch deinen Spam-Ordner.
        </p>
        {errorMessage ? (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}
        <div className="mt-6">
          <MagicLinkForm nextPath={nextPath} />
        </div>
      </section>
    </main>
  );
}
