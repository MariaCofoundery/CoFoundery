import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { UserText } from "@/features/ui/UserText";
import { PlanCampaign } from "@/features/advisor/PlanCampaign";
import { DraggableItem, DropDay } from "@/features/ui/CalendarDrag";
import { deleteCampaignAction, deletePostAction, movePostToDayAction, savePostAction, setPostStatusAction } from "@/features/advisor/socialCalendarActions";
import {
  CHANNELS,
  CHANNEL_STYLE,
  POST_STATUSES,
  addDays,
  eventsWithoutPosts,
  isoWeekNumber,
  monthGrid,
  postsByDay,
  shiftMonth,
  type CalendarEvent,
  type Channel,
  type OrgCampaign,
  type OrgPost,
} from "@/features/advisor/socialCalendarModel";
import { teamraumHref } from "@/features/advisor/teamraumRoutes";

/**
 * Social-Media-Kalender im Teamraum (20270319120000): Monat auf einen Blick, Postings farbig je Kanal,
 * Veranstaltungen aus dem Programmplan daneben, "Hierzu ist noch nichts geplant", Kampagne reinsprechen.
 * Auf dem Telefon statt des Rasters eine Liste nach Tagen.
 */

export type SocialContext = {
  orgId: string;
  me: string;
  isOwner: boolean;
  canWrite: boolean;
  today: string;
  month: string;
  view: "month" | "week";
  /** Montag der gezeigten Woche. */
  week: string;
  locale: string;
  members: { userId: string; name: string }[];
  events: CalendarEvent[];
  posts: OrgPost[];
  eventPosts: OrgPost[];
  campaigns: OrgCampaign[];
  channel: Channel | null;
  feedback: { error: boolean; saved: boolean; deleted: boolean; created: number | null };
};

const CARD = "advisor-card p-5 sm:p-6";
const LABEL = "block text-xs font-semibold uppercase tracking-[.12em] text-slate-500";
const INPUT = "mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm";
const STATUS_STYLE: Record<OrgPost["status"], string> = {
  idea: "border border-dashed border-slate-300 bg-white",
  draft: "border border-slate-200 bg-white",
  planned: "border border-slate-200 bg-white shadow-sm",
  published: "border border-emerald-200 bg-emerald-50/70",
};

function Hidden({ ctx, postId }: { ctx: SocialContext; postId?: string }) {
  return (
    <>
      <input type="hidden" name="orgId" value={ctx.orgId} />
      <input type="hidden" name="month" value={ctx.month} />
      {ctx.view === "week" ? <input type="hidden" name="week" value={ctx.week} /> : null}
      {postId ? <input type="hidden" name="postId" value={postId} /> : null}
    </>
  );
}

const href = (ctx: SocialContext, extra: Record<string, string> = {}) =>
  teamraumHref("social", ctx.orgId, {
    ...(ctx.view === "week" ? { view: "week", week: ctx.week } : { month: ctx.month }),
    ...(ctx.channel ? { channel: ctx.channel } : {}),
    ...extra,
  });

