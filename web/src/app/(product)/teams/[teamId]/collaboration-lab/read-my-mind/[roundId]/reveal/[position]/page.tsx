import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { completeReadMyMindRoundAction, markReadMyMindConversationAction, openReadMyMindRevealAction, unmarkReadMyMindConversationAction } from "@/features/collaborationLab/readMyMindActions";
import { getOpenedReadMyMindPromptReveal, getReadMyMindRound, getReadMyMindTeamContext } from "@/features/collaborationLab/readMyMindData";
import type { ReadMyMindResponseContract } from "@/features/collaborationLab/readMyMindContent";
import { ReadMyMindProgress } from "@/features/collaborationLab/ReadMyMindExperienceVisuals";
import { normalizeLocale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";

function ChoiceList({ keys, contract, locale }: { keys: string[]; contract: ReadMyMindResponseContract; locale: "de" | "en" }) {
  const labels = keys.map((key) => contract.choices.find((choice) => choice.key === key)?.label[locale]).filter((label): label is string => Boolean(label));
  return <ul className="mt-3 grid gap-2.5">{labels.map((label) => <li key={label} className="rounded-2xl border border-slate-200/90 bg-white/90 px-4 py-3.5 text-sm leading-6 text-slate-800 shadow-sm">{label}</li>)}</ul>;
}

function ComparisonLabel({ children, tone }: { children: React.ReactNode; tone: "violet" | "amber" | "neutral" }) {
  const colors = tone === "violet"
    ? "border-violet-200 bg-violet-100/80 text-violet-900"
    : tone === "amber"
      ? "border-amber-200 bg-amber-100/80 text-amber-950"
      : "border-slate-200 bg-slate-100 text-slate-700";
  return <p className={`mt-5 inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${colors}`}>{children}</p>;
}

export default async function ReadMyMindPromptRevealPage({ params }: { params: Promise<{ teamId: string; roundId: string; position: string }> }) {
  const { teamId, roundId, position: rawPosition } = await params;
  const position = Number(rawPosition);
  if (!Number.isInteger(position) || position < 0 || position > 4) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const roundHref = `/teams/${encodeURIComponent(teamId)}/collaboration-lab/read-my-mind/${encodeURIComponent(roundId)}`;
  const revealHref = `${roundHref}/reveal`;
  if (!user) redirect(`/login?next=${encodeURIComponent(`${revealHref}/${position}`)}`);
  const team = await getReadMyMindTeamContext(teamId, user.id, supabase);
  if (!team) notFound();
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
        <Link href={`/teams/${encodeURIComponent(teamId)}#collaboration-lab`} className="text-xs font-medium text-slate-500 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">{t("collaborationBreadcrumb")}</Link>
        <span aria-hidden="true" className="text-slate-300">›</span>
        <Link href={`/teams/${encodeURIComponent(teamId)}/collaboration-lab/read-my-mind`} className="font-semibold text-violet-800 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">{t("backToReadMyMind")}</Link>
      </nav>
      <div className="mt-6"><ReadMyMindProgress current={position + 1} total={round.prompts.length} label={t("progress", { current: position + 1, total: round.prompts.length })} /></div>
      <header className="rmm-stage rmm-enter relative mt-5 overflow-hidden rounded-[30px] border border-violet-200/80 bg-gradient-to-br from-violet-100 via-white to-amber-50 p-6 shadow-[0_22px_55px_rgba(76,29,149,0.1)] sm:p-9">
        <div aria-hidden="true" className="absolute -right-10 -top-14 h-48 w-48 rounded-full bg-violet-200/45 blur-3xl" />
        <div className="relative"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">{t("eyebrow")}</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{prompt.content.title[locale]}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">{prompt.content.selfQuestion[locale]}</p></div>
      </header>

      {!opened ? (
        <section className="rmm-sealed rmm-enter relative mt-6 overflow-hidden rounded-[30px] border border-violet-200 bg-white p-6 text-center shadow-[0_24px_60px_rgba(76,29,149,0.12)] sm:p-10" aria-labelledby="reveal-open-title">
          <div aria-hidden="true" className="absolute inset-x-8 top-5 h-24 rotate-[-1.5deg] rounded-[24px] border border-amber-200/70 bg-amber-100/50" />
          <div aria-hidden="true" className="absolute inset-x-5 top-3 h-24 rotate-[1deg] rounded-[24px] border border-violet-200/70 bg-violet-100/60" />
          <div className="relative rounded-[24px] border border-white/90 bg-white/90 px-5 py-8 shadow-[0_18px_45px_rgba(76,29,149,0.1)] backdrop-blur-sm">
          <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-amber-400 text-lg text-white shadow-[0_10px_24px_rgba(109,40,217,0.25)]">◇</span>
          <h2 id="reveal-open-title" className="mt-4 text-2xl font-semibold text-slate-950">{prompt.content.title[locale]}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">{t("openHint")}</p>
          <form action={openReadMyMindRevealAction.bind(null, teamId, roundId, position)} className="mt-7">
            <button type="submit" className="min-h-12 w-full rounded-xl bg-gradient-to-r from-violet-700 to-fuchsia-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition-[transform,box-shadow] duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-xl motion-safe:active:translate-y-0 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 sm:w-auto">{t("open")}</button>
          </form>
          </div>
        </section>
      ) : reveal ? (
        <div id="opened-reveal" className="rmm-reveal-content mt-6 grid gap-6" tabIndex={-1}>
          <section className="rmm-reveal-panel rounded-[28px] border border-violet-200 bg-gradient-to-br from-violet-50/90 to-white p-5 shadow-[0_16px_38px_rgba(76,29,149,0.07)] sm:p-7" aria-labelledby="own-perspective-title">
            <h2 id="own-perspective-title" className="text-xl font-semibold text-slate-950">{t("ownSelf")}</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <article className="rounded-[22px] bg-white p-5 shadow-sm ring-1 ring-violet-200"><h3 className="text-sm font-semibold text-violet-900">{t("ownSelf")}</h3><ChoiceList keys={reveal.ownPerspective.self} contract={prompt.content.selfGuess} locale={locale} /></article>
              <article className="rounded-[22px] bg-amber-50/80 p-5 shadow-sm ring-1 ring-amber-200"><h3 className="text-sm font-semibold text-amber-950">{t("partnerGuess", { name: partnerName })}</h3><ChoiceList keys={reveal.ownPerspective.partnerGuess} contract={prompt.content.selfGuess} locale={locale} /></article>
            </div>
            <ComparisonLabel tone={comparisonTone(reveal.ownPerspective.exact)}>{comparison(reveal.ownPerspective.exact)}</ComparisonLabel>
          </section>

          <section className="rmm-reveal-panel rounded-[28px] border border-amber-200 bg-gradient-to-br from-amber-50/90 to-white p-5 shadow-[0_16px_38px_rgba(146,64,14,0.06)] sm:p-7" aria-labelledby="partner-perspective-title">
            <h2 id="partner-perspective-title" className="text-xl font-semibold text-slate-950">{t("partnerSelf", { name: partnerName })}</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <article className="rounded-[22px] bg-white p-5 shadow-sm ring-1 ring-amber-200"><h3 className="text-sm font-semibold text-amber-950">{t("partnerSelf", { name: partnerName })}</h3><ChoiceList keys={reveal.partnerPerspective.self} contract={prompt.content.selfGuess} locale={locale} /></article>
              <article className="rounded-[22px] bg-violet-50/80 p-5 shadow-sm ring-1 ring-violet-200"><h3 className="text-sm font-semibold text-violet-900">{t("ownGuess", { name: partnerName })}</h3><ChoiceList keys={reveal.partnerPerspective.ownGuess} contract={prompt.content.selfGuess} locale={locale} /></article>
            </div>
            <ComparisonLabel tone={comparisonTone(reveal.partnerPerspective.exact)}>{comparison(reveal.partnerPerspective.exact)}</ComparisonLabel>
          </section>

          {reveal.needs && prompt.content.need ? <section className="rmm-reveal-panel rounded-[28px] border border-slate-200 bg-slate-50/65 p-5 sm:p-7" aria-labelledby="needs-reveal-title"><h2 id="needs-reveal-title" className="text-xl font-semibold text-slate-950">{t("needsTitle")}</h2><div className="mt-5 grid gap-4 md:grid-cols-2"><article className="rounded-[22px] bg-white p-5 ring-1 ring-slate-200"><h3 className="text-sm font-semibold text-violet-900">{t("ownNeed", { name: partnerName })}</h3><ChoiceList keys={reveal.needs.own} contract={prompt.content.need} locale={locale} /></article><article className="rounded-[22px] bg-white p-5 ring-1 ring-slate-200"><h3 className="text-sm font-semibold text-amber-950">{t("partnerNeed", { name: partnerName })}</h3><ChoiceList keys={reveal.needs.partner} contract={prompt.content.need} locale={locale} /></article></div></section> : null}

          <p className="rounded-2xl bg-slate-50 px-5 py-4 text-center text-sm leading-6 text-slate-600">{t("reflection")}</p>
          <section id="conversation-marker" className="rmm-reveal-panel scroll-mt-24 rounded-[22px] border border-violet-200 bg-violet-50/60 p-5" aria-labelledby="conversation-marker-title">
            <div className="flex items-start gap-3"><span aria-hidden="true" className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${ownMarked ? "border-violet-600 bg-violet-600 text-white" : "border-violet-200 bg-white text-violet-700"}`}><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 5.75h14v9.5H10l-4.5 3v-3H5z" strokeLinecap="round" strokeLinejoin="round" /></svg></span><div><h2 id="conversation-marker-title" className="text-lg font-semibold text-slate-950">{t("conversationMarkerTitle")}</h2>
            {ownMarked ? <p className="mt-2 text-sm font-semibold text-violet-900">{t("markedConversation")}</p> : null}
            {markerStatus ? <p className="mt-2 text-sm font-medium text-violet-900">{markerStatus}</p> : null}
            <p className="mt-2 text-sm leading-6 text-slate-600">{t("sharedVisibility")}</p></div></div>
            <form action={(ownMarked ? unmarkReadMyMindConversationAction : markReadMyMindConversationAction).bind(null, teamId, roundId, position, prompt.roundPromptId)} className="mt-4">
              <button type="submit" aria-pressed={ownMarked} className="min-h-11 rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-900 shadow-sm transition-[transform,background-color] motion-safe:hover:-translate-y-0.5 motion-safe:hover:bg-violet-100 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2">
                {ownMarked ? t("unmarkConversation") : t("markConversation")}
              </button>
            </form>
          </section>
          {next === undefined ? <section className="rounded-[28px] border border-violet-200 bg-gradient-to-br from-violet-100 to-amber-50 p-6 text-center"><h2 className="text-2xl font-semibold text-slate-950">{t(round.status === "completed" ? "completedTitle" : "allSeenTitle")}</h2><p className="mt-3 text-sm leading-7 text-slate-700">{t(round.status === "completed" ? "completedText" : "allSeenText")}</p></section> : null}
          <nav className="flex flex-wrap items-center justify-between gap-3" aria-label={t("progress", { current: position + 1, total: round.prompts.length })}>
            {previous !== undefined ? <Link prefetch={false} href={`${revealHref}/${previous}`} className="min-h-11 px-3 py-3 text-sm font-medium text-slate-600 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-slate-400">{t("previous")}</Link> : <span />}
            {next !== undefined ? <Link prefetch={false} href={`${revealHref}/${next}`} className="inline-flex min-h-11 items-center rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2">{t("next")}</Link> : round.status === "completed" ? <Link href={revealHref} className="inline-flex min-h-11 items-center rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white">{t("roundOverview")}</Link> : <form action={completeReadMyMindRoundAction.bind(null, teamId, roundId)}><button type="submit" className="min-h-11 rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2">{t("complete")}</button></form>}
          </nav>
        </div>
      ) : notFound()}
    </main>
  );
}
