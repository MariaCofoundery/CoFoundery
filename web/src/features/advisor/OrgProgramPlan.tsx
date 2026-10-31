import { getLocale, getTranslations } from "next-intl/server";
import {
  deleteProgramEventAction,
  saveProgramEventAction,
  setProgramAttendanceAction,
} from "@/features/advisor/teamProgramActions";
import { getEventAttendance, type ProgramEvent } from "@/features/advisor/teamProgramData";
import { getPresentationLocale } from "@/i18n/presentationLocale";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/features/ui/SubmitButton";

const FIELD = "mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm";
const LABEL = "block text-xs font-semibold uppercase tracking-[.12em] text-slate-500";

/** Fuer das datetime-local-Feld: lokale Zeit ohne Sekunden. */
const localValue = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

type T = Awaited<ReturnType<typeof getTranslations>>;

function EventFields({ event, t }: { event?: ProgramEvent; t: T }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="sm:col-span-2">
        <span className={LABEL}>{t("planTitle")}</span>
        <input name="title" required maxLength={160} defaultValue={event?.title ?? ""} className={FIELD} />
      </label>
      <label>
        <span className={LABEL}>{t("planWhen")}</span>
        <input name="startsAt" type="datetime-local" required defaultValue={event ? localValue(event.startsAt) : ""} className={FIELD} />
      </label>
      <label>
        <span className={LABEL}>{t("planKind")}</span>
        <select name="kind" defaultValue={event?.kind ?? "education"} className={FIELD}>
          <option value="education">{t("kindEducation")}</option>
          <option value="internal">{t("kindInternal")}</option>
          <option value="external">{t("kindExternal")}</option>
        </select>
      </label>
      <label className="sm:col-span-2">
        <span className={LABEL}>{t("planLocation")}</span>
        <input name="location" maxLength={200} defaultValue={event?.location ?? ""} className={FIELD} />
      </label>
      <label className="sm:col-span-2">
        <span className={LABEL}>{t("planNotes")}</span>
        <textarea name="notes" rows={2} maxLength={2000} defaultValue={event?.notes ?? ""} className={`${FIELD} py-2`} />
      </label>
      <label className="sm:col-span-2">
        <span className={LABEL}>{t("planTodos")}</span>
        <textarea name="todos" rows={2} maxLength={2000} defaultValue={event?.todos ?? ""} className={`${FIELD} py-2`} />
      </label>
    </div>
  );
}

/**
 * Programmplan der Organisation: Veranstaltungen anlegen, aendern, loeschen (Inhaber) und die
 * Teilnahme der Teams eintragen (Inhaber alle, Bezugspersonen die eigenen). Keine Zaehlung, keine Wertung.
 */
export async function OrgProgramPlan({
  orgId,
  isOwner,
  events,
  openEventId,
}: {
  orgId: string;
  isOwner: boolean;
  events: ProgramEvent[];
  openEventId: string | null;
}) {
  const t = await getTranslations("advisor.teamProgram");
  const locale = getPresentationLocale(await getLocale());
  const format = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const client = await createClient();
  const now = Date.now();
  const upcoming = events.filter((event) => new Date(event.startsAt).getTime() >= now - 24 * 3600 * 1000);
  const past = events.filter((event) => !upcoming.includes(event)).reverse();
  // Die Teilnahme wird nur fuer die geoeffnete Veranstaltung gelesen.
  const attendance = openEventId ? await getEventAttendance(client, openEventId) : [];

  const renderEvent = (event: ProgramEvent) => (
    <li key={event.eventId} className="advisor-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-base font-semibold text-slate-950">{event.title}</span>
        <span className="text-sm text-slate-600">{format.format(new Date(event.startsAt))}</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {t(event.kind === "internal" ? "kindInternal" : event.kind === "external" ? "kindExternal" : "kindEducation")}
        {event.location ? ` · ${event.location}` : ""}
      </p>
      <details className="mt-3" open={openEventId === event.eventId}>
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-violet-800">{t("planAttendance")}</summary>
        {openEventId === event.eventId ? (
          attendance.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">{t("planAttendanceEmpty")}</p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {attendance.map((row) => (
                <li key={row.programId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="text-sm font-medium text-slate-900">{row.teamName ?? t("unnamedTeam")}</span>
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
          )
        ) : (
          <a href={`/advisor/organisation?org=${encodeURIComponent(orgId)}&tab=plan&open=${event.eventId}`} className="mt-1 inline-flex min-h-11 items-center text-sm text-slate-600 underline underline-offset-4">{t("planAttendanceOpen")}</a>
        )}
      </details>
      {isOwner ? (
        <details className="mt-1 border-t border-slate-100 pt-2">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-medium text-slate-500">{t("planEdit")}</summary>
          <form action={saveProgramEventAction} className="mt-2 grid gap-3">
            <input type="hidden" name="orgId" value={orgId} />
            <input type="hidden" name="eventId" value={event.eventId} />
            <EventFields event={event} t={t} />
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
      {isOwner ? (
        <details open={events.length === 0} className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-900">{t("planNew")}</summary>
          <form action={saveProgramEventAction} className="mt-3 grid gap-3">
            <input type="hidden" name="orgId" value={orgId} />
            <EventFields t={t} />
            <SubmitButton label={t("planSave")} pendingLabel="…" className="inline-flex min-h-11 w-fit items-center rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white" />
          </form>
        </details>
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
