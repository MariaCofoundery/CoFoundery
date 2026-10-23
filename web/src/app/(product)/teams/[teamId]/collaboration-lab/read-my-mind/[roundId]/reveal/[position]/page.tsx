import Link from "next/link";
import { TeamUnavailable } from "@/features/access/TeamUnavailable";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { completeReadMyMindRoundAction, markReadMyMindConversationAction, openReadMyMindRevealAction, unmarkReadMyMindConversationAction } from "@/features/collaborationLab/readMyMindActions";
import { ConversationMarkerButton } from "@/features/collaborationLab/ConversationMarkerButton";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { getOpenedReadMyMindPromptReveal, getReadMyMindRound, getReadMyMindTeamContext } from "@/features/collaborationLab/readMyMindData";
import type { ReadMyMindResponseContract } from "@/features/collaborationLab/readMyMindContent";
import { ReadMyMindProgress } from "@/features/collaborationLab/ReadMyMindExperienceVisuals";
import { normalizeLocale } from "@/i18n/config";
import { createClient, getRequestUser } from "@/lib/supabase/server";

function ChoiceList({ keys, contract, locale }: { keys: string[]; contract: ReadMyMindResponseContract; locale: "de" | "en" }) {
  const labels = keys.map((key) => contract.choices.find((choice) => choice.key === key)?.label[locale]).filter((label): label is string => Boolean(label));
  return <ul className="mt-3 grid gap-2.5">{labels.map((label) => <li key={label} className="rounded-2xl border border-[#e4e2f0]/90 bg-white/90 px-4 py-3.5 text-sm leading-6 text-[#33325e] shadow-sm">{label}</li>)}</ul>;
}

function ComparisonLabel({ children, tone }: { children: React.ReactNode; tone: "violet" | "amber" | "neutral" }) {
  const colors = tone === "violet"
    ? "border-[#d9cff8] bg-[#efeafd]/80 text-[#3a2394]"
    : tone === "amber"
      ? "border-[#c9e0f2] bg-[#e1effa]/80 text-[#0b5a8a]"
      : "border-[#e4e2f0] bg-[#f1f0f7] text-[#33325e]";
  return <p className={`mt-5 inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${colors}`}>{children}</p>;
}

