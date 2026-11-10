import { campaignRows, filterPosts, plannedRows, publishedRows, type ReportArea, type ReportFilters, type ReportLabels, type ReportTable } from "@/features/advisor/contentReport/contentReportModel";
import type { ContentReportData } from "@/features/advisor/contentReport/contentReportData";
import type { OrgPost } from "@/features/advisor/socialCalendarModel";

type T = (key: string, values?: Record<string, string | number>) => string;

/** Die Tabelle eines Bereichs - fuer die Seite und fuer den CSV-Download dieselbe. */
export function buildReportTable(area: ReportArea, data: ContentReportData, filters: ReportFilters, t: T, locale: string, hrefPost: (post: OrgPost) => string): ReportTable {
  const day = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
  const labels: ReportLabels = {
    status: (status) => t(`status.${status}`),
    channel: (channel) => t(`channels.${channel}`),
    none: "",
    noResults: t("noResults"),
    linkWord: t("link"),
    posts: (count) => t("postsCount", { count }),
    day: (iso) => day.format(new Date(`${iso}T00:00:00Z`)),
  };
  const columns = t(`columns.${area}`).split(" | ");
  const posts = filterPosts(data.posts, filters);
  if (area === "geplant") return { columns, rows: plannedRows(posts, data.lookup, labels, hrefPost) };
  if (area === "kampagnen") return { columns, rows: campaignRows(data.campaigns, data.posts, data.lookup, labels, filters) };
  return { columns, rows: publishedRows(posts, data.lookup, labels, { views: t("words.views"), reactions: t("words.reactions"), clicks: t("words.clicks") }, hrefPost) };
}
