import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { archiveProgramEventAction, createEventChecklistAction, setProgramAttendanceAction } from "@/features/advisor/teamProgramActions";
import { setEventContactsAction } from "@/features/advisor/partners/partnersActions";
import type { EventContacts } from "@/features/advisor/partners/partnersData";
import type { EventAttendanceRow, EventRsvp, ProgramEvent } from "@/features/advisor/teamProgramData";
import { EventPostSuggestions } from "@/features/advisor/EventPostSuggestions";
import { PANEL_TABS, calendarHref, tabParam, type PanelTab } from "@/features/advisor/calendar/calendarModel";
import { CHANNEL_STYLE, type OrgPost } from "@/features/advisor/socialCalendarModel";
import type { PostTemplate } from "@/features/advisor/postPlanning";
import type { OrgTask } from "@/features/advisor/teamraumModel";
import { teamraumHref } from "@/features/advisor/teamraumRoutes";
import { SidePanel } from "@/features/ui/SidePanel";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { berlinDayOf } from "@/lib/berlinTime";

type Requirement = { title: string; grantName: string; formatId: string | null; eventKind: "education" | "internal" | "external" | null };

/**
 * Das Panel eines Termins (Entwurf 05.11.2026): ein Klick im Kalender, auf Heute oder in der Aufgabe oeffnet immer
 * dasselbe - Posts mit "Vorlage anwenden", Aufgaben, Teilnahme und Details. Von hier fuehrt jeder Weg zum
 * Bearbeiten und zurueck. Am Rechner steht es neben dem Kalender, am Handy kommt es als Blatt von unten.
 */
