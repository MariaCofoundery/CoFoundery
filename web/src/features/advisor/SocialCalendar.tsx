import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { PlanCampaign } from "@/features/advisor/PlanCampaign";
import { deleteCampaignAction } from "@/features/advisor/socialCalendarActions";
import type { CalendarEvent, OrgCampaign } from "@/features/advisor/socialCalendarModel";
import { teamraumHref } from "@/features/advisor/teamraumRoutes";
import { calendarHref } from "@/features/advisor/calendar/calendarModel";
import { PostTemplateCards } from "@/features/advisor/PostTemplateCards";
import type { PostTemplate } from "@/features/advisor/postPlanning";
import { ContentSettings } from "@/features/advisor/ContentSettings";
import type { ContentDefaults, ContentItem } from "@/features/advisor/socialCalendarModel";

/**
 * Vorlagen und Kampagnen (Social Media im Teamraum, 20270319120000). Den Kalender dazu gibt es seit dem 06.11.2026
 * nicht mehr doppelt: Posts sind im Kalender eine Ebene, die man an- und ausschaltet, und dort lassen sie sich
 * anlegen und aendern. Hier bleibt, was Arbeitsmaterial ist - Vorlagen (x Posts zu Termin y) und Kampagnen
 * ("Kampagne reinsprechen").
 */

export type SocialContext = {
  orgId: string;
  isOwner: boolean;
  canWrite: boolean;
  today: string;
  month: string;
  locale: string;
  events: CalendarEvent[];
  campaigns: OrgCampaign[];
  /** Post-Vorlagen fuer Veranstaltungen (20270324120000). */
  templates: PostTemplate[];
  reiter: "vorlagen" | "kampagnen" | "einstellungen";
  /** Marken, Saeulen, Formate und Standard (20270411120000); `canPlan`: wer sie pflegen darf. */
  content: { items: ContentItem[]; defaults: ContentDefaults | null; members: { userId: string; name: string }[]; canPlan: boolean; feedback: { error: boolean; saved: boolean } };
  /** Vorlage im Editor: "neu" fuer eine neue, sonst die Kennung. */
  templateEdit: string | null;
  feedback: { error: boolean; saved: boolean; deleted: boolean; created: number | null };
};

const CARD = "advisor-card p-5 sm:p-6";

export async function SocialCalendar({ ctx }: { ctx: SocialContext }) {
  const t = await getTranslations("advisor.social");
  const dayLong = new Intl.DateTimeFormat(ctx.locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const message = ctx.feedback.error ? { tone: "rose", text: t("error") } : ctx.feedback.created !== null ? { tone: "emerald", text: t("created", { count: ctx.feedback.created }) } : ctx.feedback.saved || ctx.feedback.deleted ? { tone: "emerald", text: t("saved") } : null;
  const tabs = ["vorlagen", "kampagnen", "einstellungen"] as const;
  const tabHref = (tab: (typeof tabs)[number]) => teamraumHref("social", ctx.orgId, { reiter: tab });

  return (
    <div className="grid gap-5">
      {message ? <p role={message.tone === "rose" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${message.tone === "rose" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>{message.text}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <nav aria-label={t("tabsLabel")} className="inline-flex rounded-xl bg-[#E9EAF3] p-[3px]">
          {tabs.map((tab) => (
            <Link key={tab} href={tabHref(tab)} aria-current={ctx.reiter === tab ? "page" : undefined} className={`inline-flex min-h-10 items-center rounded-[9px] px-4 text-sm font-semibold ${ctx.reiter === tab ? "bg-white text-slate-950 shadow-[0_1px_3px_rgba(23,23,58,0.14)]" : "text-slate-700 hover:text-slate-950"}`}>
              {t(`tabs.${tab}`)}
            </Link>
          ))}
        </nav>
        <span className="flex-1" />
        <Link href={calendarHref(ctx.orgId)} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-50">{t("toCalendar")}</Link>
        {ctx.canWrite ? (
          <Link href={teamraumHref("social", ctx.orgId, { reiter: "vorlagen", vorlage: "neu" })} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#6D49E0] px-4 text-sm font-semibold text-white hover:bg-[#5B36D6]">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            {t("addTemplate")}
          </Link>
        ) : null}
      </div>

      {ctx.reiter === "einstellungen" ? <ContentSettings orgId={ctx.orgId} items={ctx.content.items} defaults={ctx.content.defaults} members={ctx.content.members} canEdit={ctx.content.canPlan} feedback={ctx.content.feedback} /> : null}
      {ctx.reiter === "vorlagen" ? <PostTemplateCards orgId={ctx.orgId} month={ctx.month} templates={ctx.templates} canWrite={ctx.canWrite} editing={ctx.templateEdit} /> : null}

      {ctx.reiter === "kampagnen" ? (
        <>
          {ctx.canWrite ? (
            <details open className="rounded-3xl border border-violet-200 bg-violet-50/70 p-5 sm:p-6">
              <summary className="flex min-h-11 cursor-pointer items-center text-base font-semibold text-slate-950">{t("plan.title")}</summary>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("plan.text")}</p>
              <div className="mt-4">
                <PlanCampaign orgId={ctx.orgId} month={ctx.month} today={ctx.today} events={ctx.events} />
              </div>
            </details>
          ) : null}
          <section aria-labelledby="campaigns-title" className={CARD}>
            <h3 id="campaigns-title" className="text-[15px] font-semibold text-slate-950">{t("campaignsTitle")}</h3>
            {ctx.campaigns.length === 0 ? <p className="mt-2 text-sm text-slate-600">{t("campaignsNone")}</p> : null}
            <ul className="mt-2 divide-y divide-slate-100">
              {ctx.campaigns.slice(0, 12).map((campaign) => (
                <li key={campaign.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <Link href={calendarHref(ctx.orgId, { monat: (campaign.startsOn ?? ctx.today).slice(0, 7), nur: "posts" })} className="min-w-0 font-semibold text-slate-900 underline-offset-4 hover:underline">{campaign.name}</Link>
                  <span className="flex items-center gap-3 text-xs text-slate-600">
                    {campaign.startsOn ? `${dayLong.format(new Date(`${campaign.startsOn}T00:00:00Z`))}${campaign.endsOn && campaign.endsOn !== campaign.startsOn ? ` – ${dayLong.format(new Date(`${campaign.endsOn}T00:00:00Z`))}` : ""}` : null}
                    {ctx.canWrite ? (
                      <form action={deleteCampaignAction}>
                        <input type="hidden" name="orgId" value={ctx.orgId} />
                        <input type="hidden" name="month" value={ctx.month} />
                        <input type="hidden" name="campaignId" value={campaign.id} />
                        <SubmitButton label={t("campaignDelete")} pendingLabel="…" className="text-xs text-slate-600 underline-offset-4 hover:underline" />
                      </form>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-600">{t("campaignDeleteHint")}</p>
          </section>
        </>
      ) : null}
    </div>
  );
}
