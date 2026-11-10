import { CHANNELS, addDays, isChannel, postNoLabel, type Channel, type ContentItem, type OrgCampaign, type OrgPost } from "@/features/advisor/socialCalendarModel";

/**
 * Content-Report (Entwurf 10.11.2026): drei Bereiche - geplante Einzelbeitraege, Events & Kampagnen, veroeffentlichte Beitraege.
 * Er liest nur, was im Kalender, bei Kampagnen und Events schon steht; niemand pflegt ihn extra. Reine Funktionen: die Seite
 * und der CSV-Download benutzen dieselben Zeilen. Keine Bewertung von Personen; Ergebnisse sind freiwillige Zahlen zum Beitrag.
 */
export const REPORT_AREAS = ["geplant", "kampagnen", "veroeffentlicht"] as const;
export type ReportArea = (typeof REPORT_AREAS)[number];

export type ReportFilters = { area: ReportArea; from: string; to: string; brandId: string | null; channel: Channel | null; periodChosen: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

/** Ohne Zeitraum: die letzten 90 Tage bis neun Monate voraus. */
export function parseReportFilters(query: Record<string, string | string[] | undefined>, today: string): ReportFilters {
  const area = REPORT_AREAS.find((entry) => entry === one(query.bereich)) ?? "geplant";
  const from = one(query.von);
  const to = one(query.bis);
  const periodChosen = DAY.test(from) || DAY.test(to);
  const channel = one(query.kanal);
  const brand = one(query.marke);
  return {
    area,
    from: DAY.test(from) ? from : addDays(today, -90),
    to: DAY.test(to) ? to : addDays(today, 270),
    brandId: UUID.test(brand) ? brand : null,
    channel: isChannel(channel) ? channel : null,
    periodChosen,
  };
}

export type ReportLookup = {
  brands: Map<string, string>;
  pillars: Map<string, string>;
  formats: Map<string, string>;
  members: Map<string, string>;
  campaigns: Map<string, string>;
  events: Map<string, string>;
};

export const lookupOf = (content: ContentItem[], members: { userId: string; name: string }[], campaigns: OrgCampaign[], events: { id: string; title: string }[]): ReportLookup => ({
  brands: new Map(content.filter((item) => item.kind === "brand").map((item) => [item.id, item.name])),
  pillars: new Map(content.filter((item) => item.kind === "pillar").map((item) => [item.id, item.name])),
  formats: new Map(content.filter((item) => item.kind === "format").map((item) => [item.id, item.name])),
  members: new Map(members.map((member) => [member.userId, member.name])),
  campaigns: new Map(campaigns.map((campaign) => [campaign.id, campaign.name])),
  events: new Map(events.map((event) => [event.id, event.title])),
});

export type ReportLabels = { status: (status: string) => string; channel: (channel: string) => string; none: string; noResults: string; linkWord: string; posts: (count: number) => string; day: (iso: string) => string };

export type ReportRow = { key: string; href: string | null; cells: string[]; /** Kampagne: Kennung fuer "Bearbeiten". */ campaignId?: string };
export type ReportTable = { columns: string[]; rows: ReportRow[] };

const inPeriod = (day: string, filters: ReportFilters) => day >= filters.from && day <= filters.to;
const channelsOf = (post: OrgPost, labels: ReportLabels) => (post.channels.length > 0 ? post.channels.map(labels.channel).join(", ") : "");

export function filterPosts(posts: OrgPost[], filters: ReportFilters): OrgPost[] {
  return posts
    .filter((post) => inPeriod(post.plannedOn, filters))
    .filter((post) => !filters.brandId || post.brandId === filters.brandId)
    .filter((post) => !filters.channel || post.channels.includes(filters.channel));
}

export function plannedRows(posts: OrgPost[], lookup: ReportLookup, labels: ReportLabels, href: (post: OrgPost) => string): ReportRow[] {
  return posts
    .filter((post) => post.status !== "published")
    .sort((a, b) => (a.plannedOn === b.plannedOn ? a.postNo - b.postNo : a.plannedOn < b.plannedOn ? -1 : 1))
    .map((post) => ({
      key: post.id,
      href: href(post),
      cells: [
        postNoLabel(post.postNo), post.title, labels.day(post.plannedOn), lookup.brands.get(post.brandId ?? "") ?? "", channelsOf(post, labels),
        lookup.pillars.get(post.pillarId ?? "") ?? "", lookup.formats.get(post.formatId ?? "") ?? "", labels.status(post.status),
        post.eventId ? lookup.events.get(post.eventId) ?? "" : post.campaignId ? lookup.campaigns.get(post.campaignId) ?? "" : "",
        post.materialUrl ?? "", post.openInfo ?? "", lookup.members.get(post.approverUserId ?? "") ?? "",
      ],
    }));
}

export function campaignRows(campaigns: OrgCampaign[], posts: OrgPost[], lookup: ReportLookup, labels: ReportLabels, filters: ReportFilters): ReportRow[] {
  return campaigns
    .filter((campaign) => (!campaign.startsOn && !campaign.endsOn) || ((campaign.endsOn ?? campaign.startsOn ?? "") >= filters.from && (campaign.startsOn ?? campaign.endsOn ?? "") <= filters.to))
    .filter((campaign) => !filters.brandId || campaign.brandId === filters.brandId)
    .sort((a, b) => ((a.startsOn ?? "9999") < (b.startsOn ?? "9999") ? -1 : 1))
    .map((campaign) => {
      const linked = posts.filter((post) => post.campaignId === campaign.id).length;
      const period = campaign.startsOn || campaign.endsOn ? [campaign.startsOn ? labels.day(campaign.startsOn) : "", campaign.endsOn ? labels.day(campaign.endsOn) : ""].join(" – ") : "";
      return {
        key: campaign.id,
        href: null,
        campaignId: campaign.id,
        cells: [
          campaign.name, period, lookup.brands.get(campaign.brandId ?? "") ?? "", campaign.goal ?? "", lookup.members.get(campaign.contactUserId ?? "") ?? "",
          campaign.keyDates.map((entry) => `${labels.day(entry.on)} ${entry.label}`).join(" · "), labels.posts(linked),
        ],
      };
    });
}

export function resultText(post: OrgPost, labels: ReportLabels, words: { views: string; reactions: string; clicks: string }): string {
  const parts = [
    post.resultViews !== null ? `${post.resultViews} ${words.views}` : "",
    post.resultReactions !== null ? `${post.resultReactions} ${words.reactions}` : "",
    post.resultClicks !== null ? `${post.resultClicks} ${words.clicks}` : "",
    post.resultNote ?? "",
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : labels.noResults;
}

export function publishedRows(posts: OrgPost[], lookup: ReportLookup, labels: ReportLabels, words: { views: string; reactions: string; clicks: string }, href: (post: OrgPost) => string): ReportRow[] {
  return posts
    .filter((post) => post.status === "published")
    .sort((a, b) => (a.plannedOn < b.plannedOn ? 1 : a.plannedOn > b.plannedOn ? -1 : b.postNo - a.postNo))
    .map((post) => ({
      key: post.id,
      href: href(post),
      cells: [lookup.brands.get(post.brandId ?? "") ?? "", channelsOf(post, labels), labels.day(post.plannedOn), post.title, post.publishedUrl ?? "", resultText(post, labels, words)],
    }));
}

/** CSV mit Semikolon (deutsches Excel). Zellen, die mit = + - @ beginnen, bekommen ein Hochkomma - sonst liest Excel sie als Formel. */
export function toCsv(table: ReportTable): string {
  const cell = (value: string) => {
    const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return `﻿${[table.columns, ...table.rows.map((row) => row.cells)].map((line) => line.map(cell).join(";")).join("\r\n")}\r\n`;
}

export { CHANNELS };