async function PostPill({ ctx, post, large = false }: { ctx: SocialContext; post: OrgPost; large?: boolean }) {
  const t = await getTranslations("advisor.social");
  const first = post.channels[0] ?? "other";
  return (
    <DraggableItem id={post.id} kind="post">
    <Link
      href={`${href(ctx, { post: post.id })}#post-editor`}
      className={`block rounded-lg border-l-4 px-1.5 py-1 text-[12px] leading-4 text-slate-800 hover:ring-2 hover:ring-violet-300 ${CHANNEL_STYLE[first].bar} ${STATUS_STYLE[post.status]}`}
      title={`${post.title} · ${t(`status.${post.status}`)}`}
    >
      <span className="flex items-center gap-1">
        {post.status === "published" ? <span aria-hidden="true" className="text-emerald-700">✓</span> : null}
        {post.plannedTime ? <span className="shrink-0 font-semibold text-slate-500">{post.plannedTime}</span> : null}
        <span className={`truncate ${post.status === "published" ? "text-slate-500" : "font-medium"}`}>{post.title}</span>
      </span>
      {large ? (
        <span className="mt-1 flex flex-wrap gap-1">
          {post.channels.map((channel) => <span key={channel} className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${CHANNEL_STYLE[channel].chip}`}>{t(`channels.${channel}`)}</span>)}
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{t(`status.${post.status}`)}</span>
        </span>
      ) : post.channels.length > 1 ? (
        <span className="mt-0.5 flex gap-0.5" aria-hidden="true">
          {post.channels.map((channel) => <span key={channel} className={`h-1.5 w-1.5 rounded-full ${CHANNEL_STYLE[channel].dot}`} />)}
        </span>
      ) : null}
    </Link>
    </DraggableItem>
  );
}

async function PostEditor({ ctx, post, newDay, newEvent }: { ctx: SocialContext; post: OrgPost | null; newDay: string | null; newEvent: string | null }) {
  const t = await getTranslations("advisor.social");
  const day = new Intl.DateTimeFormat(ctx.locale, { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" });
  const canDelete = post && ctx.canWrite && (post.createdByUserId === ctx.me || ctx.isOwner);
  const event = ctx.events.find((entry) => entry.eventId === (post?.eventId ?? newEvent));
  return (
    <section id="post-editor" aria-labelledby="post-editor-title" className={`${CARD} scroll-mt-24 border-violet-200`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 id="post-editor-title" className="text-lg font-semibold text-slate-950">{post ? post.title : t("form.new")}</h3>
        <Link href={href(ctx)} className="inline-flex min-h-10 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700">{t("form.close")}</Link>
      </div>
      {post?.body ? <div className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-800"><UserText text={post.body} /></div> : null}
      {post && ctx.canWrite ? (
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label={t("form.status")}>
          {POST_STATUSES.map((status) => (
            <form key={status} action={setPostStatusAction}>
              <Hidden ctx={ctx} postId={post.id} />
              <input type="hidden" name="status" value={status} />
              <SubmitButton label={t(`status.${status}`)} pendingLabel="…" className={`inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-semibold ${post.status === status ? "brand-here" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`} />
            </form>
          ))}
        </div>
      ) : null}
      {ctx.canWrite ? (
        <form action={savePostAction} className="mt-4 grid gap-4">
          <Hidden ctx={ctx} postId={post?.id} />
          <label className="block">
            <span className={LABEL}>{t("form.title")}</span>
            <input name="title" required maxLength={160} defaultValue={post?.title ?? (event ? t("form.titleForEvent", { event: event.title }) : "")} className={INPUT} />
          </label>
          <fieldset>
            <legend className={LABEL}>{t("form.channels")}</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CHANNELS.map((channel) => (
                <label key={channel} className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 has-[:checked]:border-violet-300 has-[:checked]:bg-violet-50 has-[:checked]:text-slate-900">
                  <input type="checkbox" name="channel" value={channel} defaultChecked={post?.channels.includes(channel) ?? false} className="size-4" />
                  <span aria-hidden="true" className={`h-2 w-2 rounded-full ${CHANNEL_STYLE[channel].dot}`} />
                  {t(`channels.${channel}`)}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-3">
            <label>
              <span className={LABEL}>{t("form.day")}</span>
              <input type="date" name="plannedOn" required defaultValue={post?.plannedOn ?? newDay ?? ctx.today} className={INPUT} />
            </label>
            <label>
              <span className={LABEL}>{t("form.time")}</span>
              <input type="time" name="plannedTime" defaultValue={post?.plannedTime ?? ""} className={INPUT} />
            </label>
            <label>
              <span className={LABEL}>{t("form.status")}</span>
              <select name="status" defaultValue={post?.status ?? "idea"} className={INPUT}>
                {POST_STATUSES.map((status) => <option key={status} value={status}>{t(`status.${status}`)}</option>)}
              </select>
            </label>
            <label>
              <span className={LABEL}>{t("form.campaign")}</span>
              <select name="campaignId" defaultValue={post?.campaignId ?? ""} className={INPUT}>
                <option value="">{t("form.noCampaign")}</option>
                {ctx.campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
              </select>
            </label>
            <label>
              <span className={LABEL}>{t("form.event")}</span>
              <select name="eventId" defaultValue={post?.eventId ?? newEvent ?? ""} className={INPUT}>
                <option value="">{t("form.noEvent")}</option>
                {ctx.events.map((entry) => <option key={entry.eventId} value={entry.eventId}>{`${day.format(new Date(`${entry.startsAt.slice(0, 10)}T00:00:00Z`))} · ${entry.title}`}</option>)}
              </select>
            </label>
            <label>
              <span className={LABEL}>{t("form.assignee")}</span>
              <select name="assignee" defaultValue={post?.assigneeUserId ?? ""} className={INPUT}>
                <option value="">{t("form.nobody")}</option>
                {ctx.members.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}
              </select>
            </label>
          </div>
          <label className="block">
            <span className={LABEL}>{t("form.body")}</span>
            <textarea name="body" rows={6} maxLength={5000} defaultValue={post?.body ?? ""} placeholder={t("form.bodyPlaceholder")} className={`${INPUT} py-2 leading-6`} />
          </label>
          <SubmitButton label={post ? t("form.save") : t("form.add")} pendingLabel="…" className="brand-cta inline-flex min-h-11 w-fit items-center rounded-xl px-5 text-sm font-semibold" />
        </form>
      ) : null}
      {canDelete && post ? (
        <form action={deletePostAction} className="mt-4 border-t border-slate-100 pt-3">
          <Hidden ctx={ctx} postId={post.id} />
          <SubmitButton label={t("form.delete")} pendingLabel="…" className="text-sm font-medium text-rose-700 underline-offset-4 hover:underline" />
        </form>
      ) : null}
    </section>
  );
}

export async function SocialCalendar({ ctx, selected, newDay, newEvent }: { ctx: SocialContext; selected: OrgPost | null; newDay: string | null; newEvent: string | null }) {
  const t = await getTranslations("advisor.social");
  const monthLabel = new Intl.DateTimeFormat(ctx.locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${ctx.month}-01T00:00:00Z`));
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(ctx.week, index));
  const short = new Intl.DateTimeFormat(ctx.locale, { day: "numeric", month: "short", timeZone: "UTC" });
  const weekLabel = t("weekLabel", { number: isoWeekNumber(ctx.week), from: short.format(new Date(`${weekDays[0]}T00:00:00Z`)), to: short.format(new Date(`${weekDays[6]}T00:00:00Z`)) });
  const weekdays = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(ctx.locale, { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 10, 2 + index))));
  const dayLong = new Intl.DateTimeFormat(ctx.locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const visiblePosts = ctx.channel ? ctx.posts.filter((post) => post.channels.includes(ctx.channel as Channel)) : ctx.posts;
  const byDay = postsByDay(visiblePosts);
  const eventsByDay = new Map<string, CalendarEvent[]>();
  for (const event of ctx.events) eventsByDay.set(event.startsAt.slice(0, 10), [...(eventsByDay.get(event.startsAt.slice(0, 10)) ?? []), event]);
  const grid = monthGrid(ctx.month);
  const uncovered = eventsWithoutPosts(ctx.events, ctx.eventPosts, ctx.today);
  const agendaDays = grid.flat().filter((cell) => cell.inMonth && ((byDay.get(cell.day)?.length ?? 0) > 0 || (eventsByDay.get(cell.day)?.length ?? 0) > 0));
  const message = ctx.feedback.error ? { tone: "rose", text: t("error") } : ctx.feedback.created !== null ? { tone: "emerald", text: t("created", { count: ctx.feedback.created }) } : ctx.feedback.saved || ctx.feedback.deleted ? { tone: "emerald", text: t("saved") } : null;

  return (
    <div className="grid gap-6">
      {message ? <p role={message.tone === "rose" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${message.tone === "rose" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>{message.text}</p> : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{t("title")}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("text")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label={t("viewLabel")} className="inline-flex rounded-full border border-slate-200 bg-white p-1">
            {(["month", "week"] as const).map((entry) => (
              <Link
                key={entry}
                href={href({ ...ctx, view: entry, week: entry === "week" ? (ctx.view === "week" ? ctx.week : ctx.month === ctx.today.slice(0, 7) ? ctx.today : `${ctx.month}-01`) : ctx.week, month: entry === "month" ? (ctx.view === "week" ? ctx.week.slice(0, 7) : ctx.month) : ctx.month })}
                aria-current={ctx.view === entry ? "page" : undefined}
                className={`inline-flex min-h-9 items-center rounded-full px-4 text-sm ${ctx.view === entry ? "bg-slate-900 font-semibold text-white" : "text-slate-700 hover:bg-slate-50"}`}
              >
                {t(`views.${entry}`)}
              </Link>
            ))}
          </nav>
        <nav aria-label={t("monthNav")} className="flex items-center gap-1.5">
          <Link href={ctx.view === "week" ? href(ctx, { week: addDays(ctx.week, -7) }) : href(ctx, { month: shiftMonth(ctx.month, -1) })} aria-label={t("prev")} className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">‹</Link>
          <span className="min-w-36 text-center text-base font-semibold capitalize text-slate-950">{ctx.view === "week" ? weekLabel : monthLabel}</span>
          <Link href={ctx.view === "week" ? href(ctx, { week: addDays(ctx.week, 7) }) : href(ctx, { month: shiftMonth(ctx.month, 1) })} aria-label={t("next")} className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">›</Link>
          <Link href={ctx.view === "week" ? href(ctx, { week: ctx.today }) : href(ctx, { month: ctx.today.slice(0, 7) })} className="ml-1 inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50">{t("today")}</Link>
        </nav>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t("filterLabel")}>
        <Link href={href({ ...ctx, channel: null })} aria-current={ctx.channel === null ? "true" : undefined} className={`inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-semibold ${ctx.channel === null ? "brand-here" : "border-slate-200 bg-white text-slate-600"}`}>{t("allChannels")}</Link>
        {CHANNELS.map((channel) => (
          <Link key={channel} href={href({ ...ctx, channel })} aria-current={ctx.channel === channel ? "true" : undefined} className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold ${ctx.channel === channel ? `${CHANNEL_STYLE[channel].chip} border-transparent` : "border-slate-200 bg-white text-slate-600"}`}>
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${CHANNEL_STYLE[channel].dot}`} />
            {t(`channels.${channel}`)}
          </Link>
        ))}
        <span className="ml-2 inline-flex items-center gap-1.5 text-xs text-slate-500"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-amber-400" />{t("eventLegend")}</span>
      </div>

      {ctx.canWrite ? (
        <details className="rounded-3xl border border-violet-200 bg-violet-50/70 p-5 sm:p-6">
          <summary className="flex min-h-11 cursor-pointer items-center text-base font-semibold text-slate-950">{t("plan.title")}</summary>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("plan.text")}</p>
          <div className="mt-4">
            <PlanCampaign orgId={ctx.orgId} month={ctx.month} today={ctx.today} events={ctx.events} />
          </div>
        </details>
      ) : null}

      {selected || newDay ? <PostEditor ctx={ctx} post={selected} newDay={newDay} newEvent={newEvent} /> : null}

      {ctx.view === "week" ? (
        <div className="grid gap-3 md:grid-cols-7 md:gap-0 md:overflow-hidden md:rounded-3xl md:border md:border-slate-200 md:bg-white">
          {weekDays.map((day) => (
            <DropDay key={day} day={day} kind="post" move={movePostToDayAction} label={dayLong.format(new Date(`${day}T00:00:00Z`))} className="advisor-card min-h-40 p-2.5 md:rounded-none md:border-0 md:border-r md:border-slate-100 md:shadow-none md:last:border-r-0">
              <div className="flex items-center justify-between">
                <p className={`text-sm font-semibold ${day === ctx.today ? "text-violet-700" : "text-slate-900"}`}>
                  <span className="md:block md:text-xs md:font-semibold md:uppercase md:tracking-[.1em] md:text-slate-500">{new Intl.DateTimeFormat(ctx.locale, { weekday: "short", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`))}</span>{" "}
                  <span className={`md:mt-0.5 md:inline-grid md:h-8 md:min-w-8 md:place-items-center md:rounded-full md:text-base ${day === ctx.today ? "md:bg-violet-600 md:text-white" : ""}`}>{Number(day.slice(8))}.</span>
                </p>
                {ctx.canWrite ? <Link href={`${href(ctx, { newPost: day })}#post-editor`} aria-label={t("addOn", { day: dayLong.format(new Date(`${day}T00:00:00Z`)) })} className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-violet-50 hover:text-violet-700">+</Link> : null}
              </div>
              <div className="mt-2 grid gap-1.5">
                {(eventsByDay.get(day) ?? []).map((event) => <p key={event.eventId} className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">★ {event.title}</p>)}
                {(byDay.get(day) ?? []).map((post) => <PostPill key={post.id} ctx={ctx} post={post} large />)}
              </div>
            </DropDay>
          ))}
        </div>
      ) : null}

      {/* Raster ab mittlerer Breite */}
      {ctx.view === "month" ? (
      <div className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white md:block">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {weekdays.map((weekday) => <p key={weekday} className="px-2 py-2 text-xs font-semibold uppercase tracking-[.1em] text-slate-500">{weekday}</p>)}
        </div>
        {grid.map((week) => (
          <div key={week[0].day} className="grid grid-cols-7 border-b border-slate-100 last:border-b-0">
            {week.map((cell) => {
              const isToday = cell.day === ctx.today;
              return (
                <DropDay key={cell.day} day={cell.day} kind="post" move={movePostToDayAction} label={dayLong.format(new Date(`${cell.day}T00:00:00Z`))} className={`group relative min-h-32 border-r border-slate-100 p-1.5 last:border-r-0 ${cell.inMonth ? "" : "bg-slate-50/70"}`}>
                  <div className="flex items-center justify-between">
                    <span className={`grid h-7 min-w-7 place-items-center rounded-full px-1 text-xs font-semibold ${isToday ? "bg-violet-600 text-white" : cell.inMonth ? "text-slate-700" : "text-slate-400"}`}>{Number(cell.day.slice(8))}</span>
                    {ctx.canWrite ? (
                      <Link href={`${href(ctx, { newPost: cell.day })}#post-editor`} aria-label={t("addOn", { day: dayLong.format(new Date(`${cell.day}T00:00:00Z`)) })} className="grid h-7 w-7 place-items-center rounded-full text-sm text-slate-400 opacity-0 hover:bg-violet-50 hover:text-violet-700 focus:opacity-100 group-hover:opacity-100">+</Link>
                    ) : null}
                  </div>
                  <div className="mt-1 grid gap-1">
                    {(eventsByDay.get(cell.day) ?? []).map((event) => (
                      <p key={event.eventId} className="truncate rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900" title={event.title}>★ {event.title}</p>
                    ))}
                    {(byDay.get(cell.day) ?? []).map((post) => <PostPill key={post.id} ctx={ctx} post={post} />)}
                  </div>
                </DropDay>
              );
            })}
          </div>
        ))}
      </div>

      ) : null}

      {/* Liste auf dem Telefon */}
      {ctx.view === "month" ? (
      <ol className="grid gap-3 md:hidden">
        {agendaDays.length === 0 ? <li className="text-sm text-slate-600">{t("monthEmpty")}</li> : null}
        {agendaDays.map((cell) => (
          <li key={cell.day} className="advisor-card p-3">
            <div className="flex items-center justify-between">
              <p className={`text-sm font-semibold ${cell.day === ctx.today ? "text-violet-700" : "text-slate-900"}`}>{dayLong.format(new Date(`${cell.day}T00:00:00Z`))}</p>
              {ctx.canWrite ? <Link href={`${href(ctx, { newPost: cell.day })}#post-editor`} aria-label={t("addOn", { day: dayLong.format(new Date(`${cell.day}T00:00:00Z`)) })} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-600">+</Link> : null}
            </div>
            <div className="mt-2 grid gap-1.5">
              {(eventsByDay.get(cell.day) ?? []).map((event) => <p key={event.eventId} className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">★ {event.title}</p>)}
              {(byDay.get(cell.day) ?? []).map((post) => <PostPill key={post.id} ctx={ctx} post={post} />)}
            </div>
          </li>
        ))}
        {ctx.canWrite ? <li><Link href={`${href(ctx, { newPost: ctx.today })}#post-editor`} className="brand-cta inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-semibold">+ {t("form.new")}</Link></li> : null}
      </ol>
      ) : null}
      {ctx.view === "month" ? <p className="hidden text-xs text-slate-500 md:block">{t("dragHint")}</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="uncovered-title" className={`${CARD} ${uncovered.length > 0 ? "border-amber-200" : ""}`}>
          <h3 id="uncovered-title" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">{t("uncoveredTitle", { count: uncovered.length })}</h3>
          {uncovered.length === 0 ? <p className="mt-2 text-sm text-slate-600">{t("uncoveredNone")}</p> : null}
          <ul className="mt-2 divide-y divide-slate-100">
            {uncovered.map((event) => (
              <li key={event.eventId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="min-w-0 text-sm"><span className="font-semibold text-slate-900">{event.title}</span> <span className="text-slate-500">· {dayLong.format(new Date(`${event.startsAt.slice(0, 10)}T00:00:00Z`))}</span></span>
                {ctx.canWrite ? (
                  <Link href={`${href(ctx, { month: addDays(event.startsAt.slice(0, 10), -3).slice(0, 7), newPost: addDays(event.startsAt.slice(0, 10), -3), event: event.eventId })}#post-editor`} className="inline-flex min-h-9 items-center rounded-full border border-dashed border-violet-300 bg-white px-3 text-xs font-semibold text-violet-800">{t("planForEvent")}</Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="campaigns-title" className={CARD}>
          <h3 id="campaigns-title" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">{t("campaignsTitle")}</h3>
          {ctx.campaigns.length === 0 ? <p className="mt-2 text-sm text-slate-600">{t("campaignsNone")}</p> : null}
          <ul className="mt-2 divide-y divide-slate-100">
            {ctx.campaigns.slice(0, 12).map((campaign) => (
              <li key={campaign.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <Link href={href(ctx, { month: (campaign.startsOn ?? ctx.today).slice(0, 7) })} className="min-w-0 font-semibold text-slate-900 underline-offset-4 hover:underline">{campaign.name}</Link>
                <span className="flex items-center gap-3 text-xs text-slate-500">
                  {campaign.startsOn ? `${dayLong.format(new Date(`${campaign.startsOn}T00:00:00Z`))}${campaign.endsOn && campaign.endsOn !== campaign.startsOn ? ` – ${dayLong.format(new Date(`${campaign.endsOn}T00:00:00Z`))}` : ""}` : null}
                  {ctx.canWrite ? (
                    <form action={deleteCampaignAction}>
                      <Hidden ctx={ctx} />
                      <input type="hidden" name="campaignId" value={campaign.id} />
                      <SubmitButton label={t("campaignDelete")} pendingLabel="…" className="text-xs text-slate-500 underline-offset-4 hover:underline" />
                    </form>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">{t("campaignDeleteHint")}</p>
        </section>
      </div>
    </div>
  );
}
