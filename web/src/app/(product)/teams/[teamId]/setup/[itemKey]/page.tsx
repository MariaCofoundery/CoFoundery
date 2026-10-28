import { workstyleSetupHandoff } from "@/features/reporting/workstyle/setupHandoff";
import { TeamUnavailable } from "@/features/access/TeamUnavailable";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { ConversationPointsCard } from "@/features/collaborationLab/ConversationPointsCard";
import { getCollaborationConversationPoints } from "@/features/collaborationLab/collaborationConversationPoints";
import { GlossaryText } from "@/features/founderLibrary/GlossaryText";
import { ReportActionButton } from "@/features/reporting/ReportActionButton";
import { FounderSetupStatusChip } from "@/features/teams/FounderSetupStatusChip";
import { FounderSetupDiscussionComposer } from "@/features/teams/FounderSetupDiscussionComposer";
import { FounderSetupTopicRail } from "@/features/teams/FounderSetupTopicRail";
import { buildFounderSetupRail, founderSetupTopicPosition } from "@/features/teams/founderSetupTopicNav";
import Link from "next/link";
import { TeamPageHeader, getTeamLabel } from "@/features/teams/TeamPageHeader";
import { FOUNDER_SETUP_CONFLICT_PRONE, getFounderSetupCatalogItem, isFounderSetupItemKey } from "@/features/teams/founderSetupCatalog";
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
import { normalizeLocale } from "@/i18n/config";
import { getPresentationLocale } from "@/i18n/presentationLocale";

type Props = {
  params: Promise<{ teamId: string; itemKey: string }>;
  searchParams: Promise<{ result?: string; workstyle?: string }>;
};

const CARD = "rounded-3xl border border-[#e4e2f0] bg-white p-5 shadow-[0_10px_25px_rgba(15,23,42,0.035)] sm:p-6";
const INPUT = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200";