export async function EventPanel({
  orgId,
  isOwner,
  canWrite,
  event,
  tab,
  locale,
  today,
  closeHref,
  extra,
  programs,
  posts,
  social,
  tasks,
  memberNames,
  attendance,
  rsvps,
  requirements,
  speakers,
  feedback,
}: {
  orgId: string;
  isOwner: boolean;
  canWrite: boolean;
  event: ProgramEvent;
  tab: PanelTab;
  locale: string;
  today: string;
  closeHref: string;
  /** Angaben, die beim Wechsel der Reiter mitgehen (Monat, Ansicht, Ebenen). */
  extra: Record<string, string>;
  programs: { programId: string; name: string }[];
  posts: OrgPost[];
  /** Nur fuer aktive Mitglieder: Vorlagen zum Anwenden. */
  social: { templates: PostTemplate[] } | null;
  tasks: OrgTask[];
  memberNames: Map<string, string>;
  attendance: EventAttendanceRow[];
  rsvps: EventRsvp[];
  requirements: Requirement[];
  /** Speaker aus der Liste "Partner" (nur fuer Mitglieder mit dem Recht "Personen"); sonst null. */
  speakers: EventContacts | null;
  feedback: { postsCreated: number | null; postsError: boolean; saved: boolean };
}) {
  const t = await getTranslations("advisor.calendar.panel");
  const tp = await getTranslations("advisor.teamProgram");
  const ts = await getTranslations("advisor.social");
  const day = berlinDayOf(event.startsAt);
  const internal = event.audience === "internal";
  const date = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "numeric", timeZone: "Europe/Berlin" });
  const clock = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
  const dayShort = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" });
  const when = `${date.format(new Date(event.startsAt))} · ${clock.format(new Date(event.startsAt))}${event.endsAt ? `–${clock.format(new Date(event.endsAt))}` : ""}`;
  const where = [tp(`event.venue.${event.venue ?? "onsite"}`), event.location].filter(Boolean).join(" · ");
  const who = [
    internal ? tp("event.audience.internal") : event.audience === "selected" ? tp("event.onlyFor", { teams: (event.programIds ?? []).map((id) => programs.find((program) => program.programId === id)?.name).filter(Boolean).join(", ") || "–" }) : tp("event.audience.all"),
    event.mandatory ? tp("event.mandatory") : tp("event.optional"),
  ].join(" · ");
  const panelHref = (next: PanelTab) => calendarHref(orgId, { ...extra, termin: event.eventId, reiter: tabParam(next) });
  const editHref = calendarHref(orgId, { ...extra, termin: event.eventId, bearbeiten: event.eventId });
  const tabLabels: Record<PanelTab, string> = {
    social: t("tabs.social"),
    tasks: `${t("tabs.tasks")}${tasks.length > 0 ? ` ${tasks.filter((task) => task.status === "done").length}/${tasks.length}` : ""}`,
    teams: t("tabs.teams"),
    details: t("tabs.details"),
  };
  const sortedPosts = [...posts].sort((a, b) => (a.plannedOn < b.plannedOn ? -1 : a.plannedOn > b.plannedOn ? 1 : 0));
  const counts = requirements.filter((entry) => (entry.formatId === null || entry.formatId === event.formatId) && (entry.eventKind === null || entry.eventKind === event.kind) && (entry.formatId !== null || entry.eventKind !== null));
  const mine = speakers?.assigned ?? [];
  const rsvpSummary = { yes: rsvps.filter((row) => row.response === "yes").length, no: rsvps.filter((row) => row.response === "no").length, open: rsvps.filter((row) => row.response === null).length };

  return (
    <SidePanel variant="column" closeHref={closeHref} closeLabel={t("close")} titleId="event-panel-title" eyebrow={event.formatLabel ?? t("noFormat")}>
      <div className="relative overflow-hidden bg-violet-50 px-5 pb-4 pt-2">
        <svg aria-hidden="true" width="160" height="120" viewBox="0 0 160 120" className="absolute -right-6 -top-7"><circle cx="100" cy="50" r="48" fill="#6D49E0" opacity="0.14" /><circle cx="56" cy="96" r="22" fill="#0A80B8" opacity="0.16" /></svg>
        <p className="relative text-[12.5px] font-semibold text-violet-900">{event.host === "partner" ? t("hostPartner") : t("hostUs")}</p>
        <h2 id="event-panel-title" className="font-brand relative mt-1 text-[25px] font-semibold leading-[1.15] text-slate-950">{event.title}</h2>
        <ul className="relative mt-3 grid gap-1.5 text-[14px] text-slate-800">
          <li className="flex items-center gap-2"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5B36D6" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>{when}</li>
          <li className="flex items-center gap-2"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5B36D6" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>{where}</li>
          <li className="flex items-center gap-2"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5B36D6" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /></svg>{who}</li>
        </ul>
        {isOwner ? (
          <div className="relative mt-3.5 flex flex-wrap gap-2">
            <Link href={editHref} className="inline-flex min-h-10 items-center gap-1.5 rounded-[11px] border border-violet-200 bg-white px-3.5 text-[13.5px] font-semibold text-slate-950 hover:bg-violet-50">
              <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z" /></svg>
              {t("edit")}
            </Link>
          </div>
        ) : null}
      </div>

      <nav aria-label={t("tabsLabel")} className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 [scrollbar-width:none]">
        {PANEL_TABS.map((entry) => (
          <Link
            key={entry}
            href={panelHref(entry)}
            aria-current={entry === tab ? "page" : undefined}
            className={`-mb-px inline-flex min-h-[46px] shrink-0 items-center whitespace-nowrap border-b-[2.5px] px-2.5 text-[14px] ${entry === tab ? "border-violet-600 font-semibold text-slate-950" : "border-transparent font-semibold text-slate-700 hover:text-slate-950"}`}
          >
            {tabLabels[entry]}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 px-5 pb-6 pt-4">
        {feedback.saved ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-900">{tp("planSaved")}</p> : null}

        {tab === "social" ? (
          <>
            {feedback.postsCreated ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-900">{tp("social.created", { count: feedback.postsCreated })}</p> : null}
            {feedback.postsError ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800">{tp("social.error")}</p> : null}
            {internal ? (
              <p className="text-[14px] leading-6 text-slate-700">{t("socialInternal")}</p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[14.5px] font-bold text-slate-950">{t("postsTitle", { count: sortedPosts.length })}</h3>
                  {canWrite ? <Link href={calendarHref(orgId, { ...extra, termin: event.eventId, neu: "post", tag: day })} className="text-[13px] font-semibold text-violet-800 underline-offset-4 hover:underline">+ {t("addPost")}</Link> : null}
                  <Link href={teamraumHref("social", orgId, { reiter: "vorlagen" })} className="text-[13px] font-semibold text-violet-800 underline-offset-4 hover:underline">{t("manageTemplates")}</Link>
                </div>
                {sortedPosts.length === 0 ? <p className="text-[14px] leading-6 text-slate-700">{t("noPosts")}</p> : null}
                <ol className="grid grid-cols-[minmax(0,1fr)] gap-2">
                  {sortedPosts.map((post) => {
                    const first = post.channels[0] ?? "other";
                    return (
                      <li key={post.id}>
                        <Link
                          href={calendarHref(orgId, { ...extra, termin: event.eventId, post: post.id })}
                          className={`flex items-center gap-3 rounded-[14px] border px-3 py-2.5 hover:bg-slate-50 ${post.status === "idea" ? "border-dashed border-pink-300" : "border-slate-200"}`}
                        >
                          <span className="flex h-[46px] w-[3.4rem] shrink-0 flex-col items-center justify-center rounded-[11px] bg-pink-100 px-1 text-center text-[11px] font-bold leading-[1.15] text-pink-900">{dayShort.format(new Date(`${post.plannedOn}T00:00:00Z`))}</span>
                          <span className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="truncate text-[14.5px] font-semibold text-slate-950">{post.title}</span>
                            <span className="flex flex-wrap gap-1.5">
                              {(post.channels.length ? post.channels : [first]).map((channel) => (
                                <span key={channel} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${CHANNEL_STYLE[channel].chip}`}>
                                  <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${CHANNEL_STYLE[channel].dot}`} />
                                  {ts(`channels.${channel}`)}
                                </span>
                              ))}
                            </span>
                          </span>
                          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-bold ${post.status === "idea" ? "bg-violet-100 text-violet-900" : post.status === "published" ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-800"}`}>{ts(`status.${post.status}`)}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
                {social && canWrite ? (
                  <details open={sortedPosts.length === 0} className="rounded-[16px] border border-violet-200 bg-violet-50/60 p-4">
                    <summary className="flex min-h-10 cursor-pointer items-center text-[14.5px] font-bold text-violet-950">{t("applyTitle")}</summary>
                    <p className="mb-3 mt-1 text-[13.5px] leading-6 text-slate-700">{t("applyText")}</p>
                    <EventPostSuggestions
                      // Neu aufbauen, wenn ein anderer Termin gewaehlt wird oder Posts angelegt wurden: Der Zustand
                      // (Zeilen, Haken) gehoert zu EINEM Termin - sonst legte "Uebernehmen" Posts fuer den vorigen an.
                      key={`${event.eventId}:${sortedPosts.length}`}
                      orgId={orgId}
                      back="calendar"
                      returnEventId={event.eventId}
                      compact
                      today={today}
                      locale={locale}
                      events={[{ eventId: event.eventId, title: event.title, day }]}
                      templates={social.templates}
                      templatesHref={teamraumHref("social", orgId, { reiter: "vorlagen" })}
                    />
                  </details>
                ) : null}
              </>
            )}
          </>
        ) : null}

        {tab === "tasks" ? (
          <>
            {tasks.length === 0 ? (
              <>
                <p className="text-[14px] leading-6 text-slate-700">{t("noTasks")}</p>
                {canWrite ? (
                  <form action={createEventChecklistAction}>
                    <input type="hidden" name="orgId" value={orgId} />
                    <input type="hidden" name="eventId" value={event.eventId} />
                    <input type="hidden" name="title" value={event.title} />
                    <input type="hidden" name="day" value={day} />
                    <SubmitButton label={t("createChecklist")} pendingLabel="…" className="inline-flex min-h-11 items-center rounded-xl bg-violet-100 px-4 text-[13.5px] font-bold text-violet-950 hover:bg-violet-200" />
                  </form>
                ) : null}
              </>
            ) : (
              <ul className="grid gap-3">
                {tasks.map((task) => {
                  const done = task.checklist.filter((item) => item.done).length;
                  return (
                    <li key={task.id} className="rounded-[14px] border border-slate-200 p-3.5">
                      <Link href={teamraumHref("tasks", orgId, { task: task.id })} className="text-[14.5px] font-semibold text-slate-950 underline-offset-4 hover:underline">{task.title}</Link>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-slate-700">
                        <span className={`rounded-full px-2 py-0.5 font-bold ${task.status === "done" ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-800"}`}>{t(`taskStatus.${task.status}`)}</span>
                        {task.dueOn ? <span>{t("due", { day: dayShort.format(new Date(`${task.dueOn}T00:00:00Z`)) })}</span> : null}
                        {task.assigneeUserIds.length > 0 ? <span>{task.assigneeUserIds.map((id) => memberNames.get(id) ?? "–").join(", ")}</span> : null}
                      </p>
                      {task.checklist.length > 0 ? (
                        <>
                          <p className="mt-2.5 text-[13px] font-semibold text-slate-800">{t("checklistProgress", { done, total: task.checklist.length })}</p>
                          <span aria-hidden="true" className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-200"><span className="block h-1.5 rounded-full bg-violet-600" style={{ width: `${Math.round((done / task.checklist.length) * 100)}%` }} /></span>
                          <ul className="mt-2 grid gap-1">
                            {task.checklist.map((item, index) => (
                              <li key={`${index}-${item.text}`} className="flex items-center gap-2 text-[13.5px]">
                                <span aria-hidden="true" className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 ${item.done ? "border-violet-600 bg-violet-600 text-white" : "border-slate-400"}`}>{item.done ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg> : null}</span>
                                <span className={item.done ? "text-slate-500 line-through" : "text-slate-900"}>{item.text}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
            {canWrite ? <Link href={teamraumHref("tasks", orgId, { new: "1", event: event.eventId })} className="text-[13.5px] font-bold text-violet-800 underline-offset-4 hover:underline">+ {t("addTask")}</Link> : null}
          </>
        ) : null}

        {tab === "teams" ? (
          internal ? (
            <p className="text-[14px] leading-6 text-slate-700">{t("teamsInternal")}</p>
          ) : attendance.length === 0 ? (
            <p className="text-[14px] leading-6 text-slate-700">{tp("planAttendanceEmpty")}</p>
          ) : (
            <>
              {rsvps.length > 0 ? (
                <p className="text-[14px] text-slate-800"><span className="font-semibold">{tp("planRsvpTitle")}: </span>{tp("planRsvpSummary", rsvpSummary)}</p>
              ) : null}
              <ul className="divide-y divide-slate-100">
                {attendance.map((row) => (
                  <li key={row.programId} className="grid gap-2 py-3">
                    <div className="min-w-0">
                      <span className="text-[14.5px] font-semibold text-slate-950">{row.teamName ?? tp("unnamedTeam")}</span>
                      {rsvps.some((entry) => entry.programId === row.programId) ? (
                        <ul className="mt-0.5 flex flex-wrap gap-x-3 text-[12.5px] text-slate-700">
                          {rsvps.filter((entry) => entry.programId === row.programId).map((entry) => <li key={entry.userId}>{entry.name ?? tp("unnamedPerson")}: {tp(`rsvpState_${entry.response ?? "open"}`)}</li>)}
                        </ul>
                      ) : null}
                    </div>
                    <form action={setProgramAttendanceAction} className="flex flex-wrap gap-1.5">
                      <input type="hidden" name="orgId" value={orgId} />
                      <input type="hidden" name="eventId" value={event.eventId} />
                      <input type="hidden" name="programId" value={row.programId} />
                      {(["present", "absent", "excused"] as const).map((status) => (
                        <button key={status} type="submit" name="status" value={row.status === status ? "" : status} aria-pressed={row.status === status} className={`inline-flex min-h-10 items-center rounded-full border-[1.5px] px-3.5 text-[13px] font-semibold ${row.status === status ? "border-violet-500 bg-violet-50 text-violet-900" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>
                          {tp(`attend_${status}`)}
                        </button>
                      ))}
                    </form>
                  </li>
                ))}
              </ul>
              <p className="text-[12.5px] leading-5 text-slate-600">{tp("planAttendanceNote")}</p>
            </>
          )
        ) : null}

        {tab === "details" ? (
          <>
            {event.notes ? <div className="grid gap-1"><h3 className="text-xs font-bold uppercase tracking-[0.05em] text-slate-600">{tp("event.notes")}</h3><p className="whitespace-pre-line text-[14px] leading-6 text-slate-900">{event.notes}</p></div> : null}
            {event.todos ? <div className="grid gap-1"><h3 className="text-xs font-bold uppercase tracking-[0.05em] text-slate-600">{tp("event.todos")}</h3><p className="whitespace-pre-line text-[14px] leading-6 text-slate-900">{event.todos}</p></div> : null}
            {event.internalNote ? <div className="grid gap-1 rounded-xl bg-amber-50 px-3.5 py-3"><h3 className="text-xs font-bold uppercase tracking-[0.05em] text-amber-900">{t("internalNote")}</h3><p className="text-[14px] leading-6 text-amber-950">{event.internalNote}</p></div> : null}
            <dl className="grid gap-2 text-[14px]">
              <div><dt className="inline font-bold">{t("publicLabel")}: </dt><dd className="inline">{event.publicStatus ? tp(`event.publicStatus.${event.publicStatus}`) : internal ? tp("event.publicInternal") : t("publicNot")}</dd></div>
              {requirements.length > 0 ? (
                <div><dt className="inline font-bold">{tp("event.fundingTitle")}: </dt><dd className="inline">{counts.length === 0 ? tp("event.fundingNone") : counts.map((entry) => tp("event.fundingCounts", { title: entry.title, grant: entry.grantName })).join(" · ")}</dd></div>
              ) : null}
              {mine.length > 0 ? <div><dt className="inline font-bold">{tp("planSpeakers")}: </dt><dd className="inline">{mine.map((entry) => (entry.role ? `${entry.name} (${entry.role})` : entry.name)).join(", ")}</dd></div> : null}
            </dl>
            {speakers ? (
              <details className="border-t border-slate-100 pt-2">
                <summary className="inline-flex min-h-11 cursor-pointer items-center text-[13.5px] font-semibold text-slate-700">{tp("planSpeakersEdit")}</summary>
                {speakers.choices.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-700">{tp("planSpeakersNone")}</p>
                ) : (
                  <form action={setEventContactsAction} className="mt-2 grid gap-2">
                    <input type="hidden" name="orgId" value={orgId} />
                    <input type="hidden" name="eventId" value={event.eventId} />
                    <ul className="grid gap-1">
                      {speakers.choices.map((option) => (
                        <li key={option.contactId}>
                          <label className="flex min-h-11 items-center gap-3 text-sm text-slate-900">
                            <input type="checkbox" name="contactId" value={option.contactId} defaultChecked={mine.some((entry) => entry.contactId === option.contactId)} className="size-5" />
                            <span>{option.name}{option.topic ? <span className="text-slate-700"> · {option.topic}</span> : null}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs leading-5 text-slate-700">{tp("planSpeakersNote")}</p>
                    <SubmitButton label={tp("planSave")} pendingLabel="…" className="inline-flex min-h-11 w-fit items-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white" />
                  </form>
                )}
              </details>
            ) : null}
            {isOwner ? (
              <details className="border-t border-slate-100 pt-2">
                <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-rose-700 underline-offset-4 hover:underline">{t("archiveTitle")}</summary>
                <form action={archiveProgramEventAction} className="mt-2 grid gap-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
                  <p className="text-[13.5px] leading-6 text-slate-800">{t("archiveText")}</p>
                  <input type="hidden" name="orgId" value={orgId} />
                  <input type="hidden" name="eventId" value={event.eventId} />
                  <SubmitButton label={t("archiveConfirm")} pendingLabel="…" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60" />
                </form>
              </details>
            ) : null}
          </>
        ) : null}
      </div>
    </SidePanel>
  );
}
