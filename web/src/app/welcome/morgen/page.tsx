import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PublicLanguageSwitcher } from "@/features/i18n/PublicLanguageSwitcher";
import { nextPathFor } from "@/features/profile/journey/journeyModel";
import { parseInterests } from "@/features/profile/interests";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * "Alles klar, bis morgen." - der Abschied nach "Gerade keine Zeit? Erinnere mich morgen".
 *
 * Alles ist gespeichert, der Account steht, und die Erinnerung ist eingeschaltet (das ist die ausdrueckliche Zustimmung
 * aus dem Knopf davor). Wer doch gleich Lust hat, kommt von hier in den ersten Schritt seines Bereichs.
 */
export default async function WelcomeLaterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getRequestUser();
  if (!user?.id) redirect(`/login?next=${encodeURIComponent("/welcome/morgen")}`);

  const { data: core } = await supabase.from("person_core").select("onboarding_completed_at, interests").eq("user_id", user.id).maybeSingle();
  if (!core?.onboarding_completed_at) redirect("/welcome");

  const t = await getTranslations("profile.journey.later");
  const goNow = nextPathFor({ areas: parseInterests((core.interests as unknown[] | null) ?? []), alignPlan: "first" });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(103,232,249,.14),transparent_38%),radial-gradient(circle_at_80%_10%,rgba(124,58,237,.09),transparent_32%)] px-4 py-8 md:px-8">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-4 flex justify-end">
          <PublicLanguageSwitcher />
        </div>
        <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_30px_80px_-30px_rgba(76,29,149,.25)] sm:p-9">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full bg-emerald-100">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            </span>
            {t("saved")}
          </p>
          <h1 className="mt-5 text-[2rem] font-extrabold leading-tight tracking-tight text-slate-950">{t("title")}</h1>
          <p className="mt-3 text-lg leading-8 text-slate-700">{t("text")}</p>
          <p className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 leading-7 text-slate-800">
            <strong>{t("meanwhileTitle")}</strong> {t("meanwhileText")}
          </p>
          <Link href={goNow} className="brand-cta mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-6 text-base font-semibold">{t("doNow")}</Link>
          <p className="mt-3 text-center text-xs leading-5 text-slate-600">{t("note")}</p>
        </section>
      </div>
    </main>
  );
}
