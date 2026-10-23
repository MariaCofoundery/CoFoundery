import Link from "next/link";
import { TeamUnavailable } from "@/features/access/TeamUnavailable";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { abandonReadMyMindRoundAction, declineReadMyMindRoundAction, joinReadMyMindRoundAction, lockReadMyMindPromptAction, notifyReadMyMindHandoffsAction } from "@/features/collaborationLab/readMyMindActions";
import { ReadMyMindEndControl } from "@/features/collaborationLab/ReadMyMindEndControl";
import { ReadMyMindHandoffVisual, ReadMyMindProgress } from "@/features/collaborationLab/ReadMyMindExperienceVisuals";
import { ReadMyMindPromptForm } from "@/features/collaborationLab/ReadMyMindPromptForm";
import { getReadMyMindRound, getReadMyMindTeamContext } from "@/features/collaborationLab/readMyMindData";
import { fillReadMyMindTarget } from "@/features/collaborationLab/readMyMindModel";
import { shouldShowReadMyMindIntro } from "@/features/collaborationLab/readMyMindPackNavigation";
import { normalizeLocale } from "@/i18n/config";
import { createClient, getRequestUser } from "@/lib/supabase/server";

export default async function ReadMyMindRoundPage({ params, searchParams }: { params: Promise<{ teamId: string; roundId: string }>; searchParams: Promise<{ prompt?: string; result?: string; intro?: string }> }) {
  const [{ teamId, roundId }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: { user } } = await getRequestUser();
  const href = `/teams/${encodeURIComponent(teamId)}/collaboration-lab/read-my-mind/${encodeURIComponent(roundId)}`;
  if (!user) redirect(`/login?next=${encodeURIComponent(href)}`);
  const team = await getReadMyMindTeamContext(teamId, user.id, supabase);
  if (!team) return <TeamUnavailable teamId={teamId} />;
  const round = await getReadMyMindRound(team, roundId, user.id, supabase);
  if (!round) notFound();
  const [t, rawLocale] = await Promise.all([getTranslations("collaborationLab.round"), getLocale()]);
  const locale = normalizeLocale(rawLocale);
  const partnerName = round.partner.displayName ?? t(round.status === "completed" ? "historicalPartnerFallback" : "partnerFallback");
  const abandon = abandonReadMyMindRoundAction.bind(null, teamId, roundId);
  const shell = (children: React.ReactNode) => (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <nav className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm" aria-label={t("navigationLabel")}>
        <Link href={`/teams/${encodeURIComponent(teamId)}#collaboration-lab`} className="text-xs font-medium text-[#5f5e7a] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9a82e8]">{t("collaborationBreadcrumb")}</Link>
        <span aria-hidden="true" className="text-[#d8d5ea]">›</span>
        <Link href={`/teams/${encodeURIComponent(teamId)}/collaboration-lab/read-my-mind`} className="font-semibold text-[#4a2fb8] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9a82e8]">{t("backToReadMyMind")}</Link>
      </nav>
      <header className="brand-panel relative mt-5 overflow-hidden rounded-[28px] px-6 py-6 sm:px-9">
        <span aria-hidden="true" className="orb -top-14 right-10 hidden h-36 w-36 md:block" />
        <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-white opacity-90">Read My Mind</p>
        <h1 className="mt-0.5 text-2xl font-semibold sm:text-[28px]">{round.pack.title[locale]}</h1>
      </header>
      {query.result && ["changed", "locked", "invalid", "unavailable"].includes(query.result) ? <p role="alert" className="mt-4 rounded-xl border border-[#f3dca0] bg-[#fff8e6] px-4 py-3 text-sm text-[#5c3200]">{t(`errors.${query.result}`)}</p> : null}
      {children}
    </main>
  );
  if (round.status === "abandoned") return shell(<section className="mt-6 rounded-2xl border border-[#e4e2f0] bg-white p-6"><h2 className="text-xl font-semibold">{t("endedTitle")}</h2><p className="mt-2 text-sm text-[#5f5e7a]">{t("endedText")}</p></section>);
  if (round.status === "completed") return shell(<section className="mt-6 rounded-2xl border border-[#e4e2f0] bg-white p-6"><h2 className="text-xl font-semibold">{t("completedTitle")}</h2><div className="mt-5 flex flex-wrap gap-3"><Link prefetch={false} href={`${href}/reveal`} className="inline-flex min-h-11 items-center rounded-xl brand-cta px-5 py-3 text-sm font-semibold">{t("readyAction")}</Link>{team.members.length === 2 ? <Link href={`/teams/${encodeURIComponent(teamId)}/collaboration-lab/read-my-mind`} className="inline-flex min-h-11 items-center rounded-xl border border-[#e4e2f0] px-5 py-3 text-sm font-semibold text-[#33325e]">{t("newRoundAction")}</Link> : null}</div></section>);
  if (round.status === "forming" && round.ownParticipantState === "pending" && !round.handoffReadyAt) return shell(
    <section className="rmm-enter mt-6 overflow-hidden rounded-[24px] border border-[#d9cff8]/80 bg-[#f5f2fe] p-6 "><h2 className="text-xl font-semibold">{t("partnerWaitingTitle", { name: partnerName })}</h2><p className="mt-3 text-sm leading-7 text-[#5f5e7a]">{t("partnerWaitingText", { name: partnerName })}</p><ReadMyMindHandoffVisual selfLabel={t("self")} partnerName={partnerName} /></section>
  );
  if (round.status === "forming" && round.ownParticipantState === "pending") return shell(
    <section className="rmm-enter mt-6 overflow-hidden rounded-[24px] border border-[#d9cff8]/80 bg-[#f5f2fe] p-6 "><h2 className="text-xl font-semibold">{t("inviteTitle", { name: partnerName })}</h2><p className="mt-3 text-sm leading-7 text-[#5f5e7a]">{t("inviteText")}</p><ReadMyMindHandoffVisual selfLabel={t("self")} partnerName={partnerName} /><div className="mt-6 flex flex-wrap gap-3"><form action={joinReadMyMindRoundAction.bind(null, teamId, roundId)}><button className="min-h-11 rounded-xl brand-cta px-5 py-2 text-sm font-semibold transition-transform motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-[#6d49e0]">{t("join")}</button></form><ReadMyMindEndControl action={declineReadMyMindRoundAction.bind(null, teamId, roundId)} label={t("decline")} confirmation={t("declineConfirm")} cancel={t("cancel")} /></div></section>
  );
  if (round.status === "forming" && round.handoffReadyAt) return shell(
    <section className="rmm-enter mt-6 overflow-hidden rounded-[24px] border border-[#d9cff8]/80 bg-[#f5f2fe] p-6 "><h2 className="text-xl font-semibold">{t("creatorCompleteTitle")}</h2><p className="mt-3 text-sm leading-7 text-[#5f5e7a]">{t("creatorCompleteText", { name: partnerName })}</p><p className="mt-2 text-sm text-[#5f5e7a]">{t("creatorCompleteHint", { name: partnerName })}</p><ReadMyMindHandoffVisual selfLabel={t("self")} partnerName={partnerName} /><div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap"><Link href={`/teams/${encodeURIComponent(teamId)}/collaboration-lab/read-my-mind`} className="inline-flex min-h-11 items-center justify-center rounded-xl brand-cta px-5 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] focus-visible:ring-offset-2">{t("chooseAnotherPack")}</Link>{round.handoffEmailClaimedAt === null ? <form action={notifyReadMyMindHandoffsAction.bind(null, teamId)}><button type="submit" className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#d9cff8] bg-white px-5 py-3 text-sm font-semibold text-[#4a2fb8] hover:bg-[#f5f2fe] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] focus-visible:ring-offset-2">{t("notifyPartner", { name: partnerName })}</button></form> : null}</div><aside className="mt-8 border-t border-[#e4e2f0] pt-5" aria-labelledby="rmm-more-options"><h3 id="rmm-more-options" className="text-sm font-semibold text-[#33325e]">{t("moreOptions")}</h3><p className="mt-1 text-xs leading-5 text-[#5f5e7a]">{t("discardHint")}</p><div className="mt-3"><ReadMyMindEndControl action={abandon} label={t("discard")} title={t("discardTitle")} confirmation={t("discardConfirm", { name: partnerName })} note={round.handoffEmailClaimedAt ? t("discardEmailNote", { name: partnerName }) : undefined} cancel={t("cancel")} variant="danger" /></div></aside></section>
  );
  if (round.wholeRoundAnswerComplete) return shell(<section className="rmm-enter relative mt-6 overflow-hidden rounded-[24px] border border-[#d9cff8] bg-[#f5f2fe] p-6  sm:p-8"><div aria-hidden="true" className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-[#d9cff8]/40 blur-3xl" /><div className="relative"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4a2fb8]">Read My Mind Reveal</p><h2 className="mt-3 text-2xl font-semibold tracking-tight">{t("readyTitle")}</h2><p className="mt-3 text-sm leading-7 text-[#5f5e7a]">{t("readyText")}</p><p className="mt-3 text-sm font-medium text-[#4a2fb8]">{t("readyStatus")}</p><Link prefetch={false} href={`${href}/reveal`} className="mt-6 inline-flex min-h-11 items-center rounded-xl brand-cta px-5 py-3 text-sm font-semibold transition-transform motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0]">{t("readyAction")}</Link></div></section>);
  if (round.ownAnswerComplete) return shell(<section className="rmm-enter mt-6 rounded-[24px] border border-[#e4e2f0] bg-[#f5f2fe]/60 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"><h2 className="text-xl font-semibold">{t("waitingTitle")}</h2><p className="mt-3 text-sm leading-7 text-[#5f5e7a]">{t("waitingText", { name: partnerName })}</p><p className="mt-3 text-sm font-medium text-[#4a2fb8]">{t("waitingStatus", { name: partnerName })}</p><ReadMyMindHandoffVisual selfLabel={t("self")} partnerName={partnerName} /><div className="mt-6"><ReadMyMindEndControl action={abandon} label={t("abandon")} confirmation={t("abandonConfirm", { name: partnerName })} cancel={t("cancel")} /></div></section>);

  if (shouldShowReadMyMindIntro(round, query.intro === "done")) return shell(
    <section className="rmm-enter relative mt-6 overflow-hidden rounded-[24px] border border-[#d9cff8] bg-[#f5f2fe] p-6  sm:p-9" aria-labelledby="rmm-intro-title">
      <div aria-hidden="true" className="absolute -right-10 -top-12 h-44 w-44 rounded-full bg-[#d9cff8]/45 blur-3xl" />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4a2fb8]">{t("introEyebrow")}</p>
        <h2 id="rmm-intro-title" className="mt-3 text-2xl font-semibold tracking-tight text-[#0b1f3a] sm:text-3xl">{t("introTitle")}</h2>
        <div aria-hidden="true" className="my-6 flex items-center gap-3"><span className="h-12 w-20 rounded-2xl border border-[#d9cff8] bg-[#f5f2fe] shadow-sm" /><span className="text-[#9a82e8]">↔</span><span className="h-12 w-20 rounded-2xl border border-[#f3dca0] bg-[#fff8e6] shadow-sm" /></div>
        <p className="max-w-2xl text-sm leading-7 text-[#33325e]">{t("introBodyGuess", { name: partnerName })}</p>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#33325e]">{t("introBodyReveal")}</p>
        <Link href={`${href}?intro=done`} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl brand-cta px-5 py-3 text-sm font-semibold transition-transform motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] focus-visible:ring-offset-2">{t("introAction")}</Link>
      </div>
    </section>
  );

  const requested = Number(query.prompt);
  const requestedPrompt = round.prompts.find((entry) => entry.position === requested);
  const current = requestedPrompt && (requestedPrompt.complete || requestedPrompt.position === round.nextPromptPosition) ? requestedPrompt : round.prompts.find((entry) => entry.position === round.nextPromptPosition);
  if (!current) return shell(null);
  const previous = round.prompts.filter((entry) => entry.complete && entry.position < current.position).at(-1);
  const nextComplete = round.prompts.find((entry) => entry.complete && entry.position > current.position);
  return shell(
    <section className="mt-6">
      <ReadMyMindProgress current={current.position + 1} total={round.prompts.length} label={t("progress", { current: current.position + 1, total: round.prompts.length })} />
      <article className="rmm-stage rmm-enter relative mt-5 overflow-hidden rounded-[24px] border border-[#e4e2f0] bg-white p-6 sm:p-9">
        <div aria-hidden="true" className="absolute -right-10 -top-14 h-48 w-48 rounded-full bg-[#d9cff8]/45 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-16 left-1/4 h-40 w-40 rounded-full bg-[#f3dca0]/30 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.19em] text-[#4a2fb8]">{round.pack.title[locale]} · {t("progress", { current: current.position + 1, total: round.prompts.length })}</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#0b1f3a] sm:text-4xl">{current.content.title[locale]}</h2>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-[#33325e] sm:text-xl sm:leading-9">{current.content.selfQuestion[locale]}</p>
        </div>
      </article>
      <ReadMyMindPromptForm action={lockReadMyMindPromptAction.bind(null, teamId, roundId, current.roundPromptId)} locale={locale} selfLegend={t("self")} guessLegend={`${t("guess", { name: partnerName })} ${fillReadMyMindTarget(current.content.guessQuestion[locale], partnerName)}`} needLegend={`${t("need")} ${current.content.needQuestion ? fillReadMyMindTarget(current.content.needQuestion[locale], partnerName) : ""}`} partnerName={partnerName} prompt={current} labels={{ saved: t("saved"), lockWarning: t("lockWarning"), submit: t("lock"), submitPending: t("locking"), multiHint: t("multiHint"), perspectiveShift: t("perspectiveShift"), perspectiveShiftText: t("perspectiveShiftText", { name: partnerName }), guessHelper: t("guessHelper") }} />
      <nav className="mt-5 flex justify-between gap-3" aria-label={t("progress", { current: current.position + 1, total: round.prompts.length })}>{previous ? <Link href={`${href}?prompt=${previous.position}`} className="text-sm font-medium text-[#5f5e7a] underline-offset-4 hover:underline">{t("previous")}</Link> : <span />}{nextComplete ? <Link href={`${href}?prompt=${nextComplete.position}`} className="text-sm font-medium text-[#5f5e7a] underline-offset-4 hover:underline">{t("next")}</Link> : null}</nav>
      <div className="mt-8"><ReadMyMindEndControl action={abandon} label={t("abandon")} confirmation={t(round.status === "forming" ? "abandonFormingConfirm" : "abandonConfirm", { name: partnerName })} cancel={t("cancel")} /></div>
    </section>
  );
}
