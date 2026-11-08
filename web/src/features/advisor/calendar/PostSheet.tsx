import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { deletePostAction, savePostAction } from "@/features/advisor/socialCalendarActions";
import { CHANNELS, CHANNEL_STYLE, POST_STATUSES, type OrgCampaign, type OrgPost } from "@/features/advisor/socialCalendarModel";
import { SidePanel } from "@/features/ui/SidePanel";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { TILE, TILE_INPUT, TILE_LABEL } from "@/features/ui/FormControls";

/**
 * Ein Post im Kalender (seit 06.11.2026 gibt es nur noch einen Kalender): anlegen oder aendern als Seitenpanel.
 * Speichern, Status und Loeschen laufen ueber dieselben Funktionen wie vorher im Social-Kalender.
 */
export async function PostSheet({
  orgId,
  post,
  defaultDay,
  defaultEventId,
  month,
  closeHref,
  events,
  campaigns,
  members,
  canDelete,
  locale,
}: {
  orgId: string;
  post: OrgPost | null;
  defaultDay: string;
  defaultEventId: string | null;
  month: string;
  closeHref: string;
  events: { eventId: string; title: string; startsAt: string }[];
  campaigns: OrgCampaign[];
  members: { userId: string; name: string }[];
  canDelete: boolean;
  locale: string;
}) {
  const t = await getTranslations("advisor.social");
  const tc = await getTranslations("advisor.calendar.sheet");
  const day = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" });
  const event = events.find((entry) => entry.eventId === (post?.eventId ?? defaultEventId));
  return (
    <SidePanel
      closeHref={closeHref}
      closeLabel={tc("close")}
      titleId="post-sheet-title"
      eyebrow={post ? tc("postEditEyebrow") : tc("postNewEyebrow")}
      formAction={savePostAction}
      footer={
        <div className="flex flex-wrap items-center gap-2.5">
          {post && canDelete ? <SubmitButton formAction={deletePostAction} formNoValidate label={t("form.delete")} pendingLabel="…" className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-rose-700 underline-offset-4 hover:underline" /> : null}
          <span className="flex-1" />
          <Link href={closeHref} className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-slate-800 hover:bg-slate-100">{tc("cancel")}</Link>
          <SubmitButton label={post ? t("form.save") : t("form.add")} pendingLabel="…" className="inline-flex min-h-[46px] items-center rounded-xl bg-[#6D49E0] px-6 text-[14.5px] font-semibold text-white hover:bg-[#5B36D6]" />
        </div>
      }
    >
      <input type="hidden" name="orgId" value={orgId} />
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="calendar" value="1" />
      {post ? <input type="hidden" name="postId" value={post.id} /> : null}
      <div className="grid gap-5 px-5 pb-6 pt-2 sm:px-7">
        <label className="block">
          <span className="sr-only">{t("form.title")}</span>
          <input name="title" required maxLength={160} defaultValue={post?.title ?? (event ? t("form.titleForEvent", { event: event.title }) : "")} placeholder={t("form.title")} className="font-brand w-full border-0 border-b-2 border-slate-200 bg-transparent pb-2.5 pt-1 text-[26px] font-semibold leading-tight text-slate-950 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-violet-500" />
        </label>
        <fieldset className="grid gap-2">
          <legend className="text-[13px] font-bold text-slate-700">{t("form.channels")}</legend>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((channel) => (
              <label key={channel} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-slate-300 bg-white px-3.5 text-[13.5px] font-semibold text-slate-700 has-[:checked]:border-violet-500 has-[:checked]:bg-violet-50 has-[:checked]:text-violet-950">
                <input type="checkbox" name="channel" value={channel} defaultChecked={post?.channels.includes(channel) ?? channel === "linkedin"} className="size-4" />
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${CHANNEL_STYLE[channel].dot}`} />
                {t(`channels.${channel}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-2.5 sm:grid-cols-3">
          <label className={TILE}><span className={TILE_LABEL}>{t("form.day")}</span><input type="date" name="plannedOn" required defaultValue={post?.plannedOn ?? defaultDay} className={TILE_INPUT} /></label>
          <label className={TILE}><span className={TILE_LABEL}>{t("form.time")}</span><input type="time" name="plannedTime" defaultValue={post?.plannedTime ?? ""} className={TILE_INPUT} /></label>
          <label className={TILE}>
            <span className={TILE_LABEL}>{t("form.status")}</span>
            <select name="status" defaultValue={post?.status ?? "idea"} className={TILE_INPUT}>{POST_STATUSES.map((status) => <option key={status} value={status}>{t(`status.${status}`)}</option>)}</select>
          </label>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <label className={TILE}>
            <span className={TILE_LABEL}>{t("form.event")}</span>
            <select name="eventId" defaultValue={post?.eventId ?? defaultEventId ?? ""} className={TILE_INPUT}>
              <option value="">{t("form.noEvent")}</option>
              {events.map((entry) => <option key={entry.eventId} value={entry.eventId}>{`${day.format(new Date(`${entry.startsAt.slice(0, 10)}T00:00:00Z`))} · ${entry.title}`}</option>)}
            </select>
          </label>
          <label className={TILE}>
            <span className={TILE_LABEL}>{t("form.assignee")}</span>
            <select name="assignee" defaultValue={post?.assigneeUserId ?? ""} className={TILE_INPUT}>
              <option value="">{t("form.nobody")}</option>
              {members.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}
            </select>
          </label>
          <label className={`${TILE} sm:col-span-2`}>
            <span className={TILE_LABEL}>{t("form.campaign")}</span>
            <select name="campaignId" defaultValue={post?.campaignId ?? ""} className={TILE_INPUT}>
              <option value="">{t("form.noCampaign")}</option>
              {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
            </select>
          </label>
        </div>
        <label className={TILE}>
          <span className={TILE_LABEL}>{t("form.body")}</span>
          <textarea name="body" rows={7} maxLength={5000} defaultValue={post?.body ?? ""} placeholder={t("form.bodyPlaceholder")} className={`${TILE_INPUT} resize-y font-normal leading-6`} />
        </label>
      </div>
    </SidePanel>
  );
}
