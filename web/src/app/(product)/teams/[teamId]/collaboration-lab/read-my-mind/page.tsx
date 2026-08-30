import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { READ_MY_MIND_PACKS } from "@/features/collaborationLab/readMyMindContent";
import { notifyReadMyMindHandoffsAction, startReadMyMindRoundAction } from "@/features/collaborationLab/readMyMindActions";
import { getOpenReadMyMindRounds, getReadMyMindTeamContext } from "@/features/collaborationLab/readMyMindData";
import { buildReadMyMindPackNavigation } from "@/features/collaborationLab/readMyMindPackNavigation";
import { normalizeLocale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";

export default async function ReadMyMindEntryPage({ params, searchParams }: { params: Promise<{ teamId: string }>; searchParams: Promise<{ result?: string }> }) {
  const [{ teamId }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/teams/${teamId}/collaboration-lab/read-my-mind`)}`);
  const team = await getReadMyMindTeamContext(teamId, user.id, supabase);
  if (!team) notFound();
  const openRounds = await getOpenReadMyMindRounds(team, user.id, supabase);
  const [t, rawLocale] = await Promise.all([getTranslations("collaborationLab.entry"), getLocale()]);
  const locale = normalizeLocale(rawLocale);
  const partnerName = team.members.find((member) => member.userId !== user.id)?.displayName ?? t("partnerFallback");
  const packNavigation = buildReadMyMindPackNavigation(READ_MY_MIND_PACKS, openRounds);
  const unannouncedHandoffs = openRounds.filter((round) =>
    round.status === "forming" &&
    round.createdByUserId === user.id &&
    round.ownParticipantState === "joined" &&
    round.handoffReadyAt !== null &&
    round.handoffEmailClaimedAt === null
  );
  const currentPackStatus = (round: (typeof openRounds)[number]) => round.status === "forming"
    ? round.ownParticipantState === "pending"
      ? round.handoffReadyAt ? t("currentStatus.yourTurn") : t("currentStatus.partnerTurn", { name: partnerName })
      : round.handoffReadyAt ? t("currentStatus.partnerTurn", { name: partnerName }) : t("currentStatus.yourTurn")
    : round.wholeRoundAnswerComplete
      ? t("currentStatus.revealReady")
      : round.ownAnswerComplete
        ? t("currentStatus.partnerTurn", { name: partnerName })
        : t("currentStatus.inProgress");
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href={`/teams/${encodeURIComponent(teamId)}#collaboration-lab`} className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">{t("backToCollaboration")}</Link>
      <header className="rmm-enter relative mt-6 overflow-hidden rounded-[30px] bg-gradient-to-br from-violet-100 via-white to-amber-50 p-6 shadow-[0_24px_60px_rgba(76,29,149,0.1)] ring-1 ring-violet-200/70 sm:p-9">
        <div aria-hidden="true" className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-violet-200/45 blur-3xl" />
        <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">{t("eyebrow")}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{t("title")}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{t("intro")}</p>
        </div>
      </header>
      <aside className="mt-5 rounded-2xl border border-violet-200 bg-violet-50/70 px-5 py-4 text-sm leading-6 text-violet-950" aria-label={t("betaLabel")}>
        <span className="font-semibold">{t("betaLabel")}</span><span className="mx-2" aria-hidden="true">·</span>{t("betaNotice")}
      </aside>
      {query.result === "email-sent" || query.result === "email-failed" ? <p role="status" className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700">{t(`notification.${query.result === "email-sent" ? "sent" : "failed"}`, { name: partnerName })}</p> : null}
      {team.members.length !== 2 ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6"><p className="text-sm leading-7 text-slate-700">{t(team.members.length === 3 ? "unsupported" : "unsupportedTeamSize")}</p></section>
      ) : (
        <>
          <section className="mt-6 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-5 sm:p-6" aria-labelledby="rmm-handoff">
            <h2 id="rmm-handoff" className="text-xl font-semibold text-slate-950">{t("handoffTitle")}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-700">{t("handoffText", { name: partnerName })}</p>
          </section>
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="rmm-transparency">
            <h2 id="rmm-transparency" className="text-xl font-semibold text-slate-950">{t("transparencyTitle")}</h2>
            <ul className="mt-4 grid gap-2 text-sm leading-6 text-slate-700">
              {["independent", "hidden", "compare", "noRightAnswers", "sharedReveal", "isolated", "declinePurge"].map((key) => <li key={key} className="flex gap-3"><span aria-hidden="true" className="text-violet-500">•</span><span>{t(`transparency.${key}`, { name: partnerName })}</span></li>)}
            </ul>
          </section>
          {openRounds.length > 0 ? (
            <section className="mt-6 rounded-2xl border border-violet-200 bg-violet-50/60 p-5 sm:p-6" aria-labelledby="rmm-one-round">
              <h2 id="rmm-one-round" className="text-lg font-semibold text-slate-950">{t("oneRoundTitle")}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t("oneRoundText")}</p>
            </section>
          ) : null}
          {unannouncedHandoffs.length > 0 ? (
            <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6" aria-labelledby="rmm-notify-title">
              <div><h2 id="rmm-notify-title" className="text-lg font-semibold text-slate-950">{t("notification.title", { count: unannouncedHandoffs.length, name: partnerName })}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{t("notification.text", { name: partnerName })}</p></div>
              <form action={notifyReadMyMindHandoffsAction.bind(null, teamId)} className="mt-4 shrink-0 sm:mt-0"><button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2">{t("notification.action", { name: partnerName })}</button></form>
            </section>
          ) : null}
          <section className="mt-6 grid gap-4 md:grid-cols-3" aria-label={t("title") }>
            {packNavigation.map(({ pack, currentRound, canStart }, index) => {
              const canContinue = Boolean(currentRound && currentRound.ownParticipantState === "joined" && !currentRound.ownAnswerComplete && ((currentRound.status === "forming" && currentRound.handoffReadyAt === null) || currentRound.status === "active"));
              return (
              <article key={pack.key} className={`rmm-enter group relative flex min-w-0 flex-col overflow-hidden rounded-[26px] border bg-white p-5 shadow-[0_14px_35px_rgba(76,29,149,0.07)] transition-[transform,box-shadow,border-color] duration-300 motion-reduce:transition-none ${currentRound ? "border-violet-400 ring-2 ring-violet-100" : index === 0 && openRounds.length === 0 ? "border-violet-300" : "border-slate-200"} ${canStart || currentRound ? "motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-[0_22px_48px_rgba(76,29,149,0.12)]" : ""}`} style={{ animationDelay: `${index * 70}ms` }}>
                <div aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${currentRound || (index === 0 && openRounds.length === 0) ? "bg-gradient-to-r from-violet-600 to-amber-400" : "bg-gradient-to-r from-slate-200 to-violet-200"}`} />
                {index === 0 && openRounds.length === 0 ? <span className="self-start rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-800">{t("recommended")}</span> : null}
                <h2 className="mt-3 text-lg font-semibold text-slate-950">{pack.title[locale]}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{t(`packs.${pack.key}`)}</p>
                <div className="mt-4 flex items-center gap-3"><span className="text-xs text-slate-500">{t("promptCount", { count: pack.prompts.length })}</span><span className="flex gap-1" aria-hidden="true">{pack.prompts.map((prompt) => <span key={prompt.key} className="h-1.5 w-4 rounded-full bg-violet-200 transition-colors duration-300 group-hover:bg-violet-300 motion-reduce:transition-none" />)}</span></div>
                <p className={`mt-4 text-sm font-semibold ${currentRound ? "text-violet-800" : "text-slate-500"}`}>{currentRound ? currentPackStatus(currentRound) : canStart ? t("availableNow") : t("availableAfter")}</p>
                {currentRound ? (
                  <Link href={`/teams/${encodeURIComponent(teamId)}/collaboration-lab/read-my-mind/${encodeURIComponent(currentRound.id)}`} className="mt-auto inline-flex min-h-11 items-center justify-center rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(109,40,217,0.16)] transition-[transform,background-color] motion-safe:hover:-translate-y-0.5 motion-safe:hover:bg-violet-800 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2">{canContinue ? t("continueRound") : t("viewStatus")}</Link>
                ) : canStart ? <form action={startReadMyMindRoundAction.bind(null, teamId)} className="mt-auto pt-5">
                  <input type="hidden" name="packKey" value={pack.key} />
                  <input type="hidden" name="packVersion" value={pack.version} />
                  <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(109,40,217,0.16)] transition-[transform,background-color] motion-safe:hover:-translate-y-0.5 motion-safe:hover:bg-violet-800 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2">{t("start")}</button>
                </form> : null}
              </article>
            );})}
          </section>
        </>
      )}
    </main>
  );
}
