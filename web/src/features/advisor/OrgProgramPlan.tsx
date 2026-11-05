import { getLocale, getTranslations } from "next-intl/server";
import {
  deleteProgramEventAction,
  saveProgramEventAction,
  setEventExpertsAction,
  setProgramAttendanceAction,
} from "@/features/advisor/teamProgramActions";
import { getEventAttendance, getEventRsvps, listEventExperts, listProgramExperts, type EventAttendanceRow, type EventExpert, type EventFormat, type EventRsvp, type ProgramEvent, type ProgramExpert } from "@/features/advisor/teamProgramData";
import { EventFormats } from "@/features/advisor/EventFormats";
import { EventFormFields } from "@/features/advisor/EventFormFields";
import { EventPostSuggestions } from "@/features/advisor/EventPostSuggestions";
import { PlanEventList } from "@/features/advisor/PlanEventList";
import type { PostTemplate } from "@/features/advisor/postPlanning";
import { teamraumHref } from "@/features/advisor/teamraumRoutes";
import { berlinDayOf } from "@/lib/berlinTime";
import { getPresentationLocale } from "@/i18n/presentationLocale";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/features/ui/SubmitButton";


/**
 * Programmplan der Organisation: Veranstaltungen anlegen, aendern, loeschen (Inhaber) und die
 * Teilnahme der Teams eintragen (Inhaber alle, Bezugspersonen die eigenen). Keine Zaehlung, keine Wertung.
 */
