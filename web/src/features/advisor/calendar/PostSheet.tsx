import Link from "next/link";
import { berlinDayOf } from "@/lib/berlinTime";
import { getTranslations } from "next-intl/server";
import { addPostTaskAction, deletePostAction, savePostAction, unlinkPostTaskAction } from "@/features/advisor/socialCalendarActions";
import { CHANNELS, CHANNEL_STYLE, POST_STATUSES, type ContentDefaults, type ContentItem, type OrgCampaign, type OrgPost, type PostTask } from "@/features/advisor/socialCalendarModel";
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
  content,
  defaults,
  tasks,
  linkableTasks,
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
  /** Marken, Saeulen, Formate der Organisation und der Standard fuer neue Beitraege (20270411120000). */
  content: ContentItem[];
  defaults: ContentDefaults | null;
  /** Aufgaben, die an diesem Beitrag haengen, und Teamaufgaben, die man noch daran haengen kann. */
  tasks: PostTask[];
  linkableTasks: { id: string; title: string }[];
}) {
  const t = await getTranslations("advisor.social");
  const tc = await getTranslations("advisor.calendar.sheet");
  const day = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" });
  const fresh = !post;
  const pick = (kind: ContentItem["kind"]) => content.filter((item) => item.kind === kind);
  const select = (name: string, kind: ContentItem["kind"], value: string | null) => (
    <select name={name} defaultValue={value ?? ""} className={TILE_INPUT}>
      <option value="">{t("form.contentNone")}</option>
      {pick(kind).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select>
  );
  const brandId = post ? post.brandId : defaults?.brandId ?? null;
  const pillarId = post ? post.pillarId : defaults?.pillarId ?? null;
  const formatId = post ? post.formatId : defaults?.formatId ?? null;
  const approverId = post ? post.approverUserId : defaults?.approverUserId ?? null;
  const moreOpen = Boolean(post && (post.brandId || post.pillarId || post.formatId || post.materialUrl || post.approverUserId || post.openInfo));
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
                <input type="checkbox" name="channel" value={channel} defaultChecked={post?.channels.includes(channel) ?? channel === (defaults?.channel ?? "linkedin")} className="size-4" />
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
            <select name="status" defaultValue={post?.status ?? defaults?.status ?? "idea"} className={TILE_INPUT}>{POST_STATUSES.map((status) => <option key={status} value={status}>{t(`status.${status}`)}</option>)}</select>
          </label>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <label className={TILE}>
            <span className={TILE_LABEL}>{t("form.event")}</span>
            <select name="eventId" defaultValue={post?.eventId ?? defaultEventId ?? ""} className={TILE_INPUT}>
              <option value="">{t("form.noEvent")}</option>
              {events.map((entry) => <option key={entry.eventId} value={entry.eventId}>{`${day.format(new Date(`${berlinDayOf(entry.startsAt)}T00:00:00Z`))} · ${entry.title}`}</option>)}
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
        {/* Voreinstellung: was meistens gilt, ist schon gewaehlt - hier aendert man nur, was diesmal anders ist. */}
        {fresh && (defaults?.brandId || defaults?.pillarId || defaults?.formatId) ? (
          <p className="rounded-xl bg-violet-50 px-4 py-2.5 text-[13px] leading-5 text-violet-950">
            <b>{t("form.fromDefaults")}</b>{" "}
            {[content.find((item) => item.id === defaults?.brandId)?.name, content.find((item) => item.id === defaults?.pillarId)?.name, content.find((item) => item.id === defaults?.formatId)?.name].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        <details open={moreOpen} className="group rounded-2xl border border-slate-200">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-[14.5px] font-semibold text-slate-900">
            <span aria-hidden="true" className="transition group-open:rotate-90">▸</span>
            {t("form.more")}
            <span className="font-normal text-slate-600">{t("form.moreHint")}</span>
          </summary>
          <div className="grid gap-3 px-4 pb-4">
            <div className="grid gap-2.5 sm:grid-cols-3">
              <label className={TILE}><span className={TILE_LABEL}>{t("form.brand")}</span>{select("brandId", "brand", brandId)}</label>
              <label className={TILE}><span className={TILE_LABEL}>{t("form.pillar")}</span>{select("pillarId", "pillar", pillarId)}</label>
              <label className={TILE}><span className={TILE_LABEL}>{t("form.format")}</span>{select("formatId", "format", formatId)}</label>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <label className={TILE}>
                <span className={TILE_LABEL}>{t("form.approver")}</span>
                <select name="approver" defaultValue={approverId ?? ""} className={TILE_INPUT}>
                  <option value="">{t("form.nobodyNeeded")}</option>
                  {members.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}
                </select>
              </label>
              <label className={TILE}><span className={TILE_LABEL}>{t("form.materialUrl")}</span><input type="url" name="materialUrl" maxLength={500} defaultValue={post?.materialUrl ?? ""} placeholder="https://www.canva.com/design/…" className={TILE_INPUT} /></label>
            </div>
            <label className={TILE}><span className={TILE_LABEL}>{t("form.openInfo")}</span><textarea name="openInfo" rows={3} maxLength={1000} defaultValue={post?.openInfo ?? ""} placeholder={t("form.openInfoPlaceholder")} className={`${TILE_INPUT} resize-y font-normal leading-6`} /></label>
          </div>
        </details>
        <label className={TILE}>
          <span className={TILE_LABEL}>{t("form.body")}</span>
          <textarea name="body" rows={7} maxLength={5000} defaultValue={post?.body ?? ""} placeholder={t("form.bodyPlaceholder")} className={`${TILE_INPUT} resize-y font-normal leading-6`} />
        </label>

        <section aria-labelledby="post-tasks-title" className="grid gap-3 rounded-2xl border border-slate-200 p-4">
          <h3 id="post-tasks-title" className="text-[14.5px] font-bold text-slate-900">{t("form.tasksTitle")}</h3>
          {tasks.length === 0 ? <p className="text-[13px] text-slate-600">{t("form.tasksNone")}</p> : (
            <ul className="grid gap-1.5">
              {tasks.map((task) => (
                <li key={task.taskId} className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-50 px-3 text-[14px]">
                  <span aria-hidden="true" className={task.status === "done" ? "text-emerald-700" : "text-slate-500"}>{task.status === "done" ? "✓" : "○"}</span>
                  <span className={`min-w-0 flex-1 truncate ${task.status === "done" ? "text-slate-500 line-through" : "font-medium"}`}>{task.title}</span>
                  {task.dueOn ? <span className="shrink-0 text-xs text-slate-600">{task.dueOn.slice(5).split("-").reverse().join(".")}</span> : null}
                  <button type="submit" formAction={unlinkPostTaskAction} formNoValidate name="unlinkTaskId" value={task.taskId} className="inline-flex min-h-11 items-center px-2 text-[13px] font-semibold text-slate-600 hover:text-rose-800">{t("form.taskUnlink")}</button>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input name="taskTitle" maxLength={200} placeholder={t("form.taskNew")} aria-label={t("form.taskNew")} className={`${TILE_INPUT} w-full`} />
            <input type="date" name="taskDueOn" aria-label={t("form.taskDue")} className={TILE_INPUT} />
          </div>
          {linkableTasks.length > 0 ? (
            <select name="linkTaskId" defaultValue="" aria-label={t("form.taskExisting")} className={TILE_INPUT}>
              <option value="">{t("form.taskExisting")}</option>
              {linkableTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
            </select>
          ) : null}
          <SubmitButton formAction={addPostTaskAction} formNoValidate label={t("form.taskAdd")} pendingLabel="…" className="inline-flex min-h-11 items-center justify-center self-start rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-violet-800 hover:bg-violet-50" />
          <p className="text-xs leading-5 text-slate-600">{t("form.taskHint")}</p>
        </section>
      </div>
    </SidePanel>
  );
}
