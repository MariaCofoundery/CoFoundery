import { getTranslations } from "next-intl/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { WELCOME_LETTER_VERSION } from "@/features/profile/welcomeLetterVersion";
import { WelcomeLetter } from "@/features/profile/WelcomeLetter";
import { confirmWelcomeLetterAction } from "@/features/profile/welcomeLetterActions";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * Der Begruessungsbrief, einmal fuer alle, die ihn noch nicht kennen.
 *
 * Neue Konten sehen ihn im Einstieg (/welcome) und werden dort mit
 * eingetragen. Hier geht es um alle anderen: wer schon laenger dabei ist,
 * liest ihn beim naechsten Besuch genau einmal - vor allem wegen der
 * Umgangsregeln. Gezeigt wird nur nach abgeschlossenem Einstieg, sonst kaeme
 * der Brief doppelt.
 *
 * Ein Lesefehler heisst: nicht zeigen. Ein Brief, der bei jedem Fehler
 * wiederkommt, waere die Forschungsfrage vom 29.09. noch einmal.
 */
export async function WelcomeLetterGate({ client, userId }: { client: SupabaseClient; userId: string }) {
  const { data, error } = await client
    .from("person_core")
    .select("onboarding_completed_at, welcome_letter_version")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data?.onboarding_completed_at || (data.welcome_letter_version ?? 0) >= WELCOME_LETTER_VERSION) return null;

  const t = await getTranslations("profile.welcomeLetter");
  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-50 print:hidden" role="dialog" aria-modal="true" aria-labelledby="welcome-letter-title">
      <div className="mx-auto w-full max-w-3xl px-5 py-10 md:py-14">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">{t("returningEyebrow")}</p>
        <h2 id="welcome-letter-title" className="mt-2 text-3xl font-semibold text-slate-950">{t("returningTitle")}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{t("returningIntro")}</p>
        <WelcomeLetter />
        <form action={confirmWelcomeLetterAction} className="mt-6 flex justify-end">
          <SubmitButton
            label={t("returningConfirm")}
            pendingLabel={t("returningSaving")}
            className="inline-flex min-h-11 items-center rounded-full bg-[linear-gradient(120deg,var(--brand-accent),var(--brand-primary))] px-6 text-sm font-semibold text-slate-900 shadow-[0_10px_28px_rgba(124,58,237,0.16)] transition hover:brightness-105 disabled:opacity-60"
          />
        </form>
      </div>
    </div>
  );
}
