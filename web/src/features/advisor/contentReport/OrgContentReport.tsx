import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTranslations } from "next-intl/server";
import { berlinToday } from "@/lib/berlinTime";
import { setCampaignDetailsAction } from "@/features/advisor/socialCalendarActions";
import { calendarHref } from "@/features/advisor/calendar/calendarModel";
import { loadContentReport } from "@/features/advisor/contentReport/contentReportData";
import { REPORT_AREAS, parseReportFilters, type ReportArea, type ReportRow } from "@/features/advisor/contentReport/contentReportModel";
import { buildReportTable } from "@/features/advisor/contentReport/contentReportTable";
import { CHANNELS } from "@/features/advisor/socialCalendarModel";
import { SubmitButton } from "@/features/ui/SubmitButton";

const FIELD = "mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[15px] font-normal";
const LABEL = "block text-sm font-semibold text-slate-900";
const URL_COLUMN: Record<ReportArea, number> = { geplant: 9, kampagnen: -1, veroeffentlicht: 4 };
const TITLE_CELLS: Record<ReportArea, number[]> = { geplant: [0, 1], kampagnen: [0], veroeffentlicht: [3] };

/**
 * Content-Report (Entwurf 10.11.2026): ein Reiter der Auswertung mit drei Bereichen. Liest nur, was im Kalender schon steht.
 * Am Handy Karten statt Tabelle; "Als Tabelle herunterladen" liefert dieselben Zeilen als CSV.
 */
