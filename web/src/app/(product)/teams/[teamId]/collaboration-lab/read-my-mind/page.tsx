import Link from "next/link";
import { TeamUnavailable } from "@/features/access/TeamUnavailable";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { READ_MY_MIND_PACKS } from "@/features/collaborationLab/readMyMindContent";
import { notifyReadMyMindHandoffsAction, startReadMyMindRoundAction } from "@/features/collaborationLab/readMyMindActions";
import { getOpenReadMyMindRounds, getReadMyMindTeamContext } from "@/features/collaborationLab/readMyMindData";
import { buildReadMyMindPackNavigation } from "@/features/collaborationLab/readMyMindPackNavigation";
import { normalizeLocale } from "@/i18n/config";
import { GuessTallyCard } from "@/features/collaborationLab/GuessTallyCard";
import { getCollaborationGuessTally } from "@/features/collaborationLab/guessTally";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { AppIcon, IconTile, type IconName, type IconTone } from "@/features/ui/Icons";

const BTN_PRIMARY = "inline-flex min-h-11 items-center justify-center rounded-xl bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-[18px] text-[15px] font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] focus-visible:ring-offset-2";
const BTN_QUIET = "inline-flex min-h-11 items-center justify-center rounded-xl bg-[#f1f0f7] px-[18px] text-[15px] font-semibold text-[#0b1f3a] transition hover:bg-[#e9e7f4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] focus-visible:ring-offset-2";
const PACK_ICON: Record<string, { icon: IconName; tone: IconTone }> = {
  easy_start: { icon: "spark", tone: "green" },
  how_we_work: { icon: "tools", tone: "violet" },
  when_things_get_tricky: { icon: "warn", tone: "amber" },
};
const HOW: { key: string; icon: IconName; tone: IconTone }[] = [
  { key: "independent", icon: "person", tone: "violet" },
  { key: "hidden", icon: "lock", tone: "amber" },
  { key: "compare", icon: "scale", tone: "blue" },
  { key: "noRightAnswers", icon: "heart", tone: "pink" },
];

