import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getFounderSetupCatalogItem, isFounderSetupItemKey } from "@/features/teams/founderSetupCatalog";
import { getFounderSetup } from "@/features/teams/founderSetupData";
import { safeDocumentationHref } from "@/features/teams/founderSetupModel";
import {
  confirmFounderSetupRevisionAction,
  proposeFounderSetupRevisionAction,
  saveFounderSetupWorkingStateAction,
  withdrawFounderSetupConfirmationAction,
} from "@/features/teams/founderSetupActions";

type Props = {
  params: Promise<{ teamId: string; itemKey: string }>;
  searchParams: Promise<{ result?: string }>;
};

const CARD = "rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_25px_rgba(15,23,42,0.035)] sm:p-6";
const INPUT = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200";
const BUTTON = "inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800";

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
  const t = await getTranslations("teams.setup");
  const saveAction = saveFounderSetupWorkingStateAction.bind(null, teamId, itemKey);
  const proposeAction = proposeFounderSetupRevisionAction.bind(null, teamId, itemKey);
  const confirmAction = confirmFounderSetupRevisionAction.bind(null, teamId, itemKey);
  const withdrawAction = withdrawFounderSetupConfirmationAction.bind(null, teamId, itemKey);
  const currentUserConfirmed = item.pendingRevision?.confirmations.some((confirmation) => confirmation.userId === user.id) ?? false;
  const feedbackKey = result && ["saved", "proposed", "confirmed", "withdrawn"].includes(result)
    ? result
    : result
      ? "error"
      : null;

  const revisionCard = (kind: "current" | "pending") => {
    const revision = kind === "current" ? item.currentConfirmedRevision : item.pendingRevision;
    if (!revision) return null;
    const href = safeDocumentationHref(revision.documentationReference);
    return (
      <section className={CARD} aria-labelledby={`${kind}-revision-title`}>
        <h2 id={`${kind}-revision-title`} className="text-xl font-semibold text-slate-950">{t(`detail.${kind}Title`)}</h2>
        <p className="mt-2 text-sm font-medium text-slate-700">{t(`statuses.${revision.resolutionStatus}`)}</p>
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
            <h3 className="text-sm font-semibold text-slate-900">{t("detail.confirmations")}</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {setup.members.map((member, index) => {
                const confirmed = revision.confirmations.some((confirmation) => confirmation.userId === member.userId);
                return <li key={member.userId} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{member.displayName ?? t("founderFallback", { index: index + 1 })} · {confirmed ? t("detail.confirmed") : t("detail.awaiting")}</li>;
              })}
            </ul>
            <form action={currentUserConfirmed ? withdrawAction : confirmAction} className="mt-4">
              <input type="hidden" name="revisionId" value={revision.id} />
              <button className={BUTTON} type="submit">{currentUserConfirmed ? t("actions.withdraw") : t("actions.confirm")}</button>
            </form>
          </div>
        ) : null}
      </section>
    );
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href={`/teams/${teamId}/setup`} className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline">{t("backToSetup")}</Link>
      <header className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50/80 p-6 sm:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{t(`categories.${catalogItem.category}`)}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{t(`items.${itemKey}.title`)}</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">{t(`items.${itemKey}.question`)}</p>
        {catalogItem.legalNote ? <p className="mt-4 rounded-xl bg-white px-4 py-3 text-xs leading-6 text-slate-600">{t("legalSpecific")}</p> : null}
      </header>
      {feedbackKey ? <p role="status" className="mt-5 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{t(`feedback.${feedbackKey}`)}</p> : null}
      <div className="mt-6 grid gap-6">
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
            <button type="submit" className={`${BUTTON} mt-4`}>{t("actions.save")}</button>
          </form>
        </section>
        {revisionCard("current")}
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
            <label className="mt-4 block text-sm font-medium text-slate-800">{t("detail.documentationReference")}
              <input name="documentationReference" maxLength={2000} className={INPUT} placeholder={t("detail.documentationPlaceholder")} />
            </label>
            <button type="submit" className={`${BUTTON} mt-4`}>{t("actions.propose")}</button>
          </form>
        </section>
      </div>
    </main>
  );
}
