import Link from "next/link";
import { TeamUnavailable } from "@/features/access/TeamUnavailable";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { completeReadMyMindRoundAction } from "@/features/collaborationLab/readMyMindActions";
import { getReadMyMindRound, getReadMyMindTeamContext } from "@/features/collaborationLab/readMyMindData";
import { normalizeLocale } from "@/i18n/config";
import { GuessTallyCard } from "@/features/collaborationLab/GuessTallyCard";
import { findGuessTallyForRound, getCollaborationGuessTally } from "@/features/collaborationLab/guessTally";
import { createClient, getRequestUser } from "@/lib/supabase/server";

export default async function ReadMyMindRevealEntryPage({ params, searchParams }: {
  params: Promise<{ teamId: string; roundId: string }>;
  searchParams: Promise<{ result?: string }>;
}) {
  const [{ teamId, roundId }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: { user } } = await getRequestUser();
  const roundHref = `/teams/${encodeURIComponent(teamId)}/collaboration-lab/read-my-mind/${encodeURIComponent(roundId)}`;
  const revealHref = `${roundHref}/reveal`;
  if (!user) redirect(`/login?next=${encodeURIComponent(revealHref)}`);
  const team = await getReadMyMindTeamContext(teamId, user.id, supabase);
  if (!team) return <TeamUnavailable teamId={teamId} />;
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
  const tally = await getCollaborationGuessTally(supabase, teamId);
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
      <nav className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm" aria-label={t("navigationLabel")}>
        <Link href={`/teams/${encodeURIComponent(teamId)}#collaboration-lab`} className="text-xs font-medium text-[#5f5e7a] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9a82e8]">{t("collaborationBreadcrumb")}</Link>
        <span aria-hidden="true" className="text-[#d8d5ea]">›</span>
        <Link href={`/teams/${encodeURIComponent(teamId)}/collaboration-lab/read-my-mind`} className="font-semibold text-[#4a2fb8] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9a82e8]">{t("backToReadMyMind")}</Link>
      </nav>
      <header className="rmm-enter brand-panel relative mt-5 overflow-hidden rounded-[28px] px-6 py-8 sm:px-9">
        <span aria-hidden="true" className="orb -top-14 right-10 hidden h-40 w-40 md:block" />
        <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white opacity-90">{t("eyebrow")}</p>
        <p className="mt-3 text-sm font-medium text-white opacity-90">{round.pack.title[locale]}</p>
        {round.status === "completed" ? (
          <>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{t("completedTitle")}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white opacity-95">{t("completedText")}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link prefetch={false} href={`${revealHref}/${firstPosition}`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white text-[#4a2fb8] px-5 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] focus-visible:ring-offset-2">{t("viewAgain")}</Link>
              {team.members.length === 2 ? <Link href={`/teams/${encodeURIComponent(teamId)}/collaboration-lab/read-my-mind`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white/20 px-5 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b89aa]">{t("newRound")}</Link> : null}
            </div>
          </>
        ) : round.ownRevealComplete ? (
          <>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{t("allSeenTitle")}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white opacity-95">{query.result === "waiting" ? t("waiting") : t("allSeenText")}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <form action={complete}><button type="submit" className="min-h-12 rounded-xl bg-white text-[#4a2fb8] px-5 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] focus-visible:ring-offset-2">{t("complete")}</button></form>
              <Link prefetch={false} href={`${revealHref}/${firstPosition}`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white/20 px-5 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b89aa]">{t("viewAgain")}</Link>
              <Link href={`/teams/${encodeURIComponent(teamId)}`} className="inline-flex min-h-12 items-center px-2 text-sm font-medium text-white opacity-90 underline-offset-4 hover:underline">{t("teamOverview")}</Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{t("readyTitle")}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white opacity-95">{t("readyText")}</p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white opacity-90">{t("readyNote")}</p>
            <div aria-hidden="true" className="relative mt-7 h-24 max-w-sm">
              <div className="absolute inset-x-8 top-4 h-16 rotate-[-2deg] rounded-2xl border border-[#f3dca0] bg-[#fdecc8]/60" />
              <div className="absolute inset-x-4 top-2 h-16 rotate-[1.5deg] rounded-2xl border border-[#d9cff8] bg-[#efeafd]/70" />
              <div className="absolute inset-x-0 top-0 flex h-16 items-center justify-center rounded-2xl border border-white/80 bg-white/85 "><span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#6d49e0] to-sky-600 text-sm text-white">◇</span></div>
            </div>
            {nextPosition !== null ? <Link prefetch={false} href={`${revealHref}/${nextPosition}`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white text-[#4a2fb8] px-5 py-3 text-sm font-semibold transition-[transform,box-shadow] duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] focus-visible:ring-offset-2">{t(round.openedPromptPositions.length ? "resume" : "start")}</Link> : null}
          </>
        )}
        </div>
      </header>
      {/* Dieselbe Bilanz wie in Founder in the Wild - beide Labs lassen raten,
          also soll auch beide dasselbe daraus machen. */}
      <GuessTallyCard round={findGuessTallyForRound(tally, roundId)} summary={tally} partnerName={partnerName} />
      {conversationPrompts.length > 0 ? (
        <section className="mt-10" aria-labelledby="conversation-summary-title">
          <div className="rounded-[24px] border border-[#d9cff8]/80 bg-[#f5f2fe] p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4a2fb8]">Read My Mind</p><h2 id="conversation-summary-title" className="mt-2 text-2xl font-semibold tracking-tight text-[#0b1f3a]">{t("conversationSummaryTitle")}</h2><p className="mt-2 max-w-2xl text-sm leading-7 text-[#5f5e7a]">{t("conversationSummaryIntro")}</p></div>
          <div className="mt-5 grid gap-4">
            {conversationPrompts.map((prompt) => (
              <article key={prompt.roundPromptId} className="group rounded-[24px] border border-[#e4e2f0] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition-[transform,box-shadow,border-color] duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-[#d9cff8] motion-safe:hover: motion-reduce:transition-none sm:p-6">
                <h3 className="text-lg font-semibold text-[#0b1f3a]">{prompt.content.title[locale]}</h3>
                <p className="mt-2 text-sm font-medium text-[#4a2fb8]">{markerStatus(prompt.roundPromptId)}</p>
                <ul className="mt-4 grid gap-2 text-sm leading-6 text-[#33325e]">
                  {["conversationQuestion1", "conversationQuestion2", "conversationQuestion3"].map((key) => (
                    <li key={key} className="flex gap-3"><span aria-hidden="true" className="text-[#6d49e0]">•</span><span>{t(key)}</span></li>
                  ))}
                </ul>
                <Link prefetch={false} href={`${revealHref}/${prompt.position}`} className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-[#4a2fb8] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0]">{t("reviewConversationReveal")}</Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
