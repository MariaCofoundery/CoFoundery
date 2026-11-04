/**
 * Auswertung fuer die Organisation (Wunsch von Maria, Feedback 04.11.2026): wie viele
 * Veranstaltungen, wer wo da war, wie viele Gespraeche.
 *
 * Reine Umformung der Zeilen aus `get_org_report_attendance` und `get_org_report_check_ins`
 * (20270308120000). Welche Teams darin stehen, entscheidet die Datenbank.
 *
 * Bewusst nur Zaehlwerte: keine Quote, keine Rangfolge, Teams in alphabetischer Reihenfolge.
 * Eine Anwesenheitsquote je Team waere eine Note fuer Menschen - und wer nicht eingetragen ist,
 * ist nicht "nicht da", sondern eben nicht eingetragen.
 */

export type AttendanceStatus = "present" | "absent" | "excused";
export type EventKind = "education" | "internal" | "external";

export type ReportAttendanceRow = {
  eventId: string;
  title: string;
  kind: EventKind;
  startsAt: string;
  programId: string;
  teamName: string | null;
  members: number;
  attendance: AttendanceStatus | null;
  rsvpYes: number;
  rsvpNo: number;
};

export type ReportCheckInRow = {
  programId: string;
  teamName: string | null;
  members: number;
  /** null: Gespraeche werden in dieser Organisation nicht erfasst (Erfolge aus). */
  checkIns: number | null;
  lastHeldOn: string | null;
  nextOn: string | null;
};

type Tally = { present: number; absent: number; excused: number; unmarked: number };
const emptyTally = (): Tally => ({ present: 0, absent: 0, excused: 0, unmarked: 0 });
const count = (tally: Tally, status: AttendanceStatus | null) => {
  tally[status ?? "unmarked"] += 1;
};

export type ReportEvent = {
  eventId: string;
  title: string;
  kind: EventKind;
  startsAt: string;
  /** Hat schon stattgefunden - erst dann gibt es Anwesenheit. */
  held: boolean;
  teams: number;
  attendance: Tally;
  rsvp: { yes: number; no: number; open: number };
};

export type ReportTeam = {
  programId: string;
  teamName: string | null;
  members: number;
  /** Nur ueber stattgefundene Veranstaltungen. */
  attendance: Tally;
  checkIns: number | null;
  lastHeldOn: string | null;
  nextOn: string | null;
  /** Je stattgefundener Veranstaltung der Eintrag - "wer wo". Fehlt: zaehlte fuer das Team nicht. */
  byEvent: Record<string, AttendanceStatus | null>;
};

export type ProgramReport = {
  totals: {
    teams: number;
    people: number;
    eventsHeld: number;
    eventsPlanned: number;
    attendance: Tally;
    /** null, wenn Gespraeche nicht erfasst werden. */
    checkIns: number | null;
    teamsWithCheckIn: number | null;
  };
  events: ReportEvent[];
  teams: ReportTeam[];
};

const byName = (a: { teamName: string | null; programId: string }, b: { teamName: string | null; programId: string }) =>
  (a.teamName ?? "￿").localeCompare(b.teamName ?? "￿", "de") || a.programId.localeCompare(b.programId);

