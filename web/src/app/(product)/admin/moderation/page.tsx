import Link from "next/link";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePlatformAdmin } from "@/features/moderation/access";
import { moderateReportAction } from "@/features/moderation/actions";
import { moderationFilter, moderationPage, moderationPageSize, moderationStatuses, moderationUrl, type ModerationReport } from "@/features/moderation/model";
import { SubmitButton } from "@/features/ui/SubmitButton";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ModerationPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const client = await requirePlatformAdmin();
  const params = await searchParams;
  const status = moderationFilter(params.status);
  const page = moderationPage(params.page);
  const [t, locale, { data, error }] = await Promise.all([
    getTranslations("moderation"), getLocale(),
    client.rpc("list_network_reports_for_moderation", { p_status: status, p_limit: moderationPageSize + 1, p_offset: page * moderationPageSize }),
  ]);
  const rows = (data ?? []) as ModerationReport[];
  const reports = rows.slice(0, moderationPageSize);
  const date = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) + " UTC";
  const labelClass = "text-xs font-semibold text-slate-500";
  const buttonClass = "min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-50";
  return <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
    <Link href="/account" className="text-sm text-slate-600 underline">{t("back")}</Link>
    <h1 className="mt-4 text-2xl font-semibold text-slate-950">{t("title")}</h1>
    <p className="mt-2 text-sm leading-6 text-slate-600">{t("contextLimit")}</p>
    <form method="get" className="my-6 flex flex-wrap items-end gap-3">
      <label className="text-sm font-medium">{t("filter")}<select name="status" defaultValue={status ?? ""} className="mt-1 block min-h-11 rounded-xl border border-slate-300 bg-white px-3">
        <option value="">{t("all")}</option>
        {moderationStatuses.map((value) => <option key={value} value={value}>{t(`statuses.${value}`)}</option>)}
      </select></label>
      <button className={buttonClass}>{t("apply")}</button>
    </form>
    {params.result === "saved" ? <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{t("saved")}</p> : null}
    {error || params.result === "error" || params.result === "invalid" ? <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-900">{t("error")}</p> : null}
    {!error && !reports.length ? <p className="py-8 text-slate-600">{t("empty")}</p> : null}
    <div className="space-y-5">
      {!error && reports.map((report) => <article key={report.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 [overflow-wrap:anywhere] sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-950">{t(`categories.${report.category}`)}</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">{t(`statuses.${report.status}`)}</span>
        </header>
        <time dateTime={report.created_at} className="mt-1 block text-sm text-slate-500">{date(report.created_at)}</time>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className={labelClass}>{t("reporter")}</dt><dd>{report.reporter_name ?? t("noName")}<span className="block font-mono text-xs text-slate-500">{report.reporter_user_id}</span></dd></div>
          <div><dt className={labelClass}>{t("reported")}</dt><dd>{report.reported_name ?? t("noName")}<span className="block font-mono text-xs text-slate-500">{report.reported_user_id}</span></dd></div>
          <div className="sm:col-span-2"><dt className={labelClass}>{t("origin")}</dt><dd>{t(`origins.${report.origin}`)}{report.context_title ? ` · ${report.context_title}` : ""}</dd></div>
          <div className="sm:col-span-2"><dt className={labelClass}>{t("description")}</dt><dd className="mt-1 whitespace-pre-wrap">{report.comment ?? t("noComment")}</dd></div>
        </dl>
        <details className="mt-4 text-xs text-slate-500">
          <summary className="flex min-h-11 cursor-pointer items-center font-medium">{t("references")}</summary>
          <dl className="space-y-2 font-mono">
            {([["reportId", report.id], ["conversation", report.conversation_id], ["contactRequest", report.contact_request_id],
              ["participantA", report.participant_a_user_id], ["participantB", report.participant_b_user_id],
              ["problem", report.problem_id], ["approach", report.approach_id], ["findIntro", report.discovery_intro_request_id]] as const)
              .map(([key, value]) => value ? <div key={key}><dt>{t(key)}</dt><dd>{value}</dd></div> : null)}
          </dl>
        </details>
        <form action={moderateReportAction} className="mt-4 border-t border-slate-100 pt-4">
          <input type="hidden" name="report_id" value={report.id} />
          <input type="hidden" name="filter" value={status ?? ""} />
          <input type="hidden" name="page" value={page} />
          <label className="block text-sm font-medium">{t("note")}<textarea name="admin_note" maxLength={2000} rows={3} defaultValue={report.admin_note ?? ""} className="mt-2 block w-full rounded-xl border border-slate-300 p-3" /></label>
          <p className="mt-1 text-xs text-slate-500">{t("noteHint")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <SubmitButton fieldName="status" intent={report.status} label={t("saveNote")} pendingLabel={t("saving")} className={buttonClass} />
            {moderationStatuses.filter((value) => value !== report.status).map((value) => <SubmitButton key={value} fieldName="status" intent={value} label={t(`actions.${value}`)} pendingLabel={t("saving")} className={buttonClass} />)}
          </div>
        </form>
        {report.moderated_at ? <p className="mt-3 text-xs text-slate-500">{t("lastAction", { at: date(report.moderated_at), by: report.moderated_by ?? t("deletedAdmin") })}</p> : null}
      </article>)}
    </div>
    <nav aria-label={t("pages")} className="mt-6 flex flex-wrap gap-4 text-sm">
      {page > 0 ? <Link className="inline-flex min-h-11 items-center underline" href={moderationUrl(status, page - 1)}>{t("previous")}</Link> : null}
      {!error && rows.length > moderationPageSize ? <Link className="inline-flex min-h-11 items-center underline" href={moderationUrl(status, page + 1)}>{t("next")}</Link> : null}
    </nav>
  </main>;
}
