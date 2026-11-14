import { createClient } from "@supabase/supabase-js";
import { getTranslations } from "next-intl/server";
import { isValidReminderToken } from "@/features/onboarding/reminderToken";

export const dynamic = "force-dynamic";

/**
 * Abmelden von den Erinnerungs-Mails - aus der Mail, ohne Anmeldung.
 *
 * Der Abruf der Seite aendert nichts (Mail-Programme rufen Links vorab ab); erst der Knopf meldet ab. Der Link traegt
 * eine Unterschrift (`reminderToken.ts`) - ohne sie kann niemand eine fremde Adresse abmelden.
 */
async function stop(formData: FormData) {
  "use server";
  const userId = String(formData.get("u") ?? "");
  const token = String(formData.get("t") ?? "");
  const secret = process.env.CRON_SECRET?.trim() ?? "";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !isValidReminderToken(userId, token, secret)) return;
  const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  await client.from("onboarding_reminders").update({ wants_email: false, stopped_at: new Date().toISOString() }).eq("user_id", userId);
}

export default async function UnsubscribeReminderPage({ searchParams }: { searchParams: Promise<{ u?: string; t?: string; fertig?: string }> }) {
  const params = await searchParams;
  const t = await getTranslations("auth.reminderUnsubscribe");
  const secret = process.env.CRON_SECRET?.trim() ?? "";
  const valid = isValidReminderToken(params.u ?? "", params.t ?? "", secret);

  async function confirm(formData: FormData) {
    "use server";
    await stop(formData);
    const { redirect } = await import("next/navigation");
    redirect("/abmelden/erinnerung?fertig=1");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-5 py-14 md:px-8">
      <section className="rounded-2xl border border-[color:var(--line)] bg-white p-6 shadow-[0_20px_40px_rgba(16,26,42,0.1)] md:p-8">
        {params.fertig === "1" ? (
          <>
            <h1 className="text-2xl font-semibold text-[color:var(--ink)]">{t("doneTitle")}</h1>
            <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">{t("doneText")}</p>
          </>
        ) : valid ? (
          <form action={confirm}>
            <input type="hidden" name="u" value={params.u} />
            <input type="hidden" name="t" value={params.t} />
            <h1 className="text-2xl font-semibold text-[color:var(--ink)]">{t("title")}</h1>
            <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">{t("text")}</p>
            <button type="submit" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-[color:var(--ink)] px-5 text-sm font-semibold text-white">{t("button")}</button>
          </form>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-[color:var(--ink)]">{t("invalidTitle")}</h1>
            <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">{t("invalidText")}</p>
          </>
        )}
      </section>
    </main>
  );
}