export async function OrgProgramPlan({
  orgId,
  isOwner,
  events,
  openEventId,
  exampleAttendance,
  exampleRsvps,
  exampleSpeakers,
  withSpeakers = true,
  formats = [],
  programChoices = [],
  countingRequirements = [],
  social = null,
  feedback = { created: null, postsCreated: null, postsError: false, formatError: false },
}: {
  orgId: string;
  isOwner: boolean;
  events: ProgramEvent[];
  openEventId: string | null;
  /** Nur die Beispiel-Vorschau: fertige Teilnahme-Zeilen, dann wird nichts aus der Datenbank gelesen. */
  exampleAttendance?: EventAttendanceRow[];
  /** Nur die Beispiel-Vorschau: fertige Zusagen (sonst keine). */
  exampleRsvps?: EventRsvp[];
  /** Nur die Beispiel-Vorschau: fertige Speaker-Zeilen und Auswahl, dann wird nichts aus der Datenbank gelesen. */
  exampleSpeakers?: { assigned: EventExpert[]; choices: ProgramExpert[] };
  /** Nur mit eingeschaltetem Bereich "Experten": sonst keine Speaker an Veranstaltungen. */
  withSpeakers?: boolean;
  /** Formate der Organisation (20270324120000). */
  formats?: EventFormat[];
  /** Teams fuer "ausgewaehlte Teams" (20270325120000). */
  programChoices?: { programId: string; name: string }[];
  /** Auflagen laufender Foerderungen, die Termine zaehlen - das Formular sagt, wofuer ein Termin zaehlt. */
  countingRequirements?: { title: string; grantName: string; formatId: string | null; eventKind: "education" | "internal" | "external" | null }[];
  /** Social Media zu den Veranstaltungen: nur fuer aktive Mitglieder (Teamraum). */
  social?: { templates: PostTemplate[]; postCounts: Map<string, number>; today: string } | null;
  feedback?: { created: number | null; postsCreated: number | null; postsError: boolean; formatError: boolean };
}) {
  const t = await getTranslations("advisor.teamProgram");
  const locale = getPresentationLocale(await getLocale());
  const format = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });
  const clock = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
  const now = Date.now();
  const upcoming = events.filter((event) => new Date(event.startsAt).getTime() >= now - 24 * 3600 * 1000);
  const past = events.filter((event) => !upcoming.includes(event)).reverse();
  // Die Teilnahme wird nur fuer die geoeffnete Veranstaltung gelesen.
  const attendance = exampleAttendance ?? (openEventId ? await getEventAttendance(await createClient(), openEventId) : []);
  // Die Zusagen der Teams (je Person, 20270307120000) - ebenso nur fuer die geoeffnete Veranstaltung.
  const rsvps = exampleAttendance ? (exampleRsvps ?? []) : openEventId ? await getEventRsvps(await createClient(), openEventId) : [];
  const rsvpSummary = {
    yes: rsvps.filter((row) => row.response === "yes").length,
    no: rsvps.filter((row) => row.response === "no").length,
    open: rsvps.filter((row) => row.response === null).length,
  };

  // Speaker sind nur fuer die Organisation da; Teams bekommen diese Seite nie.
  const supabase = exampleSpeakers || !withSpeakers ? null : await createClient();
  const assigned = exampleSpeakers?.assigned ?? (supabase ? await listEventExperts(supabase, orgId) : []);
  const choices = exampleSpeakers?.choices ?? (isOwner && supabase ? (await listProgramExperts(supabase, orgId)).filter((entry) => !entry.archived) : []);

  const renderEvent = (event: ProgramEvent) => (
    <li key={event.eventId} className="advisor-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-base font-semibold text-slate-950">{event.title}</span>
        <span className="text-sm text-slate-600">{format.format(new Date(event.startsAt))}{event.endsAt ? `–${clock.format(new Date(event.endsAt))}` : ""}</span>
      </div>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] text-slate-600">
        {event.formatLabel ? <span className="inline-flex h-6 items-center rounded-full bg-violet-50 px-2.5 text-xs font-semibold text-violet-900">{event.formatLabel}</span> : null}
        {event.audience === "internal" ? <span className="inline-flex h-6 items-center rounded-full bg-amber-100 px-2.5 text-xs font-semibold text-amber-900">{t("event.audience.internal")}</span> : null}
        {event.audience === "selected" ? (
          <span className="inline-flex h-6 items-center rounded-full bg-sky-50 px-2.5 text-xs font-semibold text-sky-900">
            {t("event.onlyFor", { teams: (event.programIds ?? []).map((id) => programChoices.find((program) => program.programId === id)?.name).filter(Boolean).join(", ") || "–" })}
          </span>
        ) : null}
        {event.mandatory ? <span className="inline-flex h-6 items-center rounded-full bg-slate-900 px-2.5 text-xs font-semibold text-white">{t("event.mandatory")}</span> : null}
        <span>
          {[t(`event.venue.${event.venue ?? "onsite"}`), event.location, event.host === "partner" ? t("event.hostPartner") : null].filter(Boolean).join(" · ")}
        </span>
        {social && (social.postCounts.get(event.eventId) ?? 0) > 0 ? (
          <a href={teamraumHref("social", orgId, { month: berlinDayOf(event.startsAt).slice(0, 7) })} className="font-semibold text-violet-800 underline-offset-4 hover:underline">
            {t("socialPlanned", { count: social.postCounts.get(event.eventId) ?? 0 })}
          </a>
        ) : null}
        {event.publicStatus ? <span className="text-xs font-semibold text-emerald-800">{t(`event.publicStatus.${event.publicStatus}`)}</span> : null}
      </p>
      {event.internalNote ? <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-950"><span className="font-semibold">{t("event.internalNoteShort")}: </span>{event.internalNote}</p> : null}
      {assigned.some((entry) => entry.eventId === event.eventId) ? (
        <p className="mt-2 text-sm text-slate-800">
          <span className="font-semibold">{t("planSpeakers")}: </span>
          {assigned.filter((entry) => entry.eventId === event.eventId).map((entry) => entry.name).join(", ")}
        </p>
      ) : null}
      <details className="mt-3" open={openEventId === event.eventId}>
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-violet-800">{t("planAttendance")}</summary>
        {openEventId === event.eventId ? (
          attendance.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">{t("planAttendanceEmpty")}</p>
          ) : (
            <>
            {rsvps.length > 0 ? (
              <p className="mt-2 text-sm text-slate-700">
                <span className="font-semibold">{t("planRsvpTitle")}: </span>
                {t("planRsvpSummary", rsvpSummary)}
              </p>
            ) : null}
            <ul className="mt-2 divide-y divide-slate-100">
              {attendance.map((row) => (
                <li key={row.programId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-slate-900">{row.teamName ?? t("unnamedTeam")}</span>
                    {rsvps.some((entry) => entry.programId === row.programId) ? (
                      <ul className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-600">
                        {rsvps
                          .filter((entry) => entry.programId === row.programId)
                          .map((entry) => (
                            <li key={entry.userId}>
                              {entry.name ?? t("unnamedPerson")}: {t(`rsvpState_${entry.response ?? "open"}`)}
                            </li>
                          ))}
                      </ul>
                    ) : null}
                  </div>
                  <form action={setProgramAttendanceAction} className="flex flex-wrap gap-1">
                    <input type="hidden" name="orgId" value={orgId} />
                    <input type="hidden" name="eventId" value={event.eventId} />
                    <input type="hidden" name="programId" value={row.programId} />
                    {(["present", "absent", "excused"] as const).map((status) => (
                      <button
                        key={status}
                        type="submit"
                        name="status"
                        value={row.status === status ? "" : status}
                        aria-pressed={row.status === status}
                        className={`inline-flex min-h-10 items-center rounded-full border px-3 text-xs font-semibold ${
                          row.status === status ? "border-violet-500 bg-violet-50 text-violet-900" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {t(`attend_${status}`)}
                      </button>
                    ))}
                  </form>
                </li>
              ))}
            </ul>
            </>
          )
        ) : (
          <a href={`/advisor/organisation?org=${encodeURIComponent(orgId)}&tab=plan&open=${event.eventId}`} className="mt-1 inline-flex min-h-11 items-center text-sm text-slate-600 underline underline-offset-4">{t("planAttendanceOpen")}</a>
        )}
      </details>
      {isOwner && withSpeakers ? (
        <details className="mt-1 border-t border-slate-100 pt-2">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-medium text-slate-500">{t("planSpeakersEdit")}</summary>
          {(() => {
            const mine = assigned.filter((entry) => entry.eventId === event.eventId);
            const options = [
              ...choices.map((entry) => ({ id: entry.expertId, label: entry.name, topic: entry.topic })),
              ...mine.filter((entry) => !choices.some((choice) => choice.expertId === entry.expertId)).map((entry) => ({ id: entry.expertId, label: entry.name, topic: entry.topic })),
            ];
            return options.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">{t("planSpeakersNone")}</p>
            ) : (
              <form action={setEventExpertsAction} className="mt-2 grid gap-2">
                <input type="hidden" name="orgId" value={orgId} />
                <input type="hidden" name="eventId" value={event.eventId} />
                <ul className="grid gap-1">
                  {options.map((option) => (
                    <li key={option.id}>
                      <label className="flex min-h-11 items-center gap-3 text-sm text-slate-900">
                        <input type="checkbox" name="expertId" value={option.id} defaultChecked={mine.some((entry) => entry.expertId === option.id)} className="size-5" />
                        <span>{option.label}{option.topic ? <span className="text-slate-600"> · {option.topic}</span> : null}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                <p className="text-xs leading-5 text-slate-600">{t("planSpeakersNote")}</p>
                <SubmitButton label={t("planSave")} pendingLabel="…" className="inline-flex min-h-11 w-fit items-center rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white" />
              </form>
            );
          })()}
        </details>
      ) : null}
      {isOwner ? (
        <details className="mt-1 border-t border-slate-100 pt-2">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-medium text-slate-500">{t("planEdit")}</summary>
          <form action={saveProgramEventAction} className="mt-2 grid gap-3">
            <input type="hidden" name="orgId" value={orgId} />
            <input type="hidden" name="eventId" value={event.eventId} />
            <EventFormFields event={event} formats={formats} programs={programChoices} requirements={countingRequirements} />
            <SubmitButton label={t("planSave")} pendingLabel="…" className="inline-flex min-h-11 w-fit items-center rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white" />
          </form>
          <form action={deleteProgramEventAction} className="mt-1">
            <input type="hidden" name="orgId" value={orgId} />
            <input type="hidden" name="eventId" value={event.eventId} />
            <SubmitButton label={t("planDelete")} pendingLabel="…" className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-rose-700 underline-offset-4 hover:underline" />
          </form>
        </details>
      ) : null}
    </li>
  );

  return (
    <section aria-labelledby="plan-title" className="grid gap-5">
      <div>
        <h2 id="plan-title" className="text-xl font-semibold text-slate-950">{t("planTitleH")}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("planText")}</p>
        <p className="mt-2 max-w-2xl rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">{t("planAttendanceNote")}</p>
      </div>
      {feedback.created ? <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{t("bulk.created", { count: feedback.created })}</p> : null}
      {isOwner ? (
        <div className="grid gap-3">
          {/* Mehrere auf einmal (05.11.2026): tippen oder diktieren, Vorschlaege pruefen, anlegen. */}
          <details open={events.length === 0} className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
            <summary className="inline-flex min-h-11 cursor-pointer items-center text-[15px] font-semibold text-violet-900">{t("bulk.heading")}</summary>
            <p className="mb-3 text-[14px] leading-6 text-slate-700">{t("bulk.text")}</p>
            <PlanEventList orgId={orgId} today={new Date().toISOString().slice(0, 10)} formats={formats} />
          </details>
          <details className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4">
            <summary className="inline-flex min-h-11 cursor-pointer items-center text-[15px] font-semibold text-slate-900">{t("planNew")}</summary>
            <form action={saveProgramEventAction} className="mt-3 grid gap-3">
              <input type="hidden" name="orgId" value={orgId} />
              <EventFormFields formats={formats} programs={programChoices} requirements={countingRequirements} />
              <SubmitButton label={t("event.save")} pendingLabel="…" className="brand-cta inline-flex min-h-12 w-fit items-center rounded-xl px-6 text-[15px] font-semibold" />
            </form>
          </details>
          <details open={feedback.formatError} className="rounded-2xl border border-slate-200 bg-white/70 p-4">
            <summary className="inline-flex min-h-11 cursor-pointer items-center text-[15px] font-semibold text-slate-900">{t("formats.title", { count: formats.length })}</summary>
            <div className="mt-2">
              <EventFormats orgId={orgId} formats={formats} isOwner={isOwner} back="plan" error={feedback.formatError} />
            </div>
          </details>
        </div>
      ) : null}
      {social && upcoming.length > 0 ? (
        <section id="plan-social" aria-labelledby="plan-social-title" className="scroll-mt-24 rounded-[18px] border border-slate-200 bg-white p-5">
          <h3 id="plan-social-title" className="text-[17px] font-semibold text-slate-950">{t("social.title")}</h3>
          <p className="mt-1 max-w-2xl text-[14px] leading-6 text-slate-700">{t("social.text")}</p>
          {feedback.postsCreated ? <p role="status" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">{t("social.created", { count: feedback.postsCreated })} <a href={teamraumHref("social", orgId)} className="font-semibold underline underline-offset-2">{t("social.open")}</a></p> : null}
          {feedback.postsError ? <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800">{t("social.error")}</p> : null}
          <div className="mt-4">
            <EventPostSuggestions
              orgId={orgId}
              back="plan"
              today={social.today}
              locale={locale}
              events={upcoming
                .filter((event) => (social.postCounts.get(event.eventId) ?? 0) === 0 && berlinDayOf(event.startsAt) <= new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10))
                .slice(0, 12)
                .map((event) => ({ eventId: event.eventId, title: event.title, day: berlinDayOf(event.startsAt) }))}
              templates={social.templates}
              templatesHref={`${teamraumHref("social", orgId)}#post-templates`}
            />
          </div>
        </section>
      ) : null}
      {events.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-600">{t("planEmpty")}</p> : null}
      {upcoming.length > 0 ? <ul className="grid gap-3">{upcoming.map(renderEvent)}</ul> : null}
      {past.length > 0 ? (
        <>
          <h3 className="text-sm font-semibold text-slate-700">{t("planPast")}</h3>
          <ul className="grid gap-3">{past.map(renderEvent)}</ul>
        </>
      ) : null}
    </section>
  );
}
