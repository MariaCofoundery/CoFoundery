import Link from "next/link";
import { TeamUnavailable } from "@/features/access/TeamUnavailable";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { ReportActionButton } from "@/features/reporting/ReportActionButton";
import { TeamPageHeader, getTeamLabel } from "@/features/teams/TeamPageHeader";
import {
  CommitmentLabDiscussionComposer,
  CommitmentLabMarkerProvider,
  CommitmentLabMarkerToggle,
  CommitmentLabSpeechTextarea,
} from "@/features/commitmentLab/CommitmentLabInputs";
import { CommitmentLabSnapshotCard } from "@/features/commitmentLab/CommitmentLabSnapshotCard";
import { getCommitmentLab } from "@/features/commitmentLab/commitmentLabData";
import {
  COMMITMENT_LAB_ASPECTS,
  COMMITMENT_LAB_OBLIGATIONS,
  COMMITMENT_LAB_SCENARIOS,
  getCommitmentLabMarkerAnswer,
  getCommitmentLabMarkerMessageKey,
  groupCommitmentLabDiscussion,
  isCommitmentLabFounderReady,
} from "@/features/commitmentLab/commitmentLabModel";
import {
  createCommitmentLabDiscussionEntryAction,
  handoffCommitmentLabToFounderSetupAction,
  saveCommitmentLabFounderEntryAction,
  saveCommitmentLabSharedReflectionAction,
} from "@/features/commitmentLab/commitmentLabActions";
import { getPresentationLocale } from "@/i18n/presentationLocale";
import { AppIcon, IconTile, type IconName, type IconTone } from "@/features/ui/Icons";

type Props = {
  params: Promise<{ teamId: string; relationshipId: string }>;
  searchParams: Promise<{ result?: string }>;
};

const CARD = "rounded-[24px] border border-[#e4e2f0] bg-white p-5 sm:p-[26px]";
const INPUT = "mt-2 min-h-11 w-full rounded-xl border border-[#d8d5ea] bg-white px-3.5 py-2 text-[15px] text-[#0b1f3a] outline-none focus:border-[#6d49e0] focus:ring-4 focus:ring-[#6d49e0]/15";

const SECTION_ICON: Record<string, { icon: IconName; tone: IconTone }> = {
  "reality-title": { icon: "clock", tone: "violet" },
  "meaning-title": { icon: "heart", tone: "pink" },
  "difficulty-title": { icon: "warn", tone: "amber" },
  "scenarios-title": { icon: "game", tone: "blue" },
  "own-snapshot-title": { icon: "person", tone: "violet" },
  "compare-title": { icon: "team", tone: "blue" },
  "discussion-title": { icon: "chat", tone: "teal" },
  "reflection-title": { icon: "spark", tone: "amber" },
  "handoff-title": { icon: "pencil", tone: "green" },
};

function SectionHead({ id, title, help }: { id: string; title: string; help: string }) {
  const icon = SECTION_ICON[id] ?? { icon: "check" as IconName, tone: "violet" as IconTone };
  return (
    <div className="flex items-start gap-3.5">
      <IconTile name={icon.icon} tone={icon.tone} />
      <div className="min-w-0">
        <h2 id={id} className="text-xl font-semibold leading-tight text-[#0b1f3a]">{title}</h2>
        <p className="mt-1 text-sm leading-[1.55] text-[#5f5e7a]">{help}</p>
      </div>
    </div>
  );
}

