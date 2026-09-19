import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProductNavigationOverride } from "@/features/navigation/ProductShell";
import { ReportActionButton } from "@/features/reporting/ReportActionButton";
import {
  ADVISOR_IMPULSE_SECTION_ORDER,
  getAdvisorImpulseSectionMeta,
} from "@/features/reporting/advisorSectionImpulses";
import { getAdvisorReportPageData } from "@/features/reporting/advisorReportPageData";
import {
  buildAdvisorReportHref,
  buildAdvisorSnapshotHref,
  normalizeAdvisorTeamContext,
} from "@/features/reporting/advisorTeamTargets";
import {
  getAdvisorFollowUp,
  getAdvisorPrivateNote,
} from "@/features/reporting/advisorWorkspaceData";
import {
  completeAdvisorFollowUpAction,
  saveAdvisorFollowUpAction,
  saveAdvisorPrivateNoteAction,
} from "@/features/reporting/advisorWorkspaceActions";
import { requestFounderSetupAccessAction } from "@/features/teams/advisorSetupRequestActions";
import { describeAdvisorFounderSetupPause } from "@/features/teams/founderSetupAdvisorAccessModel";
import { getRequestLocale } from "@/i18n/getLocale";
import { createClient, getRequestUser } from "@/lib/supabase/server";

const CARD = "rounded-3xl border border-slate-200/80 bg-white/95 p-6 md:p-7";
const INPUT =
  "mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500";

const SAVED_KEYS = ["note", "follow_up", "follow_up_cleared", "follow_up_done", "setup_request"];
const ERROR_KEYS = ["save", "forbidden", "follow_up_date", "follow_up_past", "setup_request"];

/**
 * Das Sitzungsblatt - eine Seite, die man vor einem Termin aufmacht.
 *
 * DIE LUECKE, die sie schliesst: Der Advisor hatte einen Leseplatz. Report,
 * Snapshot, Workbook und die bestaetigten Setup-Staende liegen an vier
 * verschiedenen Stellen, und was er selbst dazu geschrieben hat, an einer
 * fuenften. Vor jedem Gespraech musste er sich das zusammenklicken und im Kopf
 * behalten. Und einen Ort fuer eigene Notizen gab es gar nicht.
 *
 * WAS HIER BEWUSST NICHT STEHT: welche Setup-Themen OFFEN sind.
 *
 *   Die Freigabe der Founder lautet `confirmed_only` - der Advisor sieht, was
 *   das Team bestaetigt hat, und nichts sonst. Die offenen Themen liessen sich
 *   trivial berechnen (Katalog minus bestaetigt), und genau deshalb steht hier
 *   dieser Absatz: Es waere eine Umgehung der Zustimmung mit den Mitteln der
 *   Arithmetik. Wer die offenen Themen sehen soll, braucht eine Freigabe
 *   dafuer, keine Subtraktion.
 *
 * Was er selbst besitzt - Notizen und Wiedervorlage - liegt dagegen unter einer
 * eigenen Policy und ist auch fuer die Founder unsichtbar.
 */
