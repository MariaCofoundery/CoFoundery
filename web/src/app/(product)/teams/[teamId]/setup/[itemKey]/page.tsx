import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ReportActionButton } from "@/features/reporting/ReportActionButton";
import { FounderSetupStatusChip } from "@/features/teams/FounderSetupStatusChip";
import { FounderSetupDiscussionComposer } from "@/features/teams/FounderSetupDiscussionComposer";
import { FounderTeamNavigation } from "@/features/teams/FounderTeamNavigation";
import { getFounderSetupCatalogItem, isFounderSetupItemKey } from "@/features/teams/founderSetupCatalog";
import { getFounderSetup, getFounderSetupDiscussion } from "@/features/teams/founderSetupData";
import { groupFounderSetupDiscussionEntries } from "@/features/teams/founderSetupDiscussion";
import { safeDocumentationHref } from "@/features/teams/founderSetupModel";
import {
  confirmFounderSetupRevisionAction,
  createFounderSetupDiscussionEntryAction,
  proposeFounderSetupRevisionAction,
  saveFounderSetupWorkingStateAction,
  withdrawFounderSetupConfirmationAction,
} from "@/features/teams/founderSetupActions";
import { getPresentationLocale } from "@/i18n/presentationLocale";

type Props = {
  params: Promise<{ teamId: string; itemKey: string }>;
  searchParams: Promise<{ result?: string }>;
};

const CARD = "rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_25px_rgba(15,23,42,0.035)] sm:p-6";
const INPUT = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200";