export default async function CommitmentLabPage({ params, searchParams }: Props) {
  const { teamId, relationshipId } = await params;
  const { result } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await getRequestUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/teams/${teamId}/commitment-lab/${relationshipId}`)}`);
  const lab = await getCommitmentLab(teamId, relationshipId, user.id, supabase);
  if (!lab) return <TeamUnavailable teamId={teamId} />;
  const [t, teamLabel, locale] = await Promise.all([
    getTranslations("teams.commitmentLab"),
    getTeamLabel(supabase, teamId),
    getLocale(),
  ]);
  const ownEntry = lab.founderEntries.find((entry) => entry.userId === user.id) ?? null;
  const ownReady = isCommitmentLabFounderReady(ownEntry);
  const entriesByUser = new Map(lab.founderEntries.map((entry) => [entry.userId, entry]));
  const bothReady = lab.participantUserIds.every((id) => isCommitmentLabFounderReady(entriesByUser.get(id) ?? null));
  const threads = groupCommitmentLabDiscussion(lab.discussion);
  const date = new Intl.DateTimeFormat(getPresentationLocale(locale), { dateStyle: "medium", timeStyle: "short" });
  // Null heisst: Das Konto ist geloescht. Der Beitrag bleibt stehen, damit die
  // andere Person ihren Gespraechsfaden behaelt - aber er bekommt keinen
  // erfundenen Namen.
  const memberName = (id: string | null) => {
    if (!id) return t("discussion.formerMember");
    const index = lab.participantUserIds.indexOf(id);
    return index >= 0 ? lab.participantNames[index] : "Founder";
  };
  const personalAction = saveCommitmentLabFounderEntryAction.bind(null, teamId, relationshipId);
  const reflectionAction = saveCommitmentLabSharedReflectionAction.bind(null, teamId, relationshipId);
  const discussionAction = createCommitmentLabDiscussionEntryAction.bind(null, teamId, relationshipId);
  const handoffAction = handoffCommitmentLabToFounderSetupAction.bind(null, teamId, relationshipId);
  const feedback = result && ["personal-saved", "reflection-saved", "commented"].includes(result) ? result : result ? "error" : null;
  const prompts = ["meaning", "less", "expectation", "timing", "renegotiation"].map((key) =>
    t(`discussion.prompts.${key}`)
  );
  const markerLabel = (marker: Parameters<typeof getCommitmentLabMarkerMessageKey>[0]) =>
    t(getCommitmentLabMarkerMessageKey(marker));
  const snapshotLabels = {
    time: t("snapshot.time"),
    currentHours: (hours: number) => t("snapshot.currentHours", { hours }),
    difficultHours: (hours: number) => t("snapshot.difficultHours", { hours }),
    framework: t("snapshot.framework"),
    changes: t("snapshot.changes"),
    meaning: t("snapshot.meaning"),
    difficult: t("snapshot.difficult"),
    desired: t("snapshot.desired"),
    markers: t("snapshot.markers"),
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-6">
      {/* Phase 11.7B.1: gemeinsamer Teamkopf; das Lab gehoert zur Uebersicht. */}
      <TeamPageHeader teamId={teamId} active="overview" title={t("title")} teamLabel={teamLabel} hideTitle />
      <section className="brand-panel relative mt-5 overflow-hidden rounded-[28px] px-6 py-8 sm:px-9">
        <span aria-hidden="true" className="orb -top-14 right-10 hidden h-40 w-40 md:block" />
        <div className="relative flex items-center gap-[18px]">
          <span aria-hidden="true" className="hidden h-14 w-14 flex-none items-center justify-center rounded-[14px] bg-white/20 sm:inline-flex"><AppIcon name="link" /></span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-white opacity-90">{t("eyebrow")}</p>
            <h1 className="mt-0.5 text-[30px] font-semibold leading-[1.15] sm:text-[34px]">{t("title")}</h1>
            <p className="mt-2 max-w-2xl text-base leading-7 text-white opacity-95">{t("intro")}</p>
            <p className="mt-3"><span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-[13px] font-semibold text-white">{t("pair", { names: lab.participantNames.join(" & ") })}</span></p>
          </div>
        </div>
      </section>
      {feedback ? <p role="status" className="mt-5 rounded-xl bg-[#f1f0f7] px-4 py-3 text-sm text-[#33325e]">{t(`feedback.${feedback}`)}</p> : null}

      <CommitmentLabMarkerProvider initialMarkers={ownEntry?.discussionMarkers ?? []}>
      <form action={personalAction} className="mt-6 grid gap-6">
        <section className={CARD} aria-labelledby="reality-title">
          <SectionHead id="reality-title" title={t("personal.title")} help={t("personal.help")} />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-[#33325e]">{t("personal.currentHours")}<input type="number" name="currentHours" min={0} max={168} defaultValue={ownEntry?.currentHours ?? ""} className={INPUT} placeholder={t("personal.hours")} /></label>
            <label className="text-sm font-medium text-[#33325e]">{t("personal.difficultHours")}<input type="number" name="difficultWeekHours" min={0} max={168} defaultValue={ownEntry?.difficultWeekHours ?? ""} className={INPUT} placeholder={t("personal.hours")} /></label>
          </div>
          <fieldset className="mt-5">
            <legend className="text-sm font-medium text-[#33325e]">{t("personal.obligations")}</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {COMMITMENT_LAB_OBLIGATIONS.map((key) => <label key={key} className="flex min-h-11 items-center gap-3 rounded-xl border border-[#e4e2f0] px-3 py-2 text-sm text-[#33325e]"><input type="checkbox" name="obligations" value={key} defaultChecked={ownEntry?.obligationCategories.includes(key)} />{t(`obligations.${key}`)}</label>)}
            </div>
          </fieldset>
          <label className="mt-5 block text-sm font-medium text-[#33325e]" htmlFor="change-note">{t("personal.changeNote")}</label>
          <CommitmentLabSpeechTextarea id="change-note" name="changeNote" defaultValue={ownEntry?.changeNote} />
          <label className="mt-5 block text-sm font-medium text-[#33325e]">{t("personal.realityFit")}<select name="realityFit" defaultValue={ownEntry?.realityFit ?? ""} className={INPUT}><option value="">{t("personal.realityOptions.empty")}</option><option value="realistic">{t("personal.realityOptions.realistic")}</option><option value="partly">{t("personal.realityOptions.partly")}</option><option value="reconsider">{t("personal.realityOptions.reconsider")}</option></select></label>
        </section>

        <section className={CARD} aria-labelledby="meaning-title">
          <SectionHead id="meaning-title" title={t("meaning.title")} help={t("meaning.aspectsHelp")} />
          <label className="mt-5 block text-sm font-medium text-[#33325e]" htmlFor="commitment-meaning">{t("meaning.core")}</label>
          <CommitmentLabSpeechTextarea id="commitment-meaning" name="commitmentMeaning" defaultValue={ownEntry?.commitmentMeaning} rows={5} />
          <CommitmentLabMarkerToggle marker="commitment_meaning" />
          <div className="mt-6 grid gap-5">
            {COMMITMENT_LAB_ASPECTS.map((aspect) => {
              const field = `${aspect}Reflection` as const;
              return <div key={aspect}><label className="block text-sm font-medium text-[#33325e]" htmlFor={`aspect-${aspect}`}>{t(`meaning.${aspect}`)}</label><CommitmentLabSpeechTextarea id={`aspect-${aspect}`} name={field} defaultValue={ownEntry?.[field]} /><CommitmentLabMarkerToggle marker={`aspect:${aspect}`} /></div>;
            })}
          </div>
        </section>

        <section className={CARD} aria-labelledby="difficulty-title">
          <SectionHead id="difficulty-title" title={t("difficulty.title")} help={t("difficulty.help")} />
          <label className="mt-5 block text-sm font-medium text-[#33325e]" htmlFor="difficult-situation">{t("difficulty.question")}</label>
          <CommitmentLabSpeechTextarea id="difficult-situation" name="difficultSituation" defaultValue={ownEntry?.difficultSituation} />
          <label className="mt-5 block text-sm font-medium text-[#33325e]" htmlFor="desired-alternative">{t("difficulty.desired")}</label>
          <CommitmentLabSpeechTextarea id="desired-alternative" name="desiredAlternative" defaultValue={ownEntry?.desiredAlternative} />
          <CommitmentLabMarkerToggle marker="difficulty_wish" />
        </section>

        <section className={CARD} aria-labelledby="scenarios-title">
          <SectionHead id="scenarios-title" title={t("scenarios.title")} help={t("scenarios.help")} />
          <div className="mt-5 grid gap-5">
            {COMMITMENT_LAB_SCENARIOS.map((scenario, index) => <article key={scenario} className="rounded-xl border border-[#e4e2f0] bg-[#f7f6fb]/60 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5f5e7a]">{index + 1}</p><h3 className="mt-2 text-sm font-semibold leading-6 text-[#0b1f3a]">{t(`scenarios.${scenario}`)}</h3><label className="mt-4 block text-sm font-medium text-[#33325e]" htmlFor={`${scenario}-action`}>{t("scenarios.action")}</label><CommitmentLabSpeechTextarea id={`${scenario}-action`} name={`scenario.${scenario}.action`} defaultValue={ownEntry?.scenarioAnswers[scenario].action} /><label className="mt-4 block text-sm font-medium text-[#33325e]" htmlFor={`${scenario}-expectation`}>{t("scenarios.expectation")}</label><CommitmentLabSpeechTextarea id={`${scenario}-expectation`} name={`scenario.${scenario}.expectation`} defaultValue={ownEntry?.scenarioAnswers[scenario].expectation} /><CommitmentLabMarkerToggle marker={`scenario:${scenario}`} /></article>)}
          </div>
          <p className="mt-4 text-xs leading-5 text-[#5f5e7a]">{t("markers.limit")}</p>
          <ReportActionButton type="submit" variant="primary" className="mt-6 min-h-11">{t("personal.save")}</ReportActionButton>
        </section>
      </form>
      </CommitmentLabMarkerProvider>

      {ownEntry && ownReady ? (
        <section className={`${CARD} mt-6`} aria-labelledby="own-snapshot-title">
          <SectionHead id="own-snapshot-title" title={t("snapshot.ownTitle")} help={t("snapshot.ownHelp")} />
          <div className="mt-5">
            <CommitmentLabSnapshotCard entry={ownEntry} labels={snapshotLabels} obligationLabel={(key) => t(`obligations.${key}`)} markerLabel={markerLabel} />
          </div>
        </section>
      ) : null}

      <div className="mt-6 grid gap-6">
        <section className={CARD} aria-labelledby="compare-title">
          <SectionHead id="compare-title" title={t("compare.title")} help={bothReady ? t("snapshot.sharedHelp") : t("compare.waiting")} />
          {bothReady ? <div className="mt-5 grid gap-4 md:grid-cols-2">{lab.participantUserIds.map((id, index) => { const entry = entriesByUser.get(id)!; return <CommitmentLabSnapshotCard key={id} entry={entry} founderName={lab.participantNames[index]} labels={snapshotLabels} obligationLabel={(key) => t(`obligations.${key}`)} markerLabel={markerLabel} />; })}</div> : null}
        </section>

        <section className={CARD} aria-labelledby="discussion-title">
          <SectionHead id="discussion-title" title={t("discussion.title")} help={t("discussion.help")} />
          {lab.sharedDiscussionMarkers.length ? <div className="mt-5 rounded-xl border border-[#d9cff8] bg-[#f5f2fe]/50 p-4"><h3 className="font-semibold text-[#0b1f3a]">{t("markers.sharedTitle")}</h3><p className="mt-1 text-sm leading-6 text-[#5f5e7a]">{t("markers.sharedHelp")}</p><ul className="mt-3 grid gap-3 sm:grid-cols-2">{lab.sharedDiscussionMarkers.map(({ userId, marker }) => { const entry = entriesByUser.get(userId)!; return <li key={`${userId}:${marker}`} className="rounded-lg bg-white p-3"><p className="text-xs font-semibold text-[#3a2394]">{memberName(userId)} · {markerLabel(marker)}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#33325e]">{getCommitmentLabMarkerAnswer(entry, marker)}</p></li>; })}</ul></div> : null}
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">{prompts.map((prompt) => <li key={prompt} className="rounded-xl bg-[#f7f6fb] px-4 py-3 text-sm leading-6 text-[#33325e]">{prompt}</li>)}</ul>
          <CommitmentLabDiscussionComposer action={discussionAction} />
          {threads.length ? <ol className="mt-6 space-y-4">{threads.map((thread) => <li key={thread.root.id} className="rounded-xl border border-[#e4e2f0] bg-[#f7f6fb]/60 p-4"><p className="text-xs text-[#5f5e7a]">{memberName(thread.root.authorUserId)} · {date.format(new Date(thread.root.createdAt))}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#33325e]">{thread.root.body}</p>{thread.replies.length ? <ol className="mt-4 space-y-3 border-l-2 border-[#e4e2f0] pl-4">{thread.replies.map((reply) => <li key={reply.id}><p className="text-xs text-[#5f5e7a]">{memberName(reply.authorUserId)} · {date.format(new Date(reply.createdAt))}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#33325e]">{reply.body}</p></li>)}</ol> : null}<details className="mt-3"><summary className="cursor-pointer text-sm font-medium text-[#5f5e7a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)]">{t("discussion.reply")}</summary><CommitmentLabDiscussionComposer action={discussionAction} parentEntryId={thread.root.id} /></details></li>)}</ol> : <p className="mt-5 rounded-xl border border-dashed border-[#d8d5ea] px-4 py-4 text-sm text-[#5f5e7a]">{t("discussion.empty")}</p>}
        </section>

        <section className={CARD} aria-labelledby="reflection-title">
          <SectionHead id="reflection-title" title={t("reflection.title")} help={t("reflection.help")} />
          <form action={reflectionAction} className="mt-4"><CommitmentLabSpeechTextarea id="shared-reflection" name="sharedReflection" defaultValue={lab.sharedReflection} rows={6} /><ReportActionButton type="submit" variant="utility" className="mt-4 min-h-11">{t("reflection.save")}</ReportActionButton></form>
        </section>

        <section className="rounded-2xl border border-[#d9cff8] bg-[#f5f2fe]/40 p-5 sm:p-6" aria-labelledby="handoff-title">
          <SectionHead id="handoff-title" title={t("handoff.title")} help={lab.team.members.length > 2 ? t("handoff.three") : t("handoff.help")} />
          {lab.team.members.length === 2 ? <form action={handoffAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"><label className="text-sm font-medium text-[#33325e]">{t("handoff.choose")}<select name="setupKey" defaultValue="time_commitment" className={INPUT}><option value="time_commitment">{t("handoff.time")}</option><option value="changing_commitment">{t("handoff.changing")}</option></select></label><ReportActionButton type="submit" disabled={!lab.sharedReflection.trim()} className="min-h-11">{t("handoff.copy")}</ReportActionButton></form> : <div className="mt-4 flex flex-wrap gap-3"><Link href={`/teams/${teamId}/setup/time_commitment`} className="inline-flex min-h-11 items-center rounded-lg border border-[#d8d5ea] bg-white px-4 py-2 text-sm font-semibold text-[#33325e]">{t("handoff.time")}</Link><Link href={`/teams/${teamId}/setup/changing_commitment`} className="inline-flex min-h-11 items-center rounded-lg border border-[#d8d5ea] bg-white px-4 py-2 text-sm font-semibold text-[#33325e]">{t("handoff.changing")}</Link></div>}
          {lab.setupWorkingNotes.time_commitment.trim() || lab.setupWorkingNotes.changing_commitment.trim() ? <p className="mt-3 text-xs leading-5 text-[#5f5e7a]">{t("handoff.existing")}</p> : null}
        </section>
      </div>
    </main>
  );
}
