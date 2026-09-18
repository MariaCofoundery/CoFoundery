import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { startFounderInTheWildRoundAction } from "@/features/founderInTheWild/founderInTheWildActions";
import { findOpenFounderInTheWildRound, getFounderInTheWildTeam } from "@/features/founderInTheWild/founderInTheWildData";
import { founderInTheWildEntryHref, founderInTheWildRoundHref } from "@/features/founderInTheWild/founderInTheWildRoutes";
import { FOUNDER_IN_THE_WILD_PACKS } from "@/features/founderInTheWild/founderInTheWildContent";
import { normalizeLocale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";

export default async function FounderInTheWildEntryPage({ params, searchParams }: { params: Promise<{ teamId: string }>; searchParams: Promise<{ result?: string }> }) {
  const [{ teamId }, query] = await Promise.all([params, searchParams]);
  const href = founderInTheWildEntryHref(teamId);
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(href)}`);
  const team = await getFounderInTheWildTeam(teamId, user.id, supabase); if (!team) notFound();
  const [t, round, rawLocale] = await Promise.all([getTranslations("founderInTheWild.entry"), findOpenFounderInTheWildRound(team, user.id, supabase), getLocale()]);
  const locale = normalizeLocale(rawLocale);
  return <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
    <Link href={`/teams/${encodeURIComponent(teamId)}#collaboration-lab`} className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-violet-500">{t("back")}</Link>
    <header className="mt-6 rounded-[30px] border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-violet-50 p-6 shadow-[0_20px_50px_rgba(76,29,149,0.08)] sm:p-9"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">{t("eyebrow")}</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{t("title")}</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700">{t("intro")}</p></header>
    {query.result ? <p role="status" className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">{t(query.result === "unavailable" ? "twoFounders" : query.result === "discarded" ? "discarded" : query.result === "declined" ? "declined" : "changed")}</p> : null}
    {/* Zwei Packs statt eines: "Unter Druck" allein war einmal gespielt und
        dann vorbei. Eine laufende Runde blockiert beide - man spielt nicht
        zwei gleichzeitig. */}
    <div className="mt-6 grid gap-4">
      {FOUNDER_IN_THE_WILD_PACKS.map((pack) => {
        const isOpen = round?.pack.key === pack.key;
        return (
          <section key={pack.key} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{pack.title[locale]}</p>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{pack.description[locale]}</p>
              {pack.hasGuess ? (
                <p className="mt-2 inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-900">{t("withGuess")}</p>
              ) : null}
            </div>
            {team.members.length !== 2 ? (
              <p className="text-sm text-slate-600">{t("twoFounders")}</p>
            ) : round && isOpen ? (
              <Link href={founderInTheWildRoundHref(teamId, round.id)} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white">
                {t(round.ownAnswerComplete ? "status" : "continue")}
              </Link>
            ) : round ? (
              <p className="shrink-0 text-sm text-slate-500">{t("otherRoundOpen")}</p>
            ) : (
              <form action={startFounderInTheWildRoundAction.bind(null, teamId, pack.key)}>
                <button type="submit" className="min-h-11 shrink-0 rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white focus-visible:ring-2 focus-visible:ring-violet-500">
                  {t("start")}
                </button>
              </form>
            )}
          </section>
        );
      })}
    </div>
  </main>;
}
