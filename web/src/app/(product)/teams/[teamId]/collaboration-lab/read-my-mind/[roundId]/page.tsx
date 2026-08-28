import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { abandonReadMyMindRoundAction, declineReadMyMindRoundAction, joinReadMyMindRoundAction, lockReadMyMindPromptAction } from "@/features/collaborationLab/readMyMindActions";
import { ReadMyMindEndControl } from "@/features/collaborationLab/ReadMyMindEndControl";
import { ReadMyMindHandoffVisual, ReadMyMindProgress } from "@/features/collaborationLab/ReadMyMindExperienceVisuals";
import { ReadMyMindPromptForm } from "@/features/collaborationLab/ReadMyMindPromptForm";
import { getReadMyMindRound, getReadMyMindTeamContext } from "@/features/collaborationLab/readMyMindData";
import { fillReadMyMindTarget } from "@/features/collaborationLab/readMyMindModel";
import { normalizeLocale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";

export default async function ReadMyMindRoundPage({ params, searchParams }: { params: Promise<{ teamId: string; roundId: string }>; searchParams: Promise<{ prompt?: string; result?: string }> }) {
  const [{ teamId, roundId }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const href = `/teams/${encodeURIComponent(teamId)}/collaboration-lab/read-my-mind/${encodeURIComponent(roundId)}`;
  if (!user) redirect(`/login?next=${encodeURIComponent(href)}`);
  const team = await getReadMyMindTeamContext(teamId, user.id, supabase);
  if (!team) notFound();
  const round = await getReadMyMindRound(team, roundId, user.id, supabase);
  if (!round) notFound();
  const [t, rawLocale] = await Promise.all([getTranslations("collaborationLab.round"), getLocale()]);
  const locale = normalizeLocale(rawLocale);
  const partnerName = round.partner.displayName ?? t(round.status === "completed" ? "historicalPartnerFallback" : "partnerFallback");
  const abandon = abandonReadMyMindRoundAction.bind(null, teamId, roundId);
  const shell = (children: React.ReactNode) => (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href={`/teams/${encodeURIComponent(teamId)}#collaboration-lab`} className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">{t("backToCollaboration")}</Link>
      <header className="mt-6 rounded-[28px] bg-gradient-to-br from-violet-100 via-white to-amber-50 p-6 ring-1 ring-violet-200/70 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Read My Mind</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-950 sm:text-3xl">{round.pack.title[locale]}</h1>
      </header>
      {query.result && ["changed", "locked", "invalid", "unavailable"].includes(query.result) ? <p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{t(`errors.${query.result}`)}</p> : null}
      {children}
    </main>
  );
  if (round.status === "abandoned") return shell(<section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold">{t("endedTitle")}</h2><p className="mt-2 text-sm text-slate-600">{t("endedText")}</p></section>);
  if (round.status === "completed") return shell(<section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold">{t("completedTitle")}</h2><div className="mt-5 flex flex-wrap gap-3"><Link prefetch={false} href={`${href}/reveal`} className="inline-flex min-h-11 items-center rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white">{t("readyAction")}</Link>{team.members.length === 2 ? <Link href={`/teams/${encodeURIComponent(teamId)}/collaboration-lab/read-my-mind`} className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700">{t("newRoundAction")}</Link> : null}</div></section>);
  if (round.status === "forming" && round.ownParticipantState === "pending") return shell(
    <section className="rmm-enter mt-6 overflow-hidden rounded-[28px] border border-violet-200/80 bg-gradient-to-br from-white via-violet-50/50 to-amber-50/60 p-6 shadow-[0_20px_50px_rgba(76,29,149,0.08)]"><h2 className="text-xl font-semibold">{t("inviteTitle", { name: partnerName })}</h2><p className="mt-3 text-sm leading-7 text-slate-600">{t("inviteText")}</p><ReadMyMindHandoffVisual selfLabel={t("self")} partnerName={partnerName} /><div className="mt-6 flex flex-wrap gap-3"><form action={joinReadMyMindRoundAction.bind(null, teamId, roundId)}><button className="min-h-11 rounded-xl bg-violet-700 px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(109,40,217,0.18)] transition-transform motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-violet-500">{t("join")}</button></form><ReadMyMindEndControl action={declineReadMyMindRoundAction.bind(null, teamId, roundId)} label={t("decline")} confirmation={t("declineConfirm")} cancel={t("cancel")} /></div></section>
  );
  if (round.status === "forming") return shell(
    <section className="rmm-enter mt-6 overflow-hidden rounded-[28px] border border-violet-200/80 bg-gradient-to-br from-white via-violet-50/50 to-amber-50/60 p-6 shadow-[0_20px_50px_rgba(76,29,149,0.08)]"><h2 className="text-xl font-semibold">{t("creatorTitle")}</h2><p className="mt-3 text-sm leading-7 text-slate-600">{t("creatorText", { name: partnerName })}</p><p className="mt-2 text-sm text-slate-500">{t("creatorHint")}</p><ReadMyMindHandoffVisual selfLabel={t("self")} partnerName={partnerName} /><div className="mt-6"><ReadMyMindEndControl action={abandon} label={t("abandon")} confirmation={t("abandonConfirm", { name: partnerName })} cancel={t("cancel")} /></div></section>
  );
  if (round.wholeRoundAnswerComplete) return shell(<section className="rmm-enter relative mt-6 overflow-hidden rounded-[30px] border border-violet-200 bg-gradient-to-br from-violet-100 via-white to-amber-100/70 p-6 shadow-[0_24px_60px_rgba(76,29,149,0.12)] sm:p-8"><div aria-hidden="true" className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-violet-200/40 blur-3xl" /><div className="relative"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Read My Mind Reveal</p><h2 className="mt-3 text-2xl font-semibold tracking-tight">{t("readyTitle")}</h2><p className="mt-3 text-sm leading-7 text-slate-600">{t("readyText")}</p><p className="mt-3 text-sm font-medium text-violet-800">{t("readyStatus")}</p><Link prefetch={false} href={`${href}/reveal`} className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(109,40,217,0.2)] transition-transform motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">{t("readyAction")}</Link></div></section>);
  if (round.ownAnswerComplete) return shell(<section className="rmm-enter mt-6 rounded-[28px] border border-slate-200 bg-gradient-to-br from-white to-violet-50/40 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"><h2 className="text-xl font-semibold">{t("waitingTitle")}</h2><p className="mt-3 text-sm leading-7 text-slate-600">{t("waitingText", { name: partnerName })}</p><p className="mt-3 text-sm font-medium text-violet-800">{t("waitingStatus", { name: partnerName })}</p><ReadMyMindHandoffVisual selfLabel={t("self")} partnerName={partnerName} /><div className="mt-6"><ReadMyMindEndControl action={abandon} label={t("abandon")} confirmation={t("abandonConfirm", { name: partnerName })} cancel={t("cancel")} /></div></section>);

  const requested = Number(query.prompt);
  const requestedPrompt = round.prompts.find((entry) => entry.position === requested);
  const current = requestedPrompt && (requestedPrompt.complete || requestedPrompt.position === round.nextPromptPosition) ? requestedPrompt : round.prompts.find((entry) => entry.position === round.nextPromptPosition);
  if (!current) return shell(null);
  const previous = round.prompts.filter((entry) => entry.complete && entry.position < current.position).at(-1);
  const nextComplete = round.prompts.find((entry) => entry.complete && entry.position > current.position);
  return shell(
    <section className="mt-6">
      <ReadMyMindProgress current={current.position + 1} total={round.prompts.length} label={t("progress", { current: current.position + 1, total: round.prompts.length })} />
      <article className="rmm-stage rmm-enter relative mt-5 overflow-hidden rounded-[30px] border border-violet-200/80 bg-gradient-to-br from-violet-100 via-white to-amber-50 p-6 shadow-[0_22px_55px_rgba(76,29,149,0.1)] sm:p-9">
        <div aria-hidden="true" className="absolute -right-10 -top-14 h-48 w-48 rounded-full bg-violet-200/45 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-16 left-1/4 h-40 w-40 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.19em] text-violet-700">{round.pack.title[locale]} · {t("progress", { current: current.position + 1, total: round.prompts.length })}</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{current.content.title[locale]}</h2>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-700 sm:text-xl sm:leading-9">{current.content.selfQuestion[locale]}</p>
        </div>
      </article>
      <ReadMyMindPromptForm action={lockReadMyMindPromptAction.bind(null, teamId, roundId, current.roundPromptId)} locale={locale} selfLegend={t("self")} guessLegend={`${t("guess", { name: partnerName })} ${fillReadMyMindTarget(current.content.guessQuestion[locale], partnerName)}`} needLegend={`${t("need")} ${current.content.needQuestion ? fillReadMyMindTarget(current.content.needQuestion[locale], partnerName) : ""}`} partnerName={partnerName} prompt={current} labels={{ saved: t("saved"), lockWarning: t("lockWarning"), submit: t("lock"), submitPending: t("locking"), multiHint: t("multiHint"), perspectiveShift: t("perspectiveShift"), perspectiveShiftText: t("perspectiveShiftText", { name: partnerName }) }} />
      <nav className="mt-5 flex justify-between gap-3" aria-label={t("progress", { current: current.position + 1, total: round.prompts.length })}>{previous ? <Link href={`${href}?prompt=${previous.position}`} className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline">{t("previous")}</Link> : <span />}{nextComplete ? <Link href={`${href}?prompt=${nextComplete.position}`} className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline">{t("next")}</Link> : null}</nav>
      <div className="mt-8"><ReadMyMindEndControl action={abandon} label={t("abandon")} confirmation={t("abandonConfirm", { name: partnerName })} cancel={t("cancel")} /></div>
    </section>
  );
}
