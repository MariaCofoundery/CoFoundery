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
import {
  issueNetworkSignupIntent,
  revokeNetworkSignupIntent,
} from "@/features/auth/networkSignup";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";
import { createClient } from "@/lib/supabase/server";

const SIGNUP_INTENTS = ["founder", "advisor", "network"] as const;
type SignupIntent = (typeof SIGNUP_INTENTS)[number];

function normalizeSignupIntent(value: string | null | undefined): SignupIntent {
  return SIGNUP_INTENTS.includes(value as SignupIntent) ? value as SignupIntent : "founder";
}

function buildStartHref(status: string, nextPath: string, intent: SignupIntent) {
  const params = new URLSearchParams({
    status,
    next: normalizeNextPath(nextPath),
    intent,
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

  if (status === "network_failed") {
    return {
      tone: "error" as const,
      text: t("start.status.networkFailed"),
    };
  }

  return null;
}

export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string; next?: string; status?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("auth");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const nextPath = normalizeNextPath(params.next);
  const selectedIntent = normalizeSignupIntent(params.intent);
  const message = statusMessage(params.status, t);

  if (user) {
    const destination = await resolvePostAuthRedirectPath(supabase, nextPath);
    if (destination !== "/start") redirect(destination);
  }

  async function sendStartMagicLinkAction(formData: FormData) {
    "use server";

    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const code = String(formData.get("betaCode") ?? "");
    const intent = normalizeSignupIntent(String(formData.get("intent") ?? "founder"));
    const redirectNextPath = normalizeNextPath(String(formData.get("nextPath") ?? "/dashboard"));

    if (!email || !email.includes("@") || !isValidBetaAccessCode(code)) {
      redirect(buildStartHref("invalid", redirectNextPath, intent));
    }

    const origin = getPublicAppOrigin();
    const redirectTo = new URL("/auth/callback", `${origin}/`);
    let networkSignupToken: string | null = null;
    if (intent === "network") {
      networkSignupToken = await issueNetworkSignupIntent(email);
      if (!networkSignupToken) {
        redirect(buildStartHref("send_failed", redirectNextPath, intent));
      }
      redirectTo.searchParams.set("next", "/network/profile");
      redirectTo.searchParams.set("network_signup_token", networkSignupToken);
    } else {
      redirectTo.searchParams.set("next", redirectNextPath);
      redirectTo.searchParams.set("profile_signup_intent", intent);
    }

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
      if (networkSignupToken) await revokeNetworkSignupIntent(networkSignupToken);
      redirect(buildStartHref("send_failed", redirectNextPath, intent));
    }

    redirect(buildStartHref("sent", redirectNextPath, intent));
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
          <fieldset className="grid gap-3">
            <legend className="text-sm font-medium text-[color:var(--ink)]">
              {t("start.intentLegend")}
            </legend>
            {SIGNUP_INTENTS.map((intent) => (
              <label
                key={intent}
                className="flex cursor-pointer gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300"
              >
                <input
                  type="radio"
                  name="intent"
                  value={intent}
                  defaultChecked={intent === selectedIntent}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">
                    {t(`start.intents.${intent}.title`)}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">
                    {t(`start.intents.${intent}.description`)}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
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