export async function OrgContentReport({
  client, orgId, query, locale, canEditCampaigns,
}: {
  client: SupabaseClient;
  orgId: string;
  query: Record<string, string | undefined>;
  locale: string;
  canEditCampaigns: boolean;
}) {
  const t = await getTranslations("advisor.contentReport");
  const today = berlinToday();
  const filters = parseReportFilters(query, today);
  const data = await loadContentReport(client, orgId, t("unnamed"));
  const tt = (key: string, values?: Record<string, string | number>) => t(key, values);
  const postHref = (post: { id: string; plannedOn: string }) => calendarHref(orgId, { monat: post.plannedOn.slice(0, 7), post: post.id });
  const tables = Object.fromEntries(REPORT_AREAS.map((area) => [area, buildReportTable(area, data, filters, tt, locale, postHref)])) as Record<ReportArea, ReturnType<typeof buildReportTable>>;
  const table = tables[filters.area];

  const keep: Record<string, string> = { org: orgId, tab: "contentReport", ...(filters.periodChosen ? { von: filters.from, bis: filters.to } : {}), ...(filters.brandId ? { marke: filters.brandId } : {}), ...(filters.channel ? { kanal: filters.channel } : {}) };
  const href = (extra: Record<string, string | null>) => {
    const params = new URLSearchParams({ ...keep, bereich: filters.area });
    for (const [key, value] of Object.entries(extra)) value === null ? params.delete(key) : params.set(key, value);
    return `/advisor/organisation?${params.toString()}`;
  };
  const csvParams = new URLSearchParams({ org: orgId, bereich: filters.area, von: filters.from, bis: filters.to, ...(filters.brandId ? { marke: filters.brandId } : {}), ...(filters.channel ? { kanal: filters.channel } : {}) });

  const editId = filters.area === "kampagnen" ? query.kampagne ?? "" : "";
  const editing = canEditCampaigns ? data.campaigns.find((campaign) => campaign.id === editId) ?? null : null;
  const brands = data.content.filter((item) => item.kind === "brand");

  const cellContent = (row: ReportRow, index: number) => {
    const value = row.cells[index] ?? "";
    if (!value) return <span className="text-slate-500">–</span>;
    if (index === URL_COLUMN[filters.area]) return <a href={value} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-violet-800 underline underline-offset-2">{t("link")}<span className="sr-only"> {t("opensNew")}</span></a>;
    return value;
  };
  const titleOf = (row: ReportRow) => TITLE_CELLS[filters.area].map((index) => row.cells[index]).filter(Boolean).join(" · ");

  return (
    <section aria-labelledby="content-report-title" className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="content-report-title" className="font-brand text-2xl font-semibold text-slate-950">{t("title")}</h2>
          <p className="mt-1 max-w-2xl text-[14.5px] leading-6 text-slate-700">{t("intro")}</p>
        </div>
        <a href={`/api/advisor/content-report?${csvParams.toString()}`} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-950 hover:bg-slate-50">{t("download")}</a>
      </div>
      {query.gespeichert === "1" ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{t("saved")}</p> : query.fehler === "1" ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{t("error")}</p> : null}

      <nav aria-label={t("areasLabel")} className="flex w-full flex-wrap gap-1 rounded-xl bg-[#E9EAF3] p-[3px] sm:w-fit">
        {REPORT_AREAS.map((area) => (
          <Link key={area} href={href({ bereich: area, kampagne: null })} aria-current={area === filters.area ? "page" : undefined} className={`inline-flex min-h-10 flex-1 items-center justify-center rounded-[9px] px-4 text-[14px] sm:flex-none ${area === filters.area ? "bg-white font-semibold text-slate-950 shadow-[0_1px_3px_rgba(23,23,58,0.14)]" : "font-medium text-slate-700 hover:text-slate-950"}`}>
            {t(`areas.${area}`)} <span className="ml-1.5 text-slate-600">{tables[area].rows.length}</span>
          </Link>
        ))}
      </nav>

      <form method="get" action="/advisor/organisation" className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[repeat(4,minmax(0,1fr))_auto] sm:items-end">
        <input type="hidden" name="org" value={orgId} />
        <input type="hidden" name="tab" value="contentReport" />
        <input type="hidden" name="bereich" value={filters.area} />
        <label className={LABEL}>{t("filters.from")}<input type="date" name="von" defaultValue={filters.from} className={FIELD} /></label>
        <label className={LABEL}>{t("filters.to")}<input type="date" name="bis" defaultValue={filters.to} className={FIELD} /></label>
        <label className={LABEL}>{t("filters.brand")}
          <select name="marke" defaultValue={filters.brandId ?? ""} className={FIELD}><option value="">{t("filters.all")}</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select>
        </label>
        <label className={LABEL}>{t("filters.channel")}
          <select name="kanal" defaultValue={filters.channel ?? ""} className={FIELD} disabled={filters.area === "kampagnen"}><option value="">{t("filters.all")}</option>{CHANNELS.map((channel) => <option key={channel} value={channel}>{t(`channels.${channel}`)}</option>)}</select>
        </label>
        <SubmitButton label={t("filters.apply")} pendingLabel="…" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#6D49E0] px-5 text-sm font-semibold text-white hover:bg-[#5B36D6]" />
      </form>

      <p className="text-[13.5px] leading-6 text-slate-700">{t(`hints.${filters.area}`)}</p>

      {table.rows.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-[15px] text-slate-700">{t(`empty.${filters.area}`)}</p> : (
        <>
          <div className="hidden overflow-x-auto rounded-[18px] border border-slate-200 bg-white p-2 md:block">
            <table className="w-full min-w-[900px] border-collapse text-[13.5px]">
              <thead>
                <tr className="text-left text-[11.5px] font-bold uppercase tracking-[0.05em] text-slate-600">
                  {table.columns.map((column) => <th key={column} scope="col" className="px-2.5 py-2.5">{column}</th>)}
                  {filters.area === "kampagnen" && canEditCampaigns ? <th scope="col" className="px-2.5 py-2.5"><span className="sr-only">{t("edit")}</span></th> : null}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row) => (
                  <tr key={row.key} className="border-t border-slate-100 align-top">
                    {row.cells.map((_, index) => (
                      <td key={index} className={`px-2.5 py-3 ${index === 0 || (filters.area === "veroeffentlicht" && index === 3) ? "font-semibold text-slate-950" : "text-slate-800"}`}>
                        {row.href && index === (filters.area === "geplant" ? 0 : -1) ? <Link href={row.href} className="text-violet-800 underline underline-offset-2">{row.cells[index]}</Link> : cellContent(row, index)}
                      </td>
                    ))}
                    {filters.area === "kampagnen" && canEditCampaigns ? <td className="px-2.5 py-2"><Link href={href({ kampagne: row.campaignId ?? null })} className="inline-flex min-h-11 items-center text-[13.5px] font-semibold text-violet-800 underline underline-offset-2">{t("edit")}</Link></td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="grid gap-3 md:hidden">
            {table.rows.map((row) => (
              <li key={row.key} className="grid gap-1.5 rounded-2xl border border-slate-200 bg-white p-4 text-[13.5px]">
                <p className="text-[15px] font-semibold text-slate-950">{row.href ? <Link href={row.href} className="underline underline-offset-2">{titleOf(row)}</Link> : titleOf(row)}</p>
                <dl className="grid gap-1">
                  {row.cells.map((_, index) => (TITLE_CELLS[filters.area].includes(index) || !row.cells[index] ? null : (
                    <div key={index} className="flex gap-2"><dt className="w-28 shrink-0 text-slate-600">{table.columns[index]}</dt><dd className="min-w-0 break-words text-slate-900">{cellContent(row, index)}</dd></div>
                  )))}
                </dl>
                {filters.area === "kampagnen" && canEditCampaigns ? <Link href={href({ kampagne: row.campaignId ?? null })} className="inline-flex min-h-11 items-center text-[13.5px] font-semibold text-violet-800 underline underline-offset-2">{t("edit")}</Link> : null}
              </li>
            ))}
          </ul>
        </>
      )}

      {editing ? (
        <form action={setCampaignDetailsAction} className="grid gap-4 rounded-2xl border border-violet-200 bg-white p-5" aria-labelledby="campaign-edit-title">
          <input type="hidden" name="orgId" value={orgId} />
          <input type="hidden" name="campaignId" value={editing.id} />
          <h3 id="campaign-edit-title" className="text-lg font-semibold text-slate-950">{t("campaign.title", { name: editing.name })}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={LABEL}>{t("campaign.brand")}
              <select name="brandId" defaultValue={editing.brandId ?? ""} className={FIELD}><option value="">{t("campaign.none")}</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select>
            </label>
            <label className={LABEL}>{t("campaign.contact")}
              <select name="contact" defaultValue={editing.contactUserId ?? ""} className={FIELD}><option value="">{t("campaign.none")}</option>{data.members.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}</select>
            </label>
          </div>
          <label className={LABEL}>{t("campaign.goal")}<input name="goal" maxLength={200} defaultValue={editing.goal ?? ""} placeholder={t("campaign.goalPlaceholder")} className={FIELD} /></label>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold text-slate-900">{t("campaign.keyDates")}</legend>
            {Array.from({ length: Math.min(10, Math.max(editing.keyDates.length + 2, 3)) }, (_, index) => editing.keyDates[index] ?? null).map((entry, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[11rem_minmax(0,1fr)]">
                <input type="date" name="keyDay" defaultValue={entry?.on ?? ""} aria-label={t("campaign.keyDay", { n: index + 1 })} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-[15px]" />
                <input name="keyLabel" maxLength={80} defaultValue={entry?.label ?? ""} aria-label={t("campaign.keyLabel", { n: index + 1 })} placeholder={t("campaign.keyPlaceholder")} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-[15px]" />
              </div>
            ))}
            <p className="text-xs leading-5 text-slate-600">{t("campaign.keyHint")}</p>
          </fieldset>
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton label={t("campaign.save")} pendingLabel="…" className="inline-flex min-h-11 items-center rounded-xl bg-[#6D49E0] px-5 text-sm font-semibold text-white hover:bg-[#5B36D6]" />
            <Link href={href({ kampagne: null })} className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-slate-700">{t("campaign.cancel")}</Link>
          </div>
        </form>
      ) : null}

      <p className="text-xs leading-5 text-slate-600">{t("footnote")}</p>
    </section>
  );
}