export default async function ReadMyMindPromptRevealPage({ params }: { params: Promise<{ teamId: string; roundId: string; position: string }> }) {
  const { teamId, roundId, position: rawPosition } = await params;
  const position = Number(rawPosition);
  if (!Number.isInteger(position) || position < 0 || position > 4) notFound();
  const supabase = await createClient();
  const { data: { user } } = await getRequestUser();
  const roundHref = `/teams/${encodeURIComponent(teamId)}/collaboration-lab/read-my-mind/${encodeURIComponent(roundId)}`;
  const revealHref = `${roundHref}/reveal`;
  if (!user) redirect(`/login?next=${encodeURIComponent(`${revealHref}/${position}`)}`);
  const team = await getReadMyMindTeamContext(teamId, user.id, supabase);
  if (!team) return <TeamUnavailable teamId={teamId} />;
  const round = await getReadMyMindRound(team, roundId, user.id, supabase);
  const prompt = round?.prompts.find((entry) => entry.position === position);
  if (!round || !prompt) notFound();
  if (round.status === "abandoned" || !round.wholeRoundAnswerComplete) redirect(roundHref);
  const [t, rawLocale] = await Promise.all([getTranslations("collaborationLab.reveal"), getLocale()]);
  const locale = normalizeLocale(rawLocale);
  const partnerName = round.partner.displayName ?? t(round.status === "completed" ? "historicalPartnerFallback" : "partnerFallback");
  const opened = round.openedPromptPositions.includes(position);
  const openedData = opened ? await getOpenedReadMyMindPromptReveal({ team, roundId, position, currentUserId: user.id, client: supabase }) : null;
  const reveal = openedData?.reveal ?? null;
  const previous = [...round.openedPromptPositions].filter((entry) => entry < position).sort((a, b) => b - a)[0];
  const next = round.prompts.find((entry) => entry.position > position)?.position;
  const comparison = (exact: boolean) => prompt.content.selfGuess.format === "multi_choice" ? t("multiComparison") : t(exact ? "exact" : "different");
  const comparisonTone = (exact: boolean) => prompt.content.selfGuess.format === "multi_choice" ? "neutral" as const : exact ? "violet" as const : "amber" as const;
  const markerParticipantIds = round.conversationMarkers.find(
    (marker) => marker.roundPromptId === prompt.roundPromptId
  )?.participantUserIds ?? [];
  const ownMarked = markerParticipantIds.includes(user.id);
  const partnerMarked = markerParticipantIds.includes(round.partner.userId);
  const markerStatus = ownMarked && partnerMarked
    ? t("markerStatusBoth")
    : partnerMarked
      ? t("markerStatusPartner", { name: partnerName })
      : ownMarked
        ? t("markerStatusOwn")
        : null;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <nav className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm" aria-label={t("navigationLabel")}>
        <Link href={`/teams/${encodeURIComponent(teamId)}#collaboration-lab`} className="text-xs font-medium text-[#5f5e7a] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9a82e8]">{t("collaborationBreadcrumb")}</Link>
        <span aria-hidden="true" className="text-[#d8d5ea]">›</span>
        <Link href={`/teams/${encodeURIComponent(teamId)}/collaboration-lab/read-my-mind`} className="font-semibold text-[#4a2fb8] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9a82e8]">{t("backToReadMyMind")}</Link>
      </nav>
      <div className="mt-6"><ReadMyMindProgress current={position + 1} total={round.prompts.length} label={t("progress", { current: position + 1, total: round.prompts.length })} /></div>
      <header className="rmm-stage rmm-enter relative mt-5 overflow-hidden rounded-[24px] border border-[#e4e2f0] bg-white p-6 sm:p-9">
        <div className="relative"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4a2fb8]">{t("eyebrow")}</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#0b1f3a] sm:text-4xl">{prompt.content.title[locale]}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[#33325e] sm:text-lg sm:leading-8">{prompt.content.selfQuestion[locale]}</p></div>
      </header>

      {!opened ? (
        <section className="rmm-sealed rmm-enter relative mt-6 overflow-hidden rounded-[24px] border border-[#d9cff8] bg-white p-6 text-center  sm:p-10" aria-labelledby="reveal-open-title">
          <div aria-hidden="true" className="absolute inset-x-8 top-5 h-24 rotate-[-1.5deg] rounded-[24px] border border-[#c9e0f2]/70 bg-[#e1effa]/50" />
          <div aria-hidden="true" className="absolute inset-x-5 top-3 h-24 rotate-[1deg] rounded-[24px] border border-[#d9cff8]/70 bg-[#efeafd]/60" />
          <div className="relative rounded-[24px] border border-white/90 bg-white/90 px-5 py-8  backdrop-blur-sm">
          <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#6d49e0] to-sky-600 text-lg text-white shadow-[0_10px_24px_rgba(109,40,217,0.25)]">◇</span>
          <h2 id="reveal-open-title" className="mt-4 text-2xl font-semibold text-[#0b1f3a]">{prompt.content.title[locale]}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#5f5e7a]">{t("openHint")}</p>
          <form action={openReadMyMindRevealAction.bind(null, teamId, roundId, position)} className="mt-7">
            <button type="submit" className="min-h-12 w-full rounded-xl brand-cta px-6 py-3 text-sm font-semibold transition-[transform,box-shadow] duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-xl motion-safe:active:translate-y-0 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] focus-visible:ring-offset-2 sm:w-auto">{t("open")}</button>
          </form>
          </div>
        </section>
      ) : reveal ? (
        <div id="opened-reveal" className="rmm-reveal-content mt-6 grid gap-6" tabIndex={-1}>
          <section className="rmm-reveal-panel rounded-[24px] border border-[#d9cff8] bg-gradient-to-br from-[#f5f2fe]/90 to-white p-5  sm:p-7" aria-labelledby="own-perspective-title">
            <h2 id="own-perspective-title" className="text-xl font-semibold text-[#0b1f3a]">{t("ownSelf")}</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <article className="rounded-[22px] bg-white p-5 shadow-sm ring-1 ring-[#d9cff8]"><h3 className="text-sm font-semibold text-[#3a2394]">{t("ownSelf")}</h3><ChoiceList keys={reveal.ownPerspective.self} contract={prompt.content.selfGuess} locale={locale} /></article>
              <article className="rounded-[22px] bg-[#eef6fc]/80 p-5 shadow-sm ring-1 ring-[#c9e0f2]"><h3 className="text-sm font-semibold text-[#0b5a8a]">{t("partnerGuess", { name: partnerName })}</h3><ChoiceList keys={reveal.ownPerspective.partnerGuess} contract={prompt.content.selfGuess} locale={locale} /></article>
            </div>
            <ComparisonLabel tone={comparisonTone(reveal.ownPerspective.exact)}>{comparison(reveal.ownPerspective.exact)}</ComparisonLabel>
          </section>

          <section className="rmm-reveal-panel rounded-[24px] border border-[#c9e0f2] bg-gradient-to-br from-[#eef6fc]/90 to-white p-5  sm:p-7" aria-labelledby="partner-perspective-title">
            <h2 id="partner-perspective-title" className="text-xl font-semibold text-[#0b1f3a]">{t("partnerSelf", { name: partnerName })}</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <article className="rounded-[22px] bg-white p-5 shadow-sm ring-1 ring-[#c9e0f2]"><h3 className="text-sm font-semibold text-[#0b5a8a]">{t("partnerSelf", { name: partnerName })}</h3><ChoiceList keys={reveal.partnerPerspective.self} contract={prompt.content.selfGuess} locale={locale} /></article>
              <article className="rounded-[22px] bg-[#f5f2fe]/80 p-5 shadow-sm ring-1 ring-[#d9cff8]"><h3 className="text-sm font-semibold text-[#3a2394]">{t("ownGuess", { name: partnerName })}</h3><ChoiceList keys={reveal.partnerPerspective.ownGuess} contract={prompt.content.selfGuess} locale={locale} /></article>
            </div>
            <ComparisonLabel tone={comparisonTone(reveal.partnerPerspective.exact)}>{comparison(reveal.partnerPerspective.exact)}</ComparisonLabel>
          </section>

          {reveal.needs && prompt.content.need ? <section className="rmm-reveal-panel rounded-[24px] border border-[#e4e2f0] bg-[#f7f6fb]/65 p-5 sm:p-7" aria-labelledby="needs-reveal-title"><h2 id="needs-reveal-title" className="text-xl font-semibold text-[#0b1f3a]">{t("needsTitle")}</h2><div className="mt-5 grid gap-4 md:grid-cols-2"><article className="rounded-[22px] bg-white p-5 ring-1 ring-[#e4e2f0]"><h3 className="text-sm font-semibold text-[#3a2394]">{t("ownNeed", { name: partnerName })}</h3><ChoiceList keys={reveal.needs.own} contract={prompt.content.need} locale={locale} /></article><article className="rounded-[22px] bg-white p-5 ring-1 ring-[#e4e2f0]"><h3 className="text-sm font-semibold text-[#0b5a8a]">{t("partnerNeed", { name: partnerName })}</h3><ChoiceList keys={reveal.needs.partner} contract={prompt.content.need} locale={locale} /></article></div></section> : null}

          <p className="rounded-2xl bg-[#f7f6fb] px-5 py-4 text-center text-sm leading-6 text-[#5f5e7a]">{t("reflection")}</p>
          <section id="conversation-marker" className="rmm-reveal-panel scroll-mt-24 rounded-[22px] border border-[#d9cff8] bg-[#f5f2fe]/60 p-5" aria-labelledby="conversation-marker-title">
            <div className="flex items-start gap-3"><span aria-hidden="true" className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${ownMarked ? "border-[#6d49e0] bg-[#6d49e0] text-white" : "border-[#d9cff8] bg-white text-[#4a2fb8]"}`}><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 5.75h14v9.5H10l-4.5 3v-3H5z" strokeLinecap="round" strokeLinejoin="round" /></svg></span><div><h2 id="conversation-marker-title" className="text-lg font-semibold text-[#0b1f3a]">{t("conversationMarkerTitle")}</h2>
            {ownMarked ? <p className="mt-2 text-sm font-semibold text-[#3a2394]">{t("markedConversation")}</p> : null}
            {markerStatus ? <p className="mt-2 text-sm font-medium text-[#3a2394]">{markerStatus}</p> : null}
            <p className="mt-2 text-sm leading-6 text-[#5f5e7a]">{t("sharedVisibility")}</p></div></div>
            <form action={(ownMarked ? unmarkReadMyMindConversationAction : markReadMyMindConversationAction).bind(null, teamId, roundId, position, prompt.roundPromptId)} className="mt-4">
              {/* Schaltet sofort um - Begruendung in ConversationMarkerButton.tsx. */}
              <ConversationMarkerButton
                marked={ownMarked}
                markLabel={t("markConversation")}
                unmarkLabel={t("unmarkConversation")}
                className="min-h-11 rounded-xl border border-[#b9a8f0] bg-white px-4 py-2 text-sm font-semibold text-[#3a2394] shadow-sm transition-[transform,background-color] motion-safe:hover:-translate-y-0.5 motion-safe:hover:bg-[#efeafd] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] focus-visible:ring-offset-2"
              />
            </form>
          </section>
          {next === undefined ? <section className="rounded-[24px] border border-[#d9cff8] bg-[#f5f2fe] p-6 text-center"><h2 className="text-2xl font-semibold text-[#0b1f3a]">{t(round.status === "completed" ? "completedTitle" : "allSeenTitle")}</h2><p className="mt-3 text-sm leading-7 text-[#33325e]">{t(round.status === "completed" ? "completedText" : "allSeenText")}</p></section> : null}
          <nav className="flex flex-wrap items-center justify-between gap-3" aria-label={t("progress", { current: position + 1, total: round.prompts.length })}>
            {previous !== undefined ? <Link prefetch={false} href={`${revealHref}/${previous}`} className="min-h-11 px-3 py-3 text-sm font-medium text-[#5f5e7a] underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-[#8b89aa]">{t("previous")}</Link> : <span />}
            {next !== undefined ? (round.openedPromptPositions.includes(next) ? <Link prefetch={false} href={`${revealHref}/${next}`} className="inline-flex min-h-11 items-center rounded-xl brand-cta px-5 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] focus-visible:ring-offset-2">{t("next")}</Link> : /* Deckt auf UND geht hin - siehe founder-in-the-wild/reveal/[position]. */ <form action={openReadMyMindRevealAction.bind(null, teamId, roundId, next)}><SubmitButton label={t("nextAndOpen")} pendingLabel={t("opening")} className="inline-flex min-h-11 items-center rounded-xl brand-cta px-5 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] focus-visible:ring-offset-2" /></form>) : round.status === "completed" ? <Link href={revealHref} className="inline-flex min-h-11 items-center rounded-xl brand-cta px-5 py-3 text-sm font-semibold">{t("roundOverview")}</Link> : <form action={completeReadMyMindRoundAction.bind(null, teamId, roundId)}><button type="submit" className="min-h-11 rounded-xl brand-cta px-5 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] focus-visible:ring-offset-2">{t("complete")}</button></form>}
          </nav>
        </div>
      ) : notFound()}
    </main>
  );
}