export default async function AdvisorSessionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const invitationId = params.invitationId?.trim() ?? "";
  if (!invitationId) redirect("/advisor/dashboard");

  const {
    data: { user },
  } = await getRequestUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(`/advisor/session?invitationId=${invitationId}`)}`
    );
  }

  const [t, setupT, locale] = await Promise.all([
    getTranslations("advisor"),
    // Die Titel der Setup-Themen liegen schon dort. Sie hier ein zweites Mal
    // zu pflegen waere sofort eine zweite Wahrheit.
    getTranslations("teams.setup"),
    getRequestLocale(),
  ]);
  const data = await getAdvisorReportPageData(invitationId, locale);
  if (data.status !== "ready") redirect("/advisor/dashboard");

  const client = await createClient();
  const [note, followUp] = await Promise.all([
    getAdvisorPrivateNote(client, data.relationshipId),
    getAdvisorFollowUp(client, data.relationshipId),
  ]);

  const teamContext = normalizeAdvisorTeamContext(data.teamContext);
  const reportHref = buildAdvisorReportHref(data.invitationId, teamContext);
  const snapshotHref = buildAdvisorSnapshotHref(data.invitationId, teamContext);
  const saved = SAVED_KEYS.includes(params.saved ?? "") ? params.saved : null;
  const errorKey = ERROR_KEYS.includes(params.error ?? "") ? params.error : null;

  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "long" });
  const today = new Date().toISOString().slice(0, 10);
  const followUpDue = followUp && !followUp.completedAt && followUp.dueOn <= today;

  const saveNote = saveAdvisorPrivateNoteAction.bind(null, invitationId, data.relationshipId);
  const saveFollowUp = saveAdvisorFollowUpAction.bind(null, invitationId, data.relationshipId);
  const completeFollowUp = completeAdvisorFollowUpAction.bind(
    null,
    invitationId,
    data.relationshipId
  );

  const setupPauseReason = describeAdvisorFounderSetupPause(data.founderSetupAccess);
  const requestSetupAccess = requestFounderSetupAccessAction.bind(
    null,
    invitationId,
    data.relationshipId
  );
  const sectionMeta = getAdvisorImpulseSectionMeta(locale);
  const writtenImpulses = ADVISOR_IMPULSE_SECTION_ORDER.map((key) => ({
    key,
    title: sectionMeta[key].title,
    text: data.impulses[key]?.text?.trim() ?? "",
  })).filter((entry) => entry.text.length > 0);

  return (
    <>
      <ProductNavigationOverride
        activeView="advisor"
        contextLabel={t("session.context")}
        matchingHref={reportHref}
        workbookHref={data.workbookHref}
      />
      <main className="mx-auto w-full max-w-4xl px-6 py-10 md:px-10">
        <Link
          href="/advisor/dashboard#advisor-teams"
          className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline"
        >
          {t("session.back")}
        </Link>

        <header className="mt-6">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
            {t("session.eyebrow")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {t("session.title")}
          </h1>
          <p className="mt-2 text-base text-slate-600">
            {data.participantAName} · {data.participantBName}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{t("session.text")}</p>
        </header>

        {saved ? (
          <p role="status" className="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {t(`session.saved.${saved}`)}
          </p>
        ) : null}
        {errorKey ? (
          <p role="alert" className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t(`session.errors.${errorKey}`)}
          </p>
        ) : null}

        {/* Zuerst die Verabredung mit sich selbst - das ist der Grund, warum
            jemand diese Seite ueberhaupt aufmacht. */}
        <section className={`mt-8 ${CARD}`} aria-labelledby="follow-up-title">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="follow-up-title" className="text-lg font-semibold text-slate-950">
              {t("session.followUp.title")}
            </h2>
            {followUp && !followUp.completedAt ? (
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  followUpDue
                    ? "bg-amber-100 text-amber-900"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {followUpDue
                  ? t("session.followUp.due")
                  : t("session.followUp.onDate", {
                      date: dateFormatter.format(new Date(followUp.dueOn)),
                    })}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("session.followUp.help")}</p>

          <form action={saveFollowUp} className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr]">
            <label className="block text-sm font-medium text-slate-800">
              {t("session.followUp.dateLabel")}
              <input
                type="date"
                name="dueOn"
                min={today}
                defaultValue={followUp?.completedAt ? "" : followUp?.dueOn ?? ""}
                className={INPUT}
              />
            </label>
            <label className="block text-sm font-medium text-slate-800">
              {t("session.followUp.noteLabel")}
              <input
                name="followUpNote"
                maxLength={2000}
                defaultValue={followUp?.note ?? ""}
                placeholder={t("session.followUp.notePlaceholder")}
                className={INPUT}
              />
            </label>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
              <ReportActionButton type="submit" variant="utility" className="min-h-11">
                {t("session.followUp.save")}
              </ReportActionButton>
              <span className="text-xs leading-5 text-slate-500">
                {t("session.followUp.clearHint")}
              </span>
            </div>
          </form>

          {followUp && !followUp.completedAt ? (
            <form action={completeFollowUp} className="mt-3">
              <ReportActionButton type="submit" variant="utility" className="min-h-11">
                {t("session.followUp.complete")}
              </ReportActionButton>
            </form>
          ) : null}
        </section>

        {/* Die eigenen Notizen. Der Hinweis, dass die Founder sie nicht sehen,
            steht direkt daran und nicht im Kleingedruckten - sonst schreibt
            niemand ehrlich hinein. */}
        <section className={`mt-6 ${CARD}`} aria-labelledby="note-title">
          <h2 id="note-title" className="text-lg font-semibold text-slate-950">
            {t("session.note.title")}
          </h2>
          <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-slate-700">
            <svg aria-hidden="true" viewBox="0 0 16 16" className="mt-1 h-4 w-4 shrink-0 fill-none stroke-slate-500" strokeWidth="1.6">
              <rect x="3.25" y="7" width="9.5" height="6.25" rx="1.5" />
              <path d="M5.75 7V5.25a2.25 2.25 0 0 1 4.5 0V7" strokeLinecap="round" />
            </svg>
            <span>{t("session.note.privacy")}</span>
          </p>
          <form action={saveNote} className="mt-4">
            <label className="block text-sm font-medium text-slate-800">
              {t("session.note.label")}
              <textarea
                name="body"
                rows={10}
                maxLength={20000}
                defaultValue={note.body}
                placeholder={t("session.note.placeholder")}
                className={INPUT}
              />
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <ReportActionButton type="submit" variant="primary" className="min-h-11">
                {t("session.note.save")}
              </ReportActionButton>
              {note.updatedAt ? (
                <span className="text-xs text-slate-500">
                  {t("session.note.updatedAt", {
                    date: dateFormatter.format(new Date(note.updatedAt)),
                  })}
                </span>
              ) : null}
            </div>
          </form>
        </section>

        {/* Was das Team bestaetigt hat - der einzige Teil seiner Arbeit, den die
            Founder freigegeben haben. */}
        <section className={`mt-6 ${CARD}`} aria-labelledby="settled-title">
          <h2 id="settled-title" className="text-lg font-semibold text-slate-950">
            {t("session.settled.title")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("session.settled.help")}</p>
          {data.founderSetupAccess.status !== "active" ? (
            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-sm leading-6 text-slate-700">
                {t(`dashboard.setupStatuses.${data.founderSetupAccess.status}`)}
              </p>
              {setupPauseReason ? (
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {t(`dashboard.setupPauseReasons.${setupPauseReason}`)}
                </p>
              ) : null}
              {/* Fragen konnte der Advisor bisher gar nicht - nur ein Founder
                  durfte eine Freigabe vorschlagen. Er musste es ausserhalb des
                  Produkts sagen und hoffen, dass die Founder den Weg finden.

                  Der Knopf steht nur bei "nicht freigegeben": Bei einer
                  laufenden Anfrage waere ein zweites Fragen nur Druck, und bei
                  "pausiert" liegt es nicht an einer fehlenden Bitte. */}
              {data.founderSetupAccess.status === "not_granted" ? (
                <form action={requestSetupAccess} className="mt-3">
                  <ReportActionButton type="submit" variant="utility" className="min-h-11">
                    {t("session.settled.requestAccess")}
                  </ReportActionButton>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {t("session.settled.requestAccessHint")}
                  </p>
                </form>
              ) : null}
            </div>
          ) : data.founderSetupItems.length === 0 ? (
            <p className="mt-4 text-sm leading-6 text-slate-600">{t("session.settled.empty")}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.founderSetupItems.map((item) => (
                <li key={item.itemKey} className="rounded-2xl bg-slate-50 px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {setupT(`items.${item.itemKey}.title`)}
                    </p>
                    <span className="text-xs text-slate-500">
                      {dateFormatter.format(new Date(item.confirmedAt))}
                    </span>
                  </div>
                  {item.note ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {item.note}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Und was er den Foundern schon geschrieben hat - damit er es im
            Gespraech nicht wiederholt oder sich widerspricht. */}
        <section className={`mt-6 ${CARD}`} aria-labelledby="impulses-title">
          <h2 id="impulses-title" className="text-lg font-semibold text-slate-950">
            {t("session.impulses.title")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("session.impulses.help")}</p>
          {writtenImpulses.length === 0 ? (
            <p className="mt-4 text-sm leading-6 text-slate-600">{t("session.impulses.empty")}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {writtenImpulses.map((entry) => (
                <li key={entry.key}>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {entry.title}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {entry.text}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4">
            <Link
              href={`${reportHref}#advisor-impulses`}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-700 underline-offset-4 hover:underline"
            >
              {t("session.impulses.edit")}
            </Link>
          </p>
        </section>

        <nav aria-label={t("session.links.label")} className="mt-6 flex flex-wrap gap-3">
          <ReportActionButton href={reportHref} variant="utility" className="min-h-11">
            {t("session.links.report")}
          </ReportActionButton>
          <ReportActionButton href={snapshotHref} variant="utility" className="min-h-11">
            {t("session.links.snapshot")}
          </ReportActionButton>
          {/* Das Uebergabedokument enthaelt die Notizen NICHT - deshalb steht
              es hier neben den anderen Ansichten und nicht im Notizblock. */}
          <ReportActionButton
            href={`/advisor/session/document?invitationId=${encodeURIComponent(invitationId)}`}
            variant="utility"
            className="min-h-11"
          >
            {t("session.links.document")}
          </ReportActionButton>
        </nav>
      </main>
    </>
  );
}
