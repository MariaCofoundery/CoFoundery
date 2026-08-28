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
  const conversationPrompts = round.ownRevealComplete
    ? round.prompts.filter((prompt) =>
        round.conversationMarkers.some((marker) => marker.roundPromptId === prompt.roundPromptId)
      )
    : [];
  const partnerName = round.partner.displayName ?? t(
    round.status === "completed" ? "historicalPartnerFallback" : "partnerFallback"
  );
  const markerStatus = (roundPromptId: string) => {
    const participantIds = round.conversationMarkers.find(
      (marker) => marker.roundPromptId === roundPromptId
    )?.participantUserIds ?? [];
    const own = participantIds.includes(user.id);
    const partner = participantIds.includes(round.partner.userId);
    if (own && partner) return t("markerStatusBoth");
    if (partner) return t("markerStatusPartner", { name: partnerName });
    return t("markerStatusOwn");
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href={`/teams/${encodeURIComponent(teamId)}#collaboration-lab`} className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">{t("backToCollaboration")}</Link>
      <header className="rmm-enter relative mt-6 overflow-hidden rounded-[32px] border border-violet-200/80 bg-gradient-to-br from-violet-100 via-white to-amber-100/70 p-6 shadow-[0_28px_70px_rgba(76,29,149,0.14)] sm:p-9">
        <div aria-hidden="true" className="absolute -right-10 -top-12 h-52 w-52 rounded-full bg-violet-300/30 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-20 left-1/4 h-44 w-44 rounded-full bg-amber-200/35 blur-3xl" />
        <div className="relative">
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
            <div aria-hidden="true" className="relative mt-7 h-24 max-w-sm">
              <div className="absolute inset-x-8 top-4 h-16 rotate-[-2deg] rounded-2xl border border-amber-200 bg-amber-100/60" />
              <div className="absolute inset-x-4 top-2 h-16 rotate-[1.5deg] rounded-2xl border border-violet-200 bg-violet-100/70" />
              <div className="absolute inset-x-0 top-0 flex h-16 items-center justify-center rounded-2xl border border-white/80 bg-white/85 shadow-[0_16px_32px_rgba(76,29,149,0.12)]"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-amber-400 text-sm text-white">◇</span></div>
            </div>
            {nextPosition !== null ? <Link prefetch={false} href={`${revealHref}/${nextPosition}`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(109,40,217,0.2)] transition-[transform,box-shadow] duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_16px_34px_rgba(109,40,217,0.25)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2">{t(round.openedPromptPositions.length ? "resume" : "start")}</Link> : null}
          </>
        )}
        </div>
      </header>
      {conversationPrompts.length > 0 ? (
        <section className="mt-10" aria-labelledby="conversation-summary-title">
          <div className="rounded-[26px] border border-violet-200/80 bg-gradient-to-r from-violet-50 to-amber-50/70 p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Read My Mind</p><h2 id="conversation-summary-title" className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{t("conversationSummaryTitle")}</h2><p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{t("conversationSummaryIntro")}</p></div>
          <div className="mt-5 grid gap-4">
            {conversationPrompts.map((prompt) => (
              <article key={prompt.roundPromptId} className="group rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition-[transform,box-shadow,border-color] duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-violet-200 motion-safe:hover:shadow-[0_18px_38px_rgba(76,29,149,0.08)] motion-reduce:transition-none sm:p-6">
                <h3 className="text-lg font-semibold text-slate-950">{prompt.content.title[locale]}</h3>
                <p className="mt-2 text-sm font-medium text-violet-800">{markerStatus(prompt.roundPromptId)}</p>
                <ul className="mt-4 grid gap-2 text-sm leading-6 text-slate-700">
                  {["conversationQuestion1", "conversationQuestion2", "conversationQuestion3"].map((key) => (
                    <li key={key} className="flex gap-3"><span aria-hidden="true" className="text-violet-500">•</span><span>{t(key)}</span></li>
                  ))}
                </ul>
                <Link prefetch={false} href={`${revealHref}/${prompt.position}`} className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">{t("reviewConversationReveal")}</Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