export default async function FounderSetupItemPage({ params, searchParams }: Props) {
  const { teamId, itemKey } = await params;
  const { result } = await searchParams;
  if (!isFounderSetupItemKey(itemKey)) notFound();
  const catalogItem = getFounderSetupCatalogItem(itemKey);
  if (!catalogItem) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/teams/${teamId}/setup/${itemKey}`)}`);
  const setup = await getFounderSetup(teamId, user.id, supabase);
  if (!setup) notFound();
  const item = setup.items.find((entry) => entry.key === itemKey);
  if (!item) notFound();
  const [t, navigationT, locale, discussionEntries] = await Promise.all([
    getTranslations("teams.setup"),
    getTranslations("teams.teamNavigation"),
    getLocale(),
    getFounderSetupDiscussion(teamId, itemKey, supabase),
  ]);
  const discussionThreads = groupFounderSetupDiscussionEntries(discussionEntries);
  const dateFormatter = new Intl.DateTimeFormat(getPresentationLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const memberName = (userId: string) => {
    const index = setup.members.findIndex((member) => member.userId === userId);
    return index >= 0
      ? setup.members[index].displayName ?? t("founderFallback", { index: index + 1 })
      : t("founderFallback", { index: 1 });
  };
  const teamLabel = setup.members
    .map((member, index) => member.displayName ?? t("founderFallback", { index: index + 1 }))
    .join(" + ");
  const saveAction = saveFounderSetupWorkingStateAction.bind(null, teamId, itemKey);
  const proposeAction = proposeFounderSetupRevisionAction.bind(null, teamId, itemKey);
  const confirmAction = confirmFounderSetupRevisionAction.bind(null, teamId, itemKey);
  const withdrawAction = withdrawFounderSetupConfirmationAction.bind(null, teamId, itemKey);
  const discussionAction = createFounderSetupDiscussionEntryAction.bind(null, teamId, itemKey);
  const currentUserConfirmed = item.pendingRevision?.confirmations.some((confirmation) => confirmation.userId === user.id) ?? false;
  const feedbackKey = result && ["saved", "proposed", "confirmed", "withdrawn", "commented"].includes(result)
    ? result
    : result
      ? "error"
      : null;

  const revisionCard = (kind: "current" | "pending") => {
    const revision = kind === "current" ? item.currentConfirmedRevision : item.pendingRevision;
    if (!revision) return null;
    const href = safeDocumentationHref(revision.documentationReference);
    return (
      <section
        className={`${CARD} ${kind === "pending" ? "border-violet-200 bg-violet-50/35" : ""}`}
        aria-labelledby={`${kind}-revision-title`}
      >
        <h2 id={`${kind}-revision-title`} className="text-xl font-semibold text-slate-950">{t(`detail.${kind}Title`)}</h2>
        <div className="mt-3">
          <FounderSetupStatusChip
            status={revision.resolutionStatus}
            label={t(`statuses.${revision.resolutionStatus}`)}
          />
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{revision.note || t("detail.noNote")}</p>
        {revision.documentationReference ? (
          <p className="mt-4 text-sm text-slate-600">
            {t("detail.documentationReference")}: {href ? (
              <a href={href} target="_blank" rel="noreferrer noopener" className="font-medium underline">{revision.documentationReference}</a>
            ) : <span>{revision.documentationReference}</span>}
          </p>
        ) : null}
        {kind === "pending" ? (
          <div className="mt-5">
            {!currentUserConfirmed ? (
              <p className="rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm font-medium text-violet-950">
                {t("detail.yourConfirmationPending")}
              </p>
            ) : null}
            <h3 className="mt-5 text-sm font-semibold text-slate-900">{t("detail.confirmations")}</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {setup.members.map((member, index) => {
                const confirmed = revision.confirmations.some((confirmation) => confirmation.userId === member.userId);
                return <li key={member.userId} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{member.displayName ?? t("founderFallback", { index: index + 1 })} · {confirmed ? t("detail.confirmed") : t("detail.awaiting")}</li>;
              })}
            </ul>
            <form action={currentUserConfirmed ? withdrawAction : confirmAction} className="mt-4">
              <input type="hidden" name="revisionId" value={revision.id} />
              <ReportActionButton
                type="submit"
                variant={currentUserConfirmed ? "utility" : "primary"}
                className="min-h-11"
              >
                {currentUserConfirmed ? t("actions.withdraw") : t("actions.confirm")}
              </ReportActionButton>
            </form>
          </div>
        ) : null}
      </section>
    );
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href={`/teams/${teamId}/setup`} className="rounded-sm text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2">{t("backToSetup")}</Link>
      <header className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50/80 p-6 sm:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{t(`categories.${catalogItem.category}`)}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{t(`items.${itemKey}.title`)}</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">{t(`items.${itemKey}.question`)}</p>
        {catalogItem.legalNote ? <p className="mt-4 rounded-xl bg-white px-4 py-3 text-xs leading-6 text-slate-600">{t("legalSpecific")}</p> : null}
      </header>
      <FounderTeamNavigation
        teamId={teamId}
        active="setup"
        labels={{
          ariaLabel: navigationT("ariaLabel"),
          context: navigationT("context", { team: teamLabel }),
          overview: navigationT("overview"),
          setup: navigationT("setup"),
          library: navigationT("library"),
          alignment: navigationT("alignment"),
        }}
      />
      {feedbackKey ? <p role="status" className="mt-5 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{t(`feedback.${feedbackKey}`)}</p> : null}
      <div className="mt-6 grid gap-6">
        {revisionCard("current")}
        <section className={CARD} aria-labelledby="discussion-title">
          <h2 id="discussion-title" className="text-xl font-semibold text-slate-950">{t("discussion.title")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("discussion.help")}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{t("discussion.visibility")}</p>
          <FounderSetupDiscussionComposer action={discussionAction} />
          {discussionThreads.length > 0 ? (
            <ol className="mt-6 space-y-4">
              {discussionThreads.map((thread) => (
                <li key={thread.root.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <p className="text-xs text-slate-500">
                    {memberName(thread.root.authorUserId)} · {dateFormatter.format(new Date(thread.root.createdAt))}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-800">{thread.root.body}</p>
                  {thread.replies.length > 0 ? (
                    <ol className="mt-4 space-y-3 border-l-2 border-slate-200 pl-4">
                      {thread.replies.map((reply) => (
                        <li key={reply.id}>
                          <p className="text-xs text-slate-500">
                            {memberName(reply.authorUserId)} · {dateFormatter.format(new Date(reply.createdAt))}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{reply.body}</p>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                  <details className="mt-3">
                    <summary className="cursor-pointer rounded-sm text-sm font-medium text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2">
                      {t("discussion.replyAction")}
                    </summary>
                    <FounderSetupDiscussionComposer action={discussionAction} parentEntryId={thread.root.id} compact />
                  </details>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-6 rounded-xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-600">{t("discussion.empty")}</p>
          )}
        </section>
        <section className={CARD} aria-labelledby="working-note-title">
          <h2 id="working-note-title" className="text-xl font-semibold text-slate-950">{t("detail.workingTitle")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("detail.workingHelp")}</p>
          <form action={saveAction} className="mt-5">
            <label className="block text-sm font-medium text-slate-800">{t("detail.workStatus")}
              <select name="workStatus" defaultValue={item.workStatus} className={INPUT}>
                <option value="open">{t("statuses.open")}</option>
                <option value="discussing">{t("statuses.discussing")}</option>
              </select>
            </label>
            <label className="mt-4 block text-sm font-medium text-slate-800">{t("detail.workingNote")}
              <textarea name="workingNote" defaultValue={item.workingNote} maxLength={10000} rows={7} className={INPUT} />
            </label>
            <ReportActionButton type="submit" variant="utility" className="mt-4 min-h-11">
              {t("actions.save")}
            </ReportActionButton>
          </form>
        </section>
        {revisionCard("pending")}
        <section className={CARD} aria-labelledby="proposal-title">
          <h2 id="proposal-title" className="text-xl font-semibold text-slate-950">{t("detail.proposalTitle")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{item.pendingRevision ? t("detail.proposalReplacesPending") : t("detail.proposalHelp")}</p>
          <form action={proposeAction} className="mt-5">
            <label className="block text-sm font-medium text-slate-800">{t("detail.resolutionStatus")}
              <select name="resolutionStatus" defaultValue="clarified" className={INPUT}>
                <option value="clarified">{t("statuses.clarified")}</option>
                <option value="documented">{t("statuses.documented")}</option>
                <option value="not_relevant">{t("statuses.not_relevant")}</option>
              </select>
            </label>
            <label className="mt-4 block text-sm font-medium text-slate-800">{t("detail.proposalNote")}
              <textarea name="proposalNote" defaultValue={item.workingNote} maxLength={10000} rows={7} className={INPUT} />
            </label>
            <label className="mt-4 block text-sm font-medium text-slate-700">{t("detail.documentationReference")}
              <input name="documentationReference" maxLength={2000} className={INPUT} placeholder={t("detail.documentationPlaceholder")} />
            </label>
            <ReportActionButton type="submit" variant="primary" className="mt-4 min-h-11">
              {t("actions.propose")}
            </ReportActionButton>
          </form>
        </section>
      </div>
    </main>
  );
}
