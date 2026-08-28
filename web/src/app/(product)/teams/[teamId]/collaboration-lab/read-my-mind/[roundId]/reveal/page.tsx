import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { completeReadMyMindRoundAction } from "@/features/collaborationLab/readMyMindActions";
import { getReadMyMindRound, getReadMyMindTeamContext } from "@/features/collaborationLab/readMyMindData";
import { normalizeLocale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";

export default async function ReadMyMindRevealEntryPage({ params, searchParams }: {
  params: Promise<{ teamId: string; roundId: string }>;
  searchParams: Promise<{ result?: string }>;
}) {
  const [{ teamId, roundId }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const roundHref = `/teams/${encodeURIComponent(teamId)}/collaboration-lab/read-my-mind/${encodeURIComponent(roundId)}`;
  const revealHref = `${roundHref}/reveal`;
  if (!user) redirect(`/login?next=${encodeURIComponent(revealHref)}`);
  const team = await getReadMyMindTeamContext(teamId, user.id, supabase);
  if (!team) notFound();
  const round = await getReadMyMindRound(team, roundId, user.id, supabase);
  if (!round) notFound();
  if (round.status === "abandoned" || !round.wholeRoundAnswerComplete) redirect(roundHref);
  const [t, rawLocale] = await Promise.all([getTranslations("collaborationLab.reveal"), getLocale()]);
  const locale = normalizeLocale(rawLocale);
  const firstPosition = round.prompts[0]?.position ?? 0;
  const nextPosition = round.nextRevealPosition;
  const complete = completeReadMyMindRoundAction.bind(null, teamId, roundId);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href={roundHref} className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">{t("back")}</Link>
      <header className="mt-6 overflow-hidden rounded-[30px] border border-violet-200/80 bg-gradient-to-br from-violet-100 via-white to-amber-100/70 p-6 shadow-[0_24px_60px_rgba(76,29,149,0.12)] sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">{t("eyebrow")}</p>
        <p className="mt-3 text-sm font-medium text-slate-600">{round.pack.title[locale]}</p>
        {round.status === "completed" ? (
          <>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{t("completedTitle")}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">{t("completedText")}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link prefetch={false} href={`${revealHref}/${firstPosition}`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2">{t("viewAgain")}</Link>
              {team.members.length === 2 ? <Link href={`/teams/${encodeURIComponent(teamId)}/collaboration-lab/read-my-mind`} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">{t("newRound")}</Link> : null}
            </div>
          </>
        ) : round.ownRevealComplete ? (
          <>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{t("allSeenTitle")}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">{query.result === "waiting" ? t("waiting") : t("allSeenText")}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <form action={complete}><button type="submit" className="min-h-12 rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2">{t("complete")}</button></form>
              <Link prefetch={false} href={`${revealHref}/${firstPosition}`} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">{t("viewAgain")}</Link>
              <Link href={`/teams/${encodeURIComponent(teamId)}`} className="inline-flex min-h-12 items-center px-2 text-sm font-medium text-slate-600 underline-offset-4 hover:underline">{t("teamOverview")}</Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{t("readyTitle")}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">{t("readyText")}</p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{t("readyNote")}</p>
            {nextPosition !== null ? <Link prefetch={false} href={`${revealHref}/${nextPosition}`} className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2">{t(round.openedPromptPositions.length ? "resume" : "start")}</Link> : null}
          </>
        )}
      </header>
    </main>
  );
}