export default async function ReadMyMindEntryPage({ params, searchParams }: { params: Promise<{ teamId: string }>; searchParams: Promise<{ result?: string }> }) {
  const [{ teamId }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: { user } } = await getRequestUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/teams/${teamId}/collaboration-lab/read-my-mind`)}`);
  const team = await getReadMyMindTeamContext(teamId, user.id, supabase);
  if (!team) return <TeamUnavailable teamId={teamId} />;
  const openRounds = await getOpenReadMyMindRounds(team, user.id, supabase);
  const [t, rawLocale] = await Promise.all([getTranslations("collaborationLab.entry"), getLocale()]);
  const locale = normalizeLocale(rawLocale);
  const partnerName = team.members.find((member) => member.userId !== user.id)?.displayName ?? t("partnerFallback");
  const tally = await getCollaborationGuessTally(supabase, teamId);
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
      <Link href={`/teams/${encodeURIComponent(teamId)}#collaboration-lab`} className="text-sm font-medium text-[#5f5e7a] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9a82e8]">{t("backToCollaboration")}</Link>
      <header className="rmm-enter brand-panel relative mt-5 overflow-hidden rounded-[24px] px-6 py-8 sm:px-9">
        <span aria-hidden="true" className="orb -top-14 right-36 hidden h-40 w-40 md:block" />
        <span aria-hidden="true" className="orb -bottom-6 right-12 hidden h-[70px] w-[70px] md:block" style={{ animationDelay: "0.6s" }} />
        <div className="relative flex items-center gap-[18px]">
          <span aria-hidden="true" className="hidden h-14 w-14 flex-none items-center justify-center rounded-[14px] bg-white/20 sm:inline-flex"><AppIcon name="chat" /></span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-white opacity-90">{t("eyebrow")}</p>
            <h1 className="mt-0.5 text-[30px] font-semibold leading-[1.15] sm:text-[34px]">{t("title")}</h1>
            <p className="mt-2 max-w-xl text-base leading-7 text-white opacity-95">{t("intro")}</p>
            <p className="mt-3"><span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-[13px] font-semibold text-white">{t("betaLabel")}</span></p>
          </div>
        </div>
      </header>
      <p className="mt-4 text-[13.5px] leading-6 text-[#5f5e7a]">{t("betaNotice")}</p>
      {query.result === "email-sent" || query.result === "email-failed" ? <p role="status" className="mt-4 rounded-2xl bg-[#f1f0f7] px-4 py-3 text-sm leading-6 text-[#33325e]">{t(`notification.${query.result === "email-sent" ? "sent" : "failed"}`, { name: partnerName })}</p> : null}
      {team.members.length !== 2 ? (
        <section className="mt-6 rounded-[24px] border border-[#e4e2f0] bg-white p-6"><p className="text-sm leading-7 text-[#33325e]">{t(team.members.length > 2 ? "unsupported" : "unsupportedTeamSize")}</p></section>
      ) : (
        <>
          <section className="mt-5 rounded-[24px] border border-[#e4e2f0] bg-white px-5 py-6 sm:px-7" aria-labelledby="rmm-transparency">
            <h2 id="rmm-transparency" className="text-2xl font-semibold tracking-tight text-[#0b1f3a]">{t("transparencyTitle")}</h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {HOW.map(({ key, icon, tone }) => (
                <li key={key} className="flex items-start gap-3">
                  <IconTile name={icon} tone={tone} size="sm" />
                  <span className="min-w-0 text-[13.5px] leading-[1.5] text-[#5f5e7a]">{t(`transparency.${key}`)}</span>
                </li>
              ))}
            </ul>
            <ul className="mt-4 grid gap-1.5 border-t border-[#e4e2f0] pt-4 text-[13.5px] leading-[1.5] text-[#5f5e7a]">
              {["sharedReveal", "isolated", "declinePurge"].map((key) => <li key={key}>{t(`transparency.${key}`, { name: partnerName })}</li>)}
            </ul>
          </section>
          <section className="mt-5 rounded-[24px] border border-[#d9cff8] bg-[#f5f2fe] p-5 sm:p-6" aria-labelledby="rmm-handoff">
            <div className="flex items-start gap-3.5">
              <IconTile name="clock" tone="violet" />
              <div className="min-w-0">
                <h2 id="rmm-handoff" className="text-lg font-semibold text-[#0b1f3a]">{t("handoffTitle")}</h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-[#5f5e7a]">{t("handoffText", { name: partnerName })}</p>
              </div>
            </div>
          </section>
          {openRounds.length > 0 ? (
            <section className="mt-5 rounded-[24px] border border-[#e4e2f0] bg-white p-5 sm:p-6" aria-labelledby="rmm-one-round">
              <h2 id="rmm-one-round" className="text-lg font-semibold text-[#0b1f3a]">{t("oneRoundTitle")}</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[#5f5e7a]">{t("oneRoundText")}</p>
            </section>
          ) : null}
          {unannouncedHandoffs.length > 0 ? (
            <section className="mt-5 rounded-[24px] border border-[#fdecc8] bg-[#fffaf0] p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6" aria-labelledby="rmm-notify-title">
              <div><h2 id="rmm-notify-title" className="text-lg font-semibold text-[#0b1f3a]">{t("notification.title", { count: unannouncedHandoffs.length, name: partnerName })}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[#5f5e7a]">{t("notification.text", { name: partnerName })}</p></div>
              <form action={notifyReadMyMindHandoffsAction.bind(null, teamId)} className="mt-4 shrink-0 sm:mt-0"><button type="submit" className={BTN_PRIMARY}>{t("notification.action", { name: partnerName })}</button></form>
            </section>
          ) : null}
          <h2 className="mt-8 text-2xl font-semibold tracking-tight text-[#0b1f3a]">{t("choosePerspective")}</h2>
          <section className="mt-3 grid gap-4 md:grid-cols-3" aria-label={t("title") }>
            {packNavigation.map(({ pack, currentRound, canStart }, index) => {
              const canContinue = Boolean(currentRound && currentRound.ownParticipantState === "joined" && !currentRound.ownAnswerComplete && ((currentRound.status === "forming" && currentRound.handoffReadyAt === null) || currentRound.status === "active"));
              const icon = PACK_ICON[pack.key] ?? { icon: "spark" as IconName, tone: "violet" as IconTone };
              const recommended = index === 0 && openRounds.length === 0;
              return (
              <article key={pack.key} className={`rmm-enter card-lift group relative flex min-w-0 flex-col gap-3 rounded-[24px] border bg-white p-6 ${currentRound ? "border-[#6d49e0] shadow-[0_0_0_4px_rgba(109,73,224,0.10)]" : "border-[#e4e2f0]"}`} style={{ animationDelay: `${index * 70}ms` }}>
                <div className="flex items-center justify-between gap-2">
                  <IconTile name={icon.icon} tone={icon.tone} />
                  {recommended ? <span className="rounded-full bg-[#efeafd] px-2.5 py-0.5 text-[13px] font-semibold text-[#4a2fb8]">{t("recommended")}</span> : null}
                </div>
                <h3 className="text-xl font-semibold leading-tight text-[#0b1f3a]">{pack.title[locale]}</h3>
                <p className="text-sm leading-[1.55] text-[#5f5e7a]">{t(`packs.${pack.key}`)}</p>
                <div className="flex items-center gap-3"><span className="text-[13px] text-[#5f5e7a]">{t("promptCount", { count: pack.prompts.length })}</span><span className="flex gap-1" aria-hidden="true">{pack.prompts.map((prompt) => <span key={prompt.key} className="h-1.5 w-4 rounded-full bg-[#e4e2f0]" />)}</span></div>
                <p className={`text-sm font-semibold ${currentRound ? "text-[#4a2fb8]" : "text-[#5f5e7a]"}`}>{currentRound ? currentPackStatus(currentRound) : canStart ? t("availableNow") : t("availableAfter")}</p>
                {currentRound ? (
                  <Link href={`/teams/${encodeURIComponent(teamId)}/collaboration-lab/read-my-mind/${encodeURIComponent(currentRound.id)}`} className={`${BTN_PRIMARY} mt-auto`}>{canContinue ? t("continueRound") : t("viewStatus")}</Link>
                ) : canStart ? <form action={startReadMyMindRoundAction.bind(null, teamId)} className="mt-auto pt-2">
                  <input type="hidden" name="packKey" value={pack.key} />
                  <input type="hidden" name="packVersion" value={pack.version} />
                  <button type="submit" className={`${index === 0 && openRounds.length === 0 ? BTN_PRIMARY : BTN_QUIET} w-full`}>{t("start")}</button>
                </form> : null}
              </article>
            );})}
          </section>
        </>
      )}
      <GuessTallyCard round={null} summary={tally} partnerName={partnerName} variant="entry" />
    </main>
  );
}
