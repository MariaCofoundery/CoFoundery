import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { normalizeNextPath } from "@/features/auth/authRedirects";
import {
  BETA_ACCESS_REQUEST_EMAIL,
  getBetaAccessRequestHref,
  isValidBetaAccessCode,
} from "@/features/auth/betaAccess";
import { resolvePostAuthRedirectPath } from "@/features/auth/postAuthRedirect";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";
import { createClient } from "@/lib/supabase/server";

function buildStartHref(status: string, nextPath: string) {
  const params = new URLSearchParams({
    status,
    next: normalizeNextPath(nextPath),
  });
  return `/start?${params.toString()}`;
}

type AuthT = Awaited<ReturnType<typeof getTranslations>>;

function statusMessage(status: string | undefined, t: AuthT) {
  if (status === "sent") {
    return {
      tone: "neutral" as const,
      text: t("start.status.sent"),
    };
  }

  if (status === "invalid") {
    return {
      tone: "error" as const,
      text: t("start.status.invalid"),
    };
  }

  if (status === "send_failed") {
    return {
      tone: "error" as const,
      text: t("start.status.sendFailed"),
    };
  }

  return null;
}

export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; status?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("auth");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const nextPath = normalizeNextPath(params.next);
  const message = statusMessage(params.status, t);

  if (user) {
    redirect(await resolvePostAuthRedirectPath(supabase, nextPath));
  }

  async function sendStartMagicLinkAction(formData: FormData) {
    "use server";

    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const code = String(formData.get("betaCode") ?? "");
    const redirectNextPath = normalizeNextPath(String(formData.get("nextPath") ?? "/dashboard"));

    if (!email || !email.includes("@") || !isValidBetaAccessCode(code)) {
      redirect(buildStartHref("invalid", redirectNextPath));
    }

    const origin = getPublicAppOrigin();
    const redirectTo = new URL("/auth/callback", `${origin}/`);
    redirectTo.searchParams.set("next", redirectNextPath);

    const startClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          flowType: "implicit",
          persistSession: false,
        },
      }
    );

    const { error } = await startClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo.toString(),
        shouldCreateUser: true,
      },
    });

    if (error) {
      redirect(buildStartHref("send_failed", redirectNextPath));
    }

    redirect(buildStartHref("sent", redirectNextPath));
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-5 py-14 md:px-8">
      <section className="rounded-2xl border border-[color:var(--line)] bg-white p-6 shadow-[0_20px_40px_rgba(16,26,42,0.1)] md:p-8">
        <p className="text-xs tracking-[0.14em] text-[color:var(--ink-soft)]">
          {t("start.eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">
          {t("start.title")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
          {t("start.subtitle")}
        </p>
        <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
          {t("start.existingAccess")}
        </p>
        {message ? (
          <p
            className={`mt-3 rounded-md px-3 py-2 text-sm ${
              message.tone === "error" ? "bg-red-50 text-red-700" : "bg-slate-50 text-slate-700"
            }`}
          >
            {message.text}
          </p>
        ) : null}
        <form action={sendStartMagicLinkAction} className="mt-6 grid gap-3">
          <input type="hidden" name="nextPath" value={nextPath} />
          <label htmlFor="start-email" className="text-sm font-medium text-[color:var(--ink)]">
            {t("start.emailLabel")}
          </label>
          <input
            id="start-email"
            name="email"
            type="email"
            required
            placeholder={t("start.emailPlaceholder")}
            className="rounded-lg border border-[color:var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[color:var(--ink-soft)]"
          />
          <label htmlFor="beta-code" className="mt-2 text-sm font-medium text-[color:var(--ink)]">
            {t("start.codeLabel")}
          </label>
          <input
            id="beta-code"
            name="betaCode"
            type="text"
            required
            placeholder={t("start.codePlaceholder")}
            className="rounded-lg border border-[color:var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[color:var(--ink-soft)]"
          />
          <button
            type="submit"
            className="mt-2 rounded-lg bg-[color:var(--ink)] px-4 py-3 text-sm font-semibold text-white"
          >
            {t("start.submit")}
          </button>
        </form>
        <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
          <Link
            href={`/login?next=${encodeURIComponent(nextPath)}`}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            {t("start.loginLink")}
          </Link>
          <a
            href={getBetaAccessRequestHref()}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            {t("start.requestAccess")}
          </a>
        </div>
        <p className="mt-3 text-xs text-slate-500">{BETA_ACCESS_REQUEST_EMAIL}</p>
      </section>
    </main>
  );
}