export function buildProgramReport(
  attendanceRows: ReportAttendanceRow[],
  checkInRows: ReportCheckInRow[],
  now: Date
): ProgramReport {
  const teams = new Map<string, ReportTeam>();
  for (const row of checkInRows) {
    teams.set(row.programId, {
      programId: row.programId,
      teamName: row.teamName,
      members: row.members,
      attendance: emptyTally(),
      checkIns: row.checkIns,
      lastHeldOn: row.lastHeldOn,
      nextOn: row.nextOn,
      byEvent: {},
    });
  }

  const events = new Map<string, ReportEvent>();
  for (const row of attendanceRows) {
    const held = new Date(row.startsAt).getTime() <= now.getTime();
    const event =
      events.get(row.eventId) ??
      ({
        eventId: row.eventId,
        title: row.title,
        kind: row.kind,
        startsAt: row.startsAt,
        held,
        teams: 0,
        attendance: emptyTally(),
        rsvp: { yes: 0, no: 0, open: 0 },
      } satisfies ReportEvent);
    events.set(row.eventId, event);
    event.teams += 1;
    event.rsvp.yes += row.rsvpYes;
    event.rsvp.no += row.rsvpNo;
    event.rsvp.open += Math.max(0, row.members - row.rsvpYes - row.rsvpNo);
    if (!held) continue;
    count(event.attendance, row.attendance);
    // Ein Team aus der Teilnahme, das bei den Gespraechen fehlt, kann es nicht geben (gleiche Sichtregel) -
    // falls doch, erscheint es trotzdem, statt still zu verschwinden.
    const team =
      teams.get(row.programId) ??
      ({ programId: row.programId, teamName: row.teamName, members: row.members, attendance: emptyTally(), checkIns: null, lastHeldOn: null, nextOn: null, byEvent: {} } satisfies ReportTeam);
    teams.set(row.programId, team);
    count(team.attendance, row.attendance);
    team.byEvent[row.eventId] = row.attendance;
  }

  const eventList = [...events.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.eventId.localeCompare(b.eventId));
  const teamList = [...teams.values()].sort(byName);
  const attendance = emptyTally();
  for (const event of eventList) {
    for (const key of Object.keys(attendance) as (keyof Tally)[]) attendance[key] += event.attendance[key];
  }
  const tracked = teamList.some((team) => team.checkIns !== null);

  return {
    totals: {
      teams: teamList.length,
      people: teamList.reduce((sum, team) => sum + team.members, 0),
      eventsHeld: eventList.filter((event) => event.held).length,
      eventsPlanned: eventList.filter((event) => !event.held).length,
      attendance,
      checkIns: tracked ? teamList.reduce((sum, team) => sum + (team.checkIns ?? 0), 0) : null,
      teamsWithCheckIn: tracked ? teamList.filter((team) => (team.checkIns ?? 0) > 0).length : null,
    },
    events: eventList,
    teams: teamList,
  };
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

/**
 * Semikolon und BOM: So oeffnet Excel die Datei in deutscher Einstellung direkt in Spalten.
 * Werte, die wie eine Formel beginnen, bekommen ein Hochkomma - ein Teamname "=HYPERLINK(...)"
 * soll in der Tabelle Text bleiben.
 */
const cell = (value: string | number | null) => {
  if (value === null) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const csv = (rows: (string | number | null)[][]) => "﻿" + rows.map((row) => row.map(cell).join(";")).join("\r\n") + "\r\n";

export type ReportCsvLabels = {
  date: string;
  event: string;
  kind: string;
  team: string;
  people: string;
  attendance: string;
  rsvpYes: string;
  rsvpNo: string;
  rsvpOpen: string;
  checkIns: string;
  lastCheckIn: string;
  nextCheckIn: string;
  present: string;
  absent: string;
  excused: string;
  unmarked: string;
  planned: string;
  unnamedTeam: string;
  kinds: Record<EventKind, string>;
  formatDate: (iso: string) => string;
};

/** Eine Zeile je Veranstaltung und Team: wer wo, mit Zusagen. */
export function attendanceCsv(rows: ReportAttendanceRow[], now: Date, labels: ReportCsvLabels) {
  const status = (row: ReportAttendanceRow) =>
    new Date(row.startsAt).getTime() > now.getTime() ? labels.planned : labels[row.attendance ?? "unmarked"];
  return csv([
    [labels.date, labels.event, labels.kind, labels.team, labels.people, labels.attendance, labels.rsvpYes, labels.rsvpNo, labels.rsvpOpen],
    ...rows.map((row) => [
      labels.formatDate(row.startsAt),
      row.title,
      labels.kinds[row.kind],
      row.teamName ?? labels.unnamedTeam,
      row.members,
      status(row),
      row.rsvpYes,
      row.rsvpNo,
      Math.max(0, row.members - row.rsvpYes - row.rsvpNo),
    ]),
  ]);
}

/** Eine Zeile je Team: Teilnahme ueber stattgefundene Veranstaltungen und Gespraeche. */
export function teamsCsv(report: ProgramReport, labels: ReportCsvLabels) {
  const withCheckIns = report.totals.checkIns !== null;
  return csv([
    [
      labels.team,
      labels.people,
      labels.present,
      labels.absent,
      labels.excused,
      labels.unmarked,
      ...(withCheckIns ? [labels.checkIns, labels.lastCheckIn, labels.nextCheckIn] : []),
    ],
    ...report.teams.map((team) => [
      team.teamName ?? labels.unnamedTeam,
      team.members,
      team.attendance.present,
      team.attendance.absent,
      team.attendance.excused,
      team.attendance.unmarked,
      ...(withCheckIns ? [team.checkIns, team.lastHeldOn, team.nextOn] : []),
    ]),
  ]);
}

/** Zeitraum aus der Adresse: nur gueltige Daten, "bis" nie vor "von". */
export function parseReportRange(from: string | undefined, to: string | undefined) {
  const valid = (value: string | undefined) =>
    value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ? value : null;
  const start = valid(from);
  const end = valid(to);
  return start && end && end < start ? { from: end, to: start } : { from: start, to: end };
}
