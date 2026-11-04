import { getLocale, getTranslations } from "next-intl/server";
import { buildProgramReport, type AttendanceStatus, type EventKind } from "@/features/advisor/programReport";
import { getOrgReportRows } from "@/features/advisor/teamProgramData";
import { getPresentationLocale } from "@/i18n/presentationLocale";
import { createClient } from "@/lib/supabase/server";

const TH = "whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-[.08em] text-slate-500";
const TD = "whitespace-nowrap px-3 py-2 text-sm text-slate-800";
const NUM = `${TD} tabular-nums`;

/** Berliner Datum als YYYY-MM-DD, n Tage zurueck. */
const berlinDay = (daysBack: number) => {
  const date = new Date(Date.now() - daysBack * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(date);
};

/**
 * Auswertung fuer die Organisation: Veranstaltungen, Teilnahme, Zusagen und Gespraeche als Zaehlwerte,
 * mit Zeitraum und CSV. Welche Teams darin stehen, entscheidet die Datenbank (Inhaber alle, Bezugspersonen
 * die eigenen). Keine Quote, keine Rangfolge.
 */
export async function OrgProgramReport({
  orgId,
  isOwner,
  range,
}: {
  orgId: string;
  isOwner: boolean;
  range: { from: string | null; to: string | null };
}) {
  const t = await getTranslations("advisor.programReport");
  const tProgram = await getTranslations("advisor.teamProgram");
  const locale = getPresentationLocale(await getLocale());
  const rows = await getOrgReportRows(await createClient(), orgId, range);
  const report = buildProgramReport(rows.attendance, rows.checkIns, new Date());

  const day = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });
  const dayOf = (value: string | null) => (value ? day.format(new Date(`${value}T00:00:00Z`)) : "–");
  const when = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });
  const eventDay = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "Europe/Berlin" });
  const kindLabel = (kind: EventKind) => tProgram(kind === "internal" ? "kindInternal" : kind === "external" ? "kindExternal" : "kindEducation");
  const statusLabel = (status: AttendanceStatus | null) => t(status ?? "unmarked");

  const link = (from: string | null, to: string | null, extra: Record<string, string> = {}) => {
    const params = new URLSearchParams({ org: orgId, tab: "report", ...extra });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return params.toString();
  };
  const presets = [
    { key: "rangeAll", from: null, to: null },
    { key: "last30", from: berlinDay(29), to: berlinDay(0) },
    { key: "last90", from: berlinDay(89), to: berlinDay(0) },
  ] as const;
  const rangeText =
    range.from && range.to
      ? t("rangeBetween", { from: dayOf(range.from), to: dayOf(range.to) })
      : range.from
        ? t("rangeFrom", { from: dayOf(range.from) })
        : range.to
          ? t("rangeTo", { to: dayOf(range.to) })
          : t("rangeAll");
  const download = (kind: "attendance" | "teams") => {
    const params = new URLSearchParams({ org: orgId, kind });
    if (range.from) params.set("from", range.from);
    if (range.to) params.set("to", range.to);
    return `/advisor/organisation/auswertung?${params.toString()}`;
  };
  const held = report.events.filter((event) => event.held);
  const tracked = report.totals.checkIns !== null;

  return (
    <section aria-labelledby="report-title" className="grid gap-5">
      <div>
        <h2 id="report-title" className="text-xl font-semibold text-slate-950">{t("title")}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("text")}</p>
        <p className="mt-1 text-xs text-slate-500">{t(isOwner ? "scopeOwner" : "scopeContact")}</p>
      </div>

      <form method="get" action="/advisor/organisation" className="advisor-card grid gap-3 p-4">
        <input type="hidden" name="org" value={orgId} />
        <input type="hidden" name="tab" value="report" />
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">{t("rangeTitle")}</h3>
          <p className="text-sm text-slate-600">{rangeText}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) => {
            const on = preset.from === range.from && preset.to === range.to;
            return (
              <a
                key={preset.key}
                href={`/advisor/organisation?${link(preset.from, preset.to)}`}
                aria-current={on ? "true" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${on ? "border-violet-500 bg-violet-50 text-violet-900" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
              >
                {t(preset.key)}
              </a>
            );
          })}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label>
            <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{t("from")}</span>
            <input type="date" name="from" defaultValue={range.from ?? ""} className="mt-1 min-h-11 rounded-xl border border-slate-300 px-3 text-sm" />
          </label>
          <label>
            <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{t("to")}</span>
            <input type="date" name="to" defaultValue={range.to ?? ""} className="mt-1 min-h-11 rounded-xl border border-slate-300 px-3 text-sm" />
          </label>
          <button type="submit" className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white">{t("apply")}</button>
        </div>
      </form>

      {report.totals.teams === 0 && report.events.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-600">{t("empty")}</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: t("totalTeams"), value: report.totals.teams, note: null },
              { label: t("totalPeople"), value: report.totals.people, note: null },
              { label: t("totalEvents"), value: report.totals.eventsHeld, note: t("totalEventsNote", { planned: report.totals.eventsPlanned }) },
              tracked
                ? { label: t("totalCheckIns"), value: report.totals.checkIns, note: t("totalCheckInsNote", { teams: report.totals.teamsWithCheckIn ?? 0 }) }
                : { label: t("totalCheckIns"), value: null, note: t("checkInsOff") },
            ].map((tile) => (
              <div key={tile.label} className="advisor-card p-4">
                <dt className="text-xs font-semibold uppercase tracking-[.1em] text-slate-500">{tile.label}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-slate-950">{tile.value ?? "–"}</dd>
                {tile.note ? <dd className="mt-0.5 text-xs leading-5 text-slate-600">{tile.note}</dd> : null}
              </div>
            ))}
          </dl>

          {held.length > 0 ? (
            <div className="advisor-card p-4">
              <h3 className="text-sm font-semibold text-slate-900">{t("attendanceTitle")}</h3>
              <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-800">
                {(["present", "absent", "excused", "unmarked"] as const).map((key) => (
                  <li key={key}>
                    {t(key)}: <span className="font-semibold tabular-nums">{report.totals.attendance[key]}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs leading-5 text-slate-500">{t("attendanceNote")}</p>
            </div>
          ) : null}

          {report.teams.length > 0 ? (
            <div className="advisor-card p-4">
              <h3 className="text-sm font-semibold text-slate-900">{t("teamsTitle")}</h3>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead>
                    <tr>
                      <th scope="col" className={TH}>{t("colTeam")}</th>
                      <th scope="col" className={TH}>{t("colPeople")}</th>
                      <th scope="col" className={TH}>{t("present")}</th>
                      <th scope="col" className={TH}>{t("absent")}</th>
                      <th scope="col" className={TH}>{t("excused")}</th>
                      <th scope="col" className={TH}>{t("unmarked")}</th>
                      {tracked ? (
                        <>
                          <th scope="col" className={TH}>{t("colCheckIns")}</th>
                          <th scope="col" className={TH}>{t("colLast")}</th>
                          <th scope="col" className={TH}>{t("colNext")}</th>
                        </>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.teams.map((team) => (
                      <tr key={team.programId}>
                        <th scope="row" className={`${TD} text-left font-medium`}>{team.teamName ?? tProgram("unnamedTeam")}</th>
                        <td className={NUM}>{team.members}</td>
                        <td className={NUM}>{team.attendance.present}</td>
                        <td className={NUM}>{team.attendance.absent}</td>
                        <td className={NUM}>{team.attendance.excused}</td>
                        <td className={NUM}>{team.attendance.unmarked}</td>
                        {tracked ? (
                          <>
                            <td className={NUM}>{team.checkIns ?? "–"}</td>
                            <td className={TD}>{dayOf(team.lastHeldOn)}</td>
                            <td className={TD}>{dayOf(team.nextOn)}</td>
                          </>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div className="advisor-card p-4">
            <h3 className="text-sm font-semibold text-slate-900">{t("eventsTitle")}</h3>
            {report.events.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">{t("emptyEvents")}</p>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead>
                    <tr>
                      <th scope="col" className={TH}>{t("colDate")}</th>
                      <th scope="col" className={TH}>{t("colEvent")}</th>
                      <th scope="col" className={TH}>{t("colTeams")}</th>
                      <th scope="col" className={TH}>{t("present")}</th>
                      <th scope="col" className={TH}>{t("absent")}</th>
                      <th scope="col" className={TH}>{t("excused")}</th>
                      <th scope="col" className={TH}>{t("unmarked")}</th>
                      <th scope="col" className={TH}>{t("colRsvp")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.events.map((event) => (
                      <tr key={event.eventId}>
                        <td className={TD}>{when.format(new Date(event.startsAt))}</td>
                        <th scope="row" className={`${TD} text-left font-medium`}>
                          {event.title}
                          <span className="block text-xs font-normal text-slate-500">{kindLabel(event.kind)}{event.held ? "" : ` · ${t("planned")}`}</span>
                        </th>
                        <td className={NUM}>{event.teams}</td>
                        {event.held ? (
                          <>
                            <td className={NUM}>{event.attendance.present}</td>
                            <td className={NUM}>{event.attendance.absent}</td>
                            <td className={NUM}>{event.attendance.excused}</td>
                            <td className={NUM}>{event.attendance.unmarked}</td>
                          </>
                        ) : (
                          <td colSpan={4} className={`${TD} text-slate-500`}>{t("planned")}</td>
                        )}
                        <td className={TD}>{t("rsvpCell", event.rsvp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {held.length > 0 && report.teams.length > 0 ? (
            <details className="advisor-card p-4">
              <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-900">{t("matrixTitle")}</summary>
              <p className="text-xs leading-5 text-slate-500">{t("matrixText")}</p>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead>
                    <tr>
                      <th scope="col" className={TH}>{t("colTeam")}</th>
                      {held.map((event) => (
                        <th key={event.eventId} scope="col" className={`${TH} normal-case tracking-normal`}>
                          {event.title}
                          <span className="block font-normal text-slate-400">{eventDay.format(new Date(event.startsAt))}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.teams.map((team) => (
                      <tr key={team.programId}>
                        <th scope="row" className={`${TD} text-left font-medium`}>{team.teamName ?? tProgram("unnamedTeam")}</th>
                        {held.map((event) => (
                          <td key={event.eventId} className={`${TD} ${team.byEvent[event.eventId] ? "" : "text-slate-500"}`}>
                            {event.eventId in team.byEvent ? statusLabel(team.byEvent[event.eventId]) : "–"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ) : null}

          <div className="advisor-card p-4">
            <h3 className="text-sm font-semibold text-slate-900">{t("downloadTitle")}</h3>
            <ul className="mt-2 grid gap-1">
              <li><a href={download("attendance")} className="inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 underline underline-offset-4">{t("downloadAttendance")}</a></li>
              <li><a href={download("teams")} className="inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 underline underline-offset-4">{t("downloadTeams")}</a></li>
            </ul>
            <p className="mt-1 text-xs leading-5 text-slate-500">{t("downloadNote")}</p>
          </div>
        </>
      )}
    </section>
  );
}
