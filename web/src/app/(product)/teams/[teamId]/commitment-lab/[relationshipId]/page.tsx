import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ReportActionButton } from "@/features/reporting/ReportActionButton";
import { FounderTeamNavigation } from "@/features/teams/FounderTeamNavigation";
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

type Props = {
  params: Promise<{ teamId: string; relationshipId: string }>;
  searchParams: Promise<{ result?: string }>;
};

const CARD = "rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_25px_rgba(15,23,42,0.035)] sm:p-6";
const INPUT = "mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200";

export default async function CommitmentLabPage({ params, searchParams }: Props) {
  const { teamId, relationshipId } = await params;
  const { result } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/teams/${teamId}/commitment-lab/${relationshipId}`)}`);
  const lab = await getCommitmentLab(teamId, relationshipId, user.id, supabase);
  if (!lab) notFound();
  const [t, navigationT, locale] = await Promise.all([
    getTranslations("teams.commitmentLab"),
    getTranslations("teams.teamNavigation"),
    getLocale(),
  ]);
  const ownEntry = lab.founderEntries.find((entry) => entry.userId === user.id) ?? null;
  const ownReady = isCommitmentLabFounderReady(ownEntry);
  const entriesByUser = new Map(lab.founderEntries.map((entry) => [entry.userId, entry]));
  const bothReady = lab.participantUserIds.every((id) => isCommitmentLabFounderReady(entriesByUser.get(id) ?? null));
  const teamLabel = lab.team.name ?? lab.team.members.map((member, index) => member.displayName ?? `Founder ${index + 1}`).join(" + ");
  const threads = groupCommitmentLabDiscussion(lab.discussion);
  const date = new Intl.DateTimeFormat(getPresentationLocale(locale), { dateStyle: "medium", timeStyle: "short" });
  const memberName = (id: string) => {
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
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href={`/teams/${teamId}#team-alignment`} className="rounded-sm text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2">{t("back")}</Link>
      <header className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50/80 p-6 sm:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{t("eyebrow")}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{t("title")}</h1>
        <p className="mt-3 text-sm font-medium text-slate-700">{t("pair", { names: lab.participantNames.join(" & ") })}</p>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">{t("intro")}</p>
      </header>
      <FounderTeamNavigation teamId={teamId} active="alignment" labels={{ ariaLabel: navigationT("ariaLabel"), context: navigationT("context", { team: teamLabel }), overview: navigationT("overview"), setup: navigationT("setup"), library: navigationT("library"), alignment: navigationT("alignment") }} />
      {feedback ? <p role="status" className="mt-5 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{t(`feedback.${feedback}`)}</p> : null}

      <CommitmentLabMarkerProvider initialMarkers={ownEntry?.discussionMarkers ?? []}>
      <form action={personalAction} className="mt-6 grid gap-6">
        <section className={CARD} aria-labelledby="reality-title">
          <h2 id="reality-title" className="text-xl font-semibold text-slate-950">{t("personal.title")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("personal.help")}</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-800">{t("personal.currentHours")}<input type="number" name="currentHours" min={0} max={168} defaultValue={ownEntry?.currentHours ?? ""} className={INPUT} placeholder={t("personal.hours")} /></label>
            <label className="text-sm font-medium text-slate-800">{t("personal.difficultHours")}<input type="number" name="difficultWeekHours" min={0} max={168} defaultValue={ownEntry?.difficultWeekHours ?? ""} className={INPUT} placeholder={t("personal.hours")} /></label>
          </div>
          <fieldset className="mt-5">
            <legend className="text-sm font-medium text-slate-800">{t("personal.obligations")}</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {COMMITMENT_LAB_OBLIGATIONS.map((key) => <label key={key} className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"><input type="checkbox" name="obligations" value={key} defaultChecked={ownEntry?.obligationCategories.includes(key)} />{t(`obligations.${key}`)}</label>)}
            </div>
          </fieldset>
          <label className="mt-5 block text-sm font-medium text-slate-800" htmlFor="change-note">{t("personal.changeNote")}</label>
          <CommitmentLabSpeechTextarea id="change-note" name="changeNote" defaultValue={ownEntry?.changeNote} />
          <label className="mt-5 block text-sm font-medium text-slate-800">{t("personal.realityFit")}<select name="realityFit" defaultValue={ownEntry?.realityFit ?? ""} className={INPUT}><option value="">{t("personal.realityOptions.empty")}</option><option value="realistic">{t("personal.realityOptions.realistic")}</option><option value="partly">{t("personal.realityOptions.partly")}</option><option value="reconsider">{t("personal.realityOptions.reconsider")}</option></select></label>
        </section>

        <section className={CARD} aria-labelledby="meaning-title">
          <h2 id="meaning-title" className="text-xl font-semibold text-slate-950">{t("meaning.title")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("meaning.aspectsHelp")}</p>
          <label className="mt-5 block text-sm font-medium text-slate-800" htmlFor="commitment-meaning">{t("meaning.core")}</label>
          <CommitmentLabSpeechTextarea id="commitment-meaning" name="commitmentMeaning" defaultValue={ownEntry?.commitmentMeaning} rows={5} />
          <CommitmentLabMarkerToggle marker="commitment_meaning" />
          <div className="mt-6 grid gap-5">
            {COMMITMENT_LAB_ASPECTS.map((aspect) => {
              const field = `${aspect}Reflection` as const;
              return <div key={aspect}><label className="block text-sm font-medium text-slate-800" htmlFor={`aspect-${aspect}`}>{t(`meaning.${aspect}`)}</label><CommitmentLabSpeechTextarea id={`aspect-${aspect}`} name={field} defaultValue={ownEntry?.[field]} /><CommitmentLabMarkerToggle marker={`aspect:${aspect}`} /></div>;
            })}
          </div>
        </section>

        <section className={CARD} aria-labelledby="difficulty-title">
          <h2 id="difficulty-title" className="text-xl font-semibold text-slate-950">{t("difficulty.title")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("difficulty.help")}</p>
          <label className="mt-5 block text-sm font-medium text-slate-800" htmlFor="difficult-situation">{t("difficulty.question")}</label>
          <CommitmentLabSpeechTextarea id="difficult-situation" name="difficultSituation" defaultValue={ownEntry?.difficultSituation} />
          <label className="mt-5 block text-sm font-medium text-slate-800" htmlFor="desired-alternative">{t("difficulty.desired")}</label>
          <CommitmentLabSpeechTextarea id="desired-alternative" name="desiredAlternative" defaultValue={ownEntry?.desiredAlternative} />
          <CommitmentLabMarkerToggle marker="difficulty_wish" />
        </section>

        <section className={CARD} aria-labelledby="scenarios-title">
          <h2 id="scenarios-title" className="text-xl font-semibold text-slate-950">{t("scenarios.title")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("scenarios.help")}</p>
          <div className="mt-5 grid gap-5">
            {COMMITMENT_LAB_SCENARIOS.map((scenario, index) => <article key={scenario} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{index + 1}</p><h3 className="mt-2 text-sm font-semibold leading-6 text-slate-900">{t(`scenarios.${scenario}`)}</h3><label className="mt-4 block text-sm font-medium text-slate-800" htmlFor={`${scenario}-action`}>{t("scenarios.action")}</label><CommitmentLabSpeechTextarea id={`${scenario}-action`} name={`scenario.${scenario}.action`} defaultValue={ownEntry?.scenarioAnswers[scenario].action} /><label className="mt-4 block text-sm font-medium text-slate-800" htmlFor={`${scenario}-expectation`}>{t("scenarios.expectation")}</label><CommitmentLabSpeechTextarea id={`${scenario}-expectation`} name={`scenario.${scenario}.expectation`} defaultValue={ownEntry?.scenarioAnswers[scenario].expectation} /><CommitmentLabMarkerToggle marker={`scenario:${scenario}`} /></article>)}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">{t("markers.limit")}</p>
          <ReportActionButton type="submit" variant="primary" className="mt-6 min-h-11">{t("personal.save")}</ReportActionButton>
        </section>
      </form>
      </CommitmentLabMarkerProvider>

      {ownEntry && ownReady ? (
        <section className={`${CARD} mt-6`} aria-labelledby="own-snapshot-title">
          <h2 id="own-snapshot-title" className="text-xl font-semibold text-slate-950">{t("snapshot.ownTitle")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("snapshot.ownHelp")}</p>
          <div className="mt-5">
            <CommitmentLabSnapshotCard entry={ownEntry} labels={snapshotLabels} obligationLabel={(key) => t(`obligations.${key}`)} markerLabel={markerLabel} />
          </div>
        </section>
      ) : null}

      <div className="mt-6 grid gap-6">
        <section className={CARD} aria-labelledby="compare-title">
          <h2 id="compare-title" className="text-xl font-semibold text-slate-950">{t("compare.title")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{bothReady ? t("snapshot.sharedHelp") : t("compare.waiting")}</p>
          {bothReady ? <div className="mt-5 grid gap-4 md:grid-cols-2">{lab.participantUserIds.map((id, index) => { const entry = entriesByUser.get(id)!; return <CommitmentLabSnapshotCard key={id} entry={entry} founderName={lab.participantNames[index]} labels={snapshotLabels} obligationLabel={(key) => t(`obligations.${key}`)} markerLabel={markerLabel} />; })}</div> : null}
        </section>

        <section className={CARD} aria-labelledby="discussion-title">
          <h2 id="discussion-title" className="text-xl font-semibold text-slate-950">{t("discussion.title")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("discussion.help")}</p>
          {lab.sharedDiscussionMarkers.length ? <div className="mt-5 rounded-xl border border-violet-200 bg-violet-50/50 p-4"><h3 className="font-semibold text-slate-950">{t("markers.sharedTitle")}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{t("markers.sharedHelp")}</p><ul className="mt-3 grid gap-3 sm:grid-cols-2">{lab.sharedDiscussionMarkers.map(({ userId, marker }) => { const entry = entriesByUser.get(userId)!; return <li key={`${userId}:${marker}`} className="rounded-lg bg-white p-3"><p className="text-xs font-semibold text-violet-900">{memberName(userId)} · {markerLabel(marker)}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{getCommitmentLabMarkerAnswer(entry, marker)}</p></li>; })}</ul></div> : null}
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">{prompts.map((prompt) => <li key={prompt} className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">{prompt}</li>)}</ul>
          <CommitmentLabDiscussionComposer action={discussionAction} />
          {threads.length ? <ol className="mt-6 space-y-4">{threads.map((thread) => <li key={thread.root.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"><p className="text-xs text-slate-500">{memberName(thread.root.authorUserId)} · {date.format(new Date(thread.root.createdAt))}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-800">{thread.root.body}</p>{thread.replies.length ? <ol className="mt-4 space-y-3 border-l-2 border-slate-200 pl-4">{thread.replies.map((reply) => <li key={reply.id}><p className="text-xs text-slate-500">{memberName(reply.authorUserId)} · {date.format(new Date(reply.createdAt))}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{reply.body}</p></li>)}</ol> : null}<details className="mt-3"><summary className="cursor-pointer text-sm font-medium text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)]">{t("discussion.reply")}</summary><CommitmentLabDiscussionComposer action={discussionAction} parentEntryId={thread.root.id} /></details></li>)}</ol> : <p className="mt-5 rounded-xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-600">{t("discussion.empty")}</p>}
        </section>

        <section className={CARD} aria-labelledby="reflection-title">
          <h2 id="reflection-title" className="text-xl font-semibold text-slate-950">{t("reflection.title")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("reflection.help")}</p>
          <form action={reflectionAction} className="mt-4"><CommitmentLabSpeechTextarea id="shared-reflection" name="sharedReflection" defaultValue={lab.sharedReflection} rows={6} /><ReportActionButton type="submit" variant="utility" className="mt-4 min-h-11">{t("reflection.save")}</ReportActionButton></form>
        </section>

        <section className="rounded-2xl border border-violet-200 bg-violet-50/40 p-5 sm:p-6" aria-labelledby="handoff-title">
          <h2 id="handoff-title" className="text-xl font-semibold text-slate-950">{t("handoff.title")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{lab.team.members.length === 3 ? t("handoff.three") : t("handoff.help")}</p>
          {lab.team.members.length === 2 ? <form action={handoffAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"><label className="text-sm font-medium text-slate-800">{t("handoff.choose")}<select name="setupKey" defaultValue="time_commitment" className={INPUT}><option value="time_commitment">{t("handoff.time")}</option><option value="changing_commitment">{t("handoff.changing")}</option></select></label><ReportActionButton type="submit" disabled={!lab.sharedReflection.trim()} className="min-h-11">{t("handoff.copy")}</ReportActionButton></form> : <div className="mt-4 flex flex-wrap gap-3"><Link href={`/teams/${teamId}/setup/time_commitment`} className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">{t("handoff.time")}</Link><Link href={`/teams/${teamId}/setup/changing_commitment`} className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">{t("handoff.changing")}</Link></div>}
          {lab.setupWorkingNotes.time_commitment.trim() || lab.setupWorkingNotes.changing_commitment.trim() ? <p className="mt-3 text-xs leading-5 text-slate-600">{t("handoff.existing")}</p> : null}
        </section>
      </div>
    </main>
  );
}