export default async function FounderSetupItemPage({ params, searchParams }: Props) {
  const { teamId, itemKey } = await params;
  const { result, workstyle } = await searchParams;
  const proposedHandoff = workstyleSetupHandoff(workstyle ?? "");
  const handoff = proposedHandoff?.topic === itemKey ? proposedHandoff : null;
  if (!isFounderSetupItemKey(itemKey)) notFound();
  const catalogItem = getFounderSetupCatalogItem(itemKey);
  if (!catalogItem) notFound();
  const supabase = await createClient();
  const { data: { user } } = await getRequestUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/teams/${teamId}/setup/${itemKey}`)}`);
  const setup = await getFounderSetup(teamId, user.id, supabase);
  if (!setup) return <TeamUnavailable teamId={teamId} />;
  const item = setup.items.find((entry) => entry.key === itemKey);
  if (!item) notFound();
  const [t, teamLabel, locale, discussionEntries] = await Promise.all([
    getTranslations("teams.setup"),
    getTeamLabel(supabase, teamId),
    getLocale(),
    getFounderSetupDiscussion(teamId, itemKey, supabase),
  ]);
  const discussionThreads = groupFounderSetupDiscussionEntries(discussionEntries);
  // Erst nach der Sprache, weil die Titel und die Antworten aus dem
  // eingefrorenen Inhalt kommen und in der Sprache der lesenden Person
  // dastehen muessen.
  const conversationPoints = await getCollaborationConversationPoints({
    teamId,
    itemKey,
    userId: user.id,
    locale: normalizeLocale(locale),
    client: supabase,
  });
  const dateFormatter = new Intl.DateTimeFormat(getPresentationLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  });
  // Null heisst: Das Konto ist geloescht. Eine Kennung, die nicht mehr zu den aktuellen
  // Mitgliedern gehoert, ist jemand, der das Team verlassen hat - beides "fruehere Person".
  // (Vorher stand hier fuer ausgeschiedene Mitglieder "Founder 1" und damit ein falscher Name.)
  const memberName = (userId: string | null) => {
    if (!userId) return t("formerMember");
    const index = setup.members.findIndex((member) => member.userId === userId);
    return index >= 0
      ? setup.members[index].displayName ?? t("founderFallback", { index: index + 1 })
      : t("formerMember");
  };
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

  const railGroups = buildFounderSetupRail(setup.items, user.id);
  const position = founderSetupTopicPosition(railGroups, itemKey);
  const nameOfMember = (userId: string, index: number) => setup.members.find((member) => member.userId === userId)?.displayName ?? t("founderFallback", { index: index + 1 });
  const missingNames = item.pendingRevision
    ? setup.members
        .map((member, index) => ({ member, index }))
        .filter(({ member }) => !item.pendingRevision!.confirmations.some((confirmation) => confirmation.userId === member.userId))
        .map(({ member, index }) => member.displayName ?? t("founderFallback", { index: index + 1 }))
    : [];
  const initial = (name: string) => name.trim().slice(0, 1).toUpperCase() || "?";

  // Die EINE Handlung, die jetzt ansteht. Sie steht oben, nicht mitten auf der Seite.
  const next: { kicker: string; text: string; tone: "violet" | "amber" | "teal" } = item.pendingRevision
    ? currentUserConfirmed
      ? { kicker: t("topic.now.kicker"), text: t("topic.now.pendingOthers", { names: missingNames.join(", ") }), tone: "violet" }
      : { kicker: t("topic.now.kickerYou"), text: t("topic.now.pendingYou"), tone: "amber" }
    : item.stage === "settled"
      ? { kicker: t("topic.now.kickerSettled"), text: t("topic.now.settled"), tone: "teal" }
      : item.stage === "discussing"
        ? { kicker: t("topic.now.kicker"), text: t("topic.now.discussing"), tone: "violet" }
        : { kicker: t("topic.now.kicker"), text: t("topic.now.open"), tone: "violet" };
  const TONE = {
    violet: "bg-[#efeafc] text-[#6d49e0]",
    amber: "bg-amber-100 text-amber-800",
    teal: "bg-teal-50 text-teal-700",
  } as const;
  const ghostLink = "inline-flex min-h-11 items-center justify-center rounded-xl border border-[#e4e2f0] bg-white px-5 text-sm font-semibold text-[#0b1f3a] transition hover:bg-[#f7f6fb]";
  const draftText = item.workingNote || item.pendingRevision?.note || item.currentConfirmedRevision?.note || "";

  // EIN Feld, zwei Schritte: als Entwurf speichern oder zur Bestaetigung vorschlagen.
  // Derselbe Text, ein Formular (formAction wechselt nur die Aktion).
  const editor = (
    <form action={saveAction} className="mt-3">
      <input type="hidden" name="workStatus" value="discussing" />
      <label htmlFor="stand-note" className="sr-only">{t("topic.stand.title")}</label>
      <textarea id="stand-note" name="note" defaultValue={draftText} maxLength={10000} rows={6} placeholder={t("topic.stand.placeholder")} className={INPUT} />
      <div className="mt-3 flex flex-wrap gap-2">
        <ReportActionButton type="submit" variant="utility" className="min-h-11">{t("topic.stand.saveDraft")}</ReportActionButton>
        <ReportActionButton type="submit" formAction={proposeAction} variant="primary" className="min-h-11">{t("topic.stand.propose")}</ReportActionButton>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        {item.pendingRevision ? t("detail.proposalReplacesPending") : t("detail.proposalHelp")}
      </p>
      <details className="mt-3 border-t border-[#e4e2f0] pt-2">
        <summary className="inline-flex min-h-10 cursor-pointer items-center text-sm font-semibold text-[#0b1f3a]">{t("topic.stand.moreToggle")}</summary>
        <label className="mt-2 block text-sm font-medium text-slate-800">{t("detail.resolutionStatus")}
          <select name="resolutionStatus" defaultValue="clarified" className={INPUT}>
            <option value="clarified">{t("outcomes.clarified")}</option>
            <option value="documented">{t("outcomes.documented")}</option>
            <option value="not_relevant">{t("outcomes.not_relevant")}</option>
          </select>
        </label>
        <label className="mt-3 block text-sm font-medium text-slate-700">{t("detail.documentationReference")}
          <input name="documentationReference" maxLength={2000} className={INPUT} placeholder={t("detail.documentationPlaceholder")} />
        </label>
      </details>
    </form>
  );

  const revisionBlock = (revision: NonNullable<typeof item.pendingRevision>, kind: "current" | "pending") => {
    const href = safeDocumentationHref(revision.documentationReference);
    return (
      <div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Ein noch nicht bestaetigter Vorschlag zeigt seine STUFE, nicht
              sein Ergebnis: "Geklaert" waere vor der Zustimmung falsch. */}
          <FounderSetupStatusChip
            stage={kind === "pending" ? "awaiting_confirmation" : "settled"}
            outcome={kind === "pending" ? null : revision.resolutionStatus}
            label={kind === "pending" ? t("stages.awaiting_confirmation") : t(`outcomes.${revision.resolutionStatus}`)}
          />
          {kind === "pending" ? <span className="text-xs text-slate-600">{t("topic.stand.proposedAs", { outcome: t(`outcomes.${revision.resolutionStatus}`) })}</span> : null}
        </div>
        <p className="mt-3 whitespace-pre-wrap rounded-2xl border border-[#e4e2f0] bg-[#f7f6fb] px-4 py-3 text-sm leading-7 text-slate-800">{revision.note || t("detail.noNote")}</p>
        {revision.documentationReference ? (
          <p className="mt-3 text-sm text-slate-600">
            {t("detail.documentationReference")}: {href ? (
              <a href={href} target="_blank" rel="noreferrer noopener" className="font-medium underline">{revision.documentationReference}</a>
            ) : <span>{revision.documentationReference}</span>}
          </p>
        ) : null}
        {kind === "pending" ? (
          <>
            <h3 className="mt-4 text-sm font-semibold text-slate-900">{t("detail.confirmations")}</h3>
            <ul className="mt-2 grid gap-2">
              {setup.members.map((member, index) => {
                const confirmed = revision.confirmations.some((confirmation) => confirmation.userId === member.userId);
                const name = nameOfMember(member.userId, index);
                return (
                  <li key={member.userId} className="flex items-center gap-3">
                    <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#efeafc] text-xs font-bold text-[#6d49e0]">{initial(name)}</span>
                    <span className="min-w-0 flex-1 text-sm text-slate-800">{name}{member.userId === user.id ? ` (${t("topic.youTag")})` : ""}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${confirmed ? "bg-teal-50 text-teal-800" : "bg-amber-100 text-amber-900"}`}>{confirmed ? t("detail.confirmed") : t("detail.awaiting")}</span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}
      </div>
    );
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
      {/* Phase 11.7B.1: gemeinsamer Teamkopf; der Reiter "Founder Setup" ist der Weg zur Themenliste. */}
      <TeamPageHeader teamId={teamId} active="setup" title={t(`items.${itemKey}.title`)} teamLabel={teamLabel} hideTitle />

      {/* Zurueck zur Liste und ein Thema weiter oder zurueck, ohne die Liste. */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/teams/${teamId}/setup`} className="text-sm font-semibold text-slate-600 hover:text-slate-950">← {t("topic.allTopics")}</Link>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          {position.previous ? (
            <Link href={`/teams/${teamId}/setup/${position.previous}`} aria-label={`${t("topic.prev")}: ${t(`items.${position.previous}.title`)}`} className="inline-flex min-h-9 items-center rounded-full border border-[#e4e2f0] bg-white px-3 font-semibold hover:bg-[#f7f6fb]">‹ <span className="ml-1 hidden max-w-[11rem] truncate sm:inline">{t(`items.${position.previous}.title`)}</span></Link>
          ) : null}
          <span aria-label={t("topic.position", { n: position.index, total: position.total })}>{t("topic.position", { n: position.index, total: position.total })}</span>
          {position.next ? (
            <Link href={`/teams/${teamId}/setup/${position.next}`} aria-label={`${t("topic.next")}: ${t(`items.${position.next}.title`)}`} className="inline-flex min-h-9 items-center rounded-full border border-[#e4e2f0] bg-white px-3 font-semibold hover:bg-[#f7f6fb]"><span className="mr-1 hidden max-w-[11rem] truncate sm:inline">{t(`items.${position.next}.title`)}</span> ›</Link>
          ) : null}
        </div>
      </div>

      <section className="brand-panel mt-3 rounded-[28px] p-5 sm:p-7" aria-labelledby="topic-title">
        <p className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white">
          {t(`categories.${catalogItem.category}`)}
          {FOUNDER_SETUP_CONFLICT_PRONE.has(itemKey) ? (
            <span title={t("list.conflictHelp")} className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold normal-case tracking-normal text-white">{t("list.conflict")}</span>
          ) : null}
        </p>
        <h1 id="topic-title" className="mt-2 text-3xl font-semibold leading-tight">{t(`items.${itemKey}.title`)}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-white">{t(`items.${itemKey}.question`)}</p>
        {/* Wo das Thema steht - in Worten und mit Punkt, ohne Zahl. */}
        <ol className="mt-5 flex flex-wrap gap-2" aria-label={t("hero.stateLabel")}>
          {(["talk", "confirm", "settled"] as const).map((step) => {
            const here =
              step === "talk"
                ? item.stage === "open" || item.stage === "discussing"
                : step === "confirm"
                  ? item.stage === "awaiting_confirmation"
                  : item.stage === "settled";
            return (
              <li
                key={step}
                aria-current={here ? "step" : undefined}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${here ? "bg-white text-violet-800" : "bg-white/20 text-white"}`}
              >
                <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${here ? "bg-violet-600" : "border-2 border-white"}`} />
                {t(`topicSteps.${step}`)}
              </li>
            );
          })}
        </ol>
      </section>

      {feedbackKey ? <p role="status" className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{t(`feedback.${feedbackKey}`)}</p> : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)] lg:items-start">
        <FounderSetupTopicRail teamId={teamId} groups={railGroups} current={itemKey} position={position.index} total={position.total} />

        <div className="grid min-w-0 gap-4">
          {/* JETZT DRAN: eine Karte, eine Handlung - oben, nicht mitten auf der Seite. */}
          <section aria-labelledby="now-title" className="flex flex-wrap items-center gap-4 rounded-3xl border border-[#e4e2f0] bg-white p-4 sm:p-5">
            <span aria-hidden="true" className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-lg ${TONE[next.tone]}`}>{item.stage === "settled" && !item.pendingRevision ? "✓" : item.pendingRevision ? "◔" : "✎"}</span>
            <div className="min-w-0 flex-1 basis-64">
              <p id="now-title" className="text-xs font-bold uppercase tracking-[0.1em] text-[#5f5e7a]">{next.kicker}</p>
              <p className="mt-0.5 text-lg font-semibold leading-snug text-[#0b1f3a]">{next.text}</p>
            </div>
            {item.pendingRevision ? (
              <form action={currentUserConfirmed ? withdrawAction : confirmAction}>
                <input type="hidden" name="revisionId" value={item.pendingRevision.id} />
                <ReportActionButton type="submit" variant={currentUserConfirmed ? "utility" : "primary"} className="min-h-11">
                  {currentUserConfirmed ? t("actions.withdraw") : t("actions.confirm")}
                </ReportActionButton>
              </form>
            ) : item.stage === "settled" ? (
              <a href="#stand" className={ghostLink}>{t("topic.now.settledCta")}</a>
            ) : item.stage === "discussing" ? (
              <a href="#stand" className={ghostLink}>{t("topic.now.discussingCta")}</a>
            ) : (
              <a href="#discussion" className={ghostLink}>{t("topic.now.openCta")}</a>
            )}
          </section>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px] xl:items-start">
            <div className="grid min-w-0 gap-4">
              {/* VOR DER BESPRECHUNG, NICHT DANACH: Was im Lab markiert wurde, ist
                  der Anlass fuer das, was hier gleich getippt wird. */}
              <ConversationPointsCard points={conversationPoints} />
              <section className={CARD} aria-labelledby="discussion-title">
                <h2 id="discussion-title" className="text-xl font-semibold text-slate-950">{t("discussion.title")}</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">{t("discussion.visibility")}</p>
                {handoff && <p className="mt-3 text-sm">Gesprächsimpuls aus „Euer Zusammenspiel“. Bearbeitet und speichert ihn bewusst als Diskussionsbeitrag. Eine Vereinbarung entsteht erst durch eine separate Revision und eure Bestätigung.</p>}
                {discussionThreads.length > 0 ? (
                  <ol className="mt-4 grid gap-3">
                    {discussionThreads.map((thread) => (
                      <li key={thread.root.id} className={`max-w-[92%] rounded-2xl border border-[#e4e2f0] p-3.5 ${thread.root.authorUserId === user.id ? "justify-self-end bg-[#efeafc]/60" : "bg-[#f7f6fb]"}`}>
                        <p className="text-xs text-slate-500">
                          {memberName(thread.root.authorUserId)} · {dateFormatter.format(new Date(thread.root.createdAt))}
                        </p>
                        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-7 text-slate-800">{thread.root.body}</p>
                        {thread.replies.length > 0 ? (
                          <ol className="mt-3 space-y-3 border-l-2 border-[#d9cff8] pl-4">
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
                        <details className="mt-2">
                          <summary className="cursor-pointer rounded-sm text-sm font-medium text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2">
                            {t("discussion.replyAction")}
                          </summary>
                          <FounderSetupDiscussionComposer action={discussionAction} parentEntryId={thread.root.id} compact />
                        </details>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-600">{t("discussion.empty")}</p>
                )}
                <div id="discussion" className="mt-4 border-t border-[#e4e2f0] pt-4"><FounderSetupDiscussionComposer key={workstyle ?? "empty"} action={discussionAction} initialBody={handoff?.question ?? ""} /></div>
              </section>
            </div>

            <aside className="grid min-w-0 gap-4 max-xl:order-first">
              <section id="stand" className={`${CARD} scroll-mt-4`} aria-labelledby="stand-title">
                <h2 id="stand-title" className="text-xl font-semibold text-slate-950">
                  {item.pendingRevision ? t("detail.pendingTitle") : item.currentConfirmedRevision ? t("detail.currentTitle") : t("topic.stand.title")}
                </h2>
                {item.pendingRevision ? (
                  <div className="mt-3">{revisionBlock(item.pendingRevision, "pending")}</div>
                ) : item.currentConfirmedRevision ? (
                  <div className="mt-3">{revisionBlock(item.currentConfirmedRevision, "current")}</div>
                ) : (
                  <p className="mt-1 text-sm leading-6 text-slate-600">{t("topic.stand.help")}</p>
                )}
                {item.pendingRevision || item.currentConfirmedRevision ? (
                  <details className="mt-4 border-t border-[#e4e2f0] pt-2">
                    <summary className="inline-flex min-h-10 cursor-pointer items-center text-sm font-semibold text-[#0b1f3a]">
                      {item.pendingRevision ? t("topic.stand.newProposalToggle") : t("topic.stand.changeToggle")}
                    </summary>
                    {editor}
                  </details>
                ) : editor}
                {item.pendingRevision && item.currentConfirmedRevision ? (
                  <details className="mt-2 border-t border-[#e4e2f0] pt-2">
                    <summary className="inline-flex min-h-10 cursor-pointer items-center text-sm font-semibold text-[#0b1f3a]">{t("detail.currentTitle")}</summary>
                    <div className="mt-2">{revisionBlock(item.currentConfirmedRevision, "current")}</div>
                  </details>
                ) : null}
              </section>

              {/* Vor dem leeren Feld ein Anhaltspunkt. Bei Vesting und Beteiligung - also
                  genau dort, wo niemand weiss, was ueblich ist - sagte das Produkt sonst
                  nichts. Die Fachwoerter fuehren zur Library und oeffnen ein neues Fenster,
                  damit die angefangene Notiz stehen bleibt. */}
              <section className="rounded-3xl bg-[#f7f6fb] p-5" aria-labelledby="orientation-title">
                <p id="orientation-title" className="text-xs font-bold uppercase tracking-[0.12em] text-[#6d49e0]">{t("orientationTitle")}</p>
                <GlossaryText text={t(`items.${itemKey}.orientation`)} className="mt-2 text-sm leading-7 text-slate-800" />
                <p className="mt-3 text-xs leading-6 text-slate-500">{t("orientationHelp")}</p>
              </section>
              {catalogItem.legalNote ? <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">{t("legalSpecific")}</p> : null}
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
