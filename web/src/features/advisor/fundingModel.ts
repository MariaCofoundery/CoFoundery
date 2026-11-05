/**
 * Foerderauflagen (seit 05.11.2026): aus Auflagen, gezaehltem Stand und Nachweisen wird der Bericht.
 *
 * Nur reine Funktionen. Dieselbe Form (FundingReport) zeigt der Reiter, druckt der Sachbericht,
 * schreibt die CSV - und wird beim "Stand festhalten" gespeichert. Ein festgehaltener Stand sieht
 * deshalb spaeter genauso aus wie damals, auch wenn Programme inzwischen geendet haben.
 *
 * Keine Prozente, keine Ampel: "6 von 8", "erfuellt", "noch offen".
 */

export const REQUIREMENT_KINDS = ["once", "count", "per_team"] as const;
export type RequirementKind = (typeof REQUIREMENT_KINDS)[number];
export const REQUIREMENT_MEASURES = ["manual", "events", "teams", "event_attendance", "check_ins"] as const;
export type RequirementMeasure = (typeof REQUIREMENT_MEASURES)[number];
export const EVENT_KINDS = ["education", "internal", "external"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

/** Welche Zaehlung zu welcher Art passt - dieselbe Regel wie advisor_org_requirements_measure. */
export const MEASURES_OF_KIND: Record<RequirementKind, RequirementMeasure[]> = {
  once: ["manual"],
  count: ["manual", "events", "teams"],
  per_team: ["manual", "event_attendance", "check_ins"],
};

export type Grant = {
  id: string;
  orgId: string;
  name: string;
  funder: string | null;
  reference: string | null;
  startsOn: string;
  endsOn: string;
  notes: string | null;
};

export type Requirement = {
  id: string;
  grantId: string;
  title: string;
  kind: RequirementKind;
  measure: RequirementMeasure;
  eventKind: EventKind | null;
  /** Seit 20270325120000: nur Termine dieses Formats ("6 Masterclasses"). */
  formatId: string | null;
  target: number | null;
  unit: string | null;
  dueOn: string | null;
  notes: string | null;
  sortOrder: number;
};

export type ProgressRow = {
  requirementId: string;
  programId: string | null;
  teamName: string | null;
  autoValue: number;
  manualValue: number;
  tasksDone: number;
};

export type RequirementEntry = {
  id: string;
  requirementId: string;
  programId: string | null;
  doneOn: string;
  amount: number;
  note: string | null;
  createdByUserId: string | null;
};

export type FundingSnapshot = { id: string; takenAt: string; note: string | null; report: FundingReport };

export type ReportTeam = { programId: string; name: string; achieved: number; fulfilled: boolean };
export type ReportEvidence = { doneOn: string; amount: number; note: string | null; teamName: string | null };
export type ReportRequirement = {
  id: string;
  title: string;
  kind: RequirementKind;
  measure: RequirementMeasure;
  eventKind: EventKind | null;
  target: number | null;
  unit: string | null;
  dueOn: string | null;
  notes: string | null;
  /** Fuer die Organisation (bei "je Team": Summe ueber die sichtbaren Teams). */
  achieved: number;
  fulfilled: boolean;
  overdue: boolean;
  teams: ReportTeam[];
  evidence: ReportEvidence[];
};
export type FundingReport = {
  grant: { name: string; funder: string | null; reference: string | null; startsOn: string; endsOn: string };
  /** Bis zu welchem Tag gezaehlt wurde (heute, hoechstens das Ende der Laufzeit). */
  countedUntil: string;
  requirements: ReportRequirement[];
};

export const isRequirementKind = (value: unknown): value is RequirementKind => (REQUIREMENT_KINDS as readonly unknown[]).includes(value);
export const isRequirementMeasure = (value: unknown): value is RequirementMeasure => (REQUIREMENT_MEASURES as readonly unknown[]).includes(value);
export const isEventKind = (value: unknown): value is EventKind => (EVENT_KINDS as readonly unknown[]).includes(value);

/** Zahlen mit hoechstens zwei Nachkommastellen, ohne Rundungsrauschen (2.5 + 0.1). */
const tidy = (value: number) => Math.round(value * 100) / 100;

export function buildFundingReport(
  grant: Grant,
  requirements: Requirement[],
  rows: ProgressRow[],
  entries: RequirementEntry[],
  teamNames: Map<string, string>,
  today: string,
): FundingReport {
  const countedUntil = today < grant.endsOn ? today : grant.endsOn;
  const ordered = [...requirements].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "de"));
  return {
    grant: { name: grant.name, funder: grant.funder, reference: grant.reference, startsOn: grant.startsOn, endsOn: grant.endsOn },
    countedUntil,
    requirements: ordered.map((requirement) => {
      const mine = rows.filter((row) => row.requirementId === requirement.id);
      const evidence = entries
        .filter((entry) => entry.requirementId === requirement.id)
        .sort((a, b) => (a.doneOn < b.doneOn ? -1 : a.doneOn > b.doneOn ? 1 : 0))
        .map((entry) => ({ doneOn: entry.doneOn, amount: entry.amount, note: entry.note, teamName: entry.programId ? teamNames.get(entry.programId) ?? null : null }));
      const target = requirement.target;
      let achieved = 0;
      let fulfilled = false;
      let teams: ReportTeam[] = [];
      if (requirement.kind === "once") {
        const org = mine.find((row) => row.programId === null);
        fulfilled = Boolean(org && (org.manualValue > 0 || org.tasksDone > 0));
        achieved = fulfilled ? 1 : 0;
      } else if (requirement.kind === "count") {
        const org = mine.find((row) => row.programId === null);
        achieved = tidy((org?.autoValue ?? 0) + (org?.manualValue ?? 0));
        fulfilled = target !== null && achieved >= target;
      } else {
        teams = mine
          .filter((row): row is ProgressRow & { programId: string } => row.programId !== null)
          .map((row) => {
            const value = tidy(row.autoValue + row.manualValue);
            return { programId: row.programId, name: row.teamName ?? teamNames.get(row.programId) ?? "", achieved: value, fulfilled: target !== null && value >= target };
          })
          .sort((a, b) => a.name.localeCompare(b.name, "de"));
        achieved = tidy(teams.reduce((sum, team) => sum + team.achieved, 0));
        fulfilled = teams.length > 0 && teams.every((team) => team.fulfilled);
      }
      return {
        id: requirement.id,
        title: requirement.title,
        kind: requirement.kind,
        measure: requirement.measure,
        eventKind: requirement.eventKind,
        target,
        unit: requirement.unit,
        dueOn: requirement.dueOn,
        notes: requirement.notes,
        achieved,
        fulfilled,
        overdue: !fulfilled && requirement.dueOn !== null && requirement.dueOn < today,
        teams,
        evidence,
      };
    }),
  };
}

export const teamsFulfilled = (requirement: ReportRequirement) => requirement.teams.filter((team) => team.fulfilled).length;

export type FundingCsvLabels = {
  header: [string, string, string, string, string, string, string];
  kind: Record<RequirementKind, string>;
  fulfilled: string;
  open: string;
  allTeams: string;
};

const cell = (value: string | number | null) => {
  const text = value === null ? "" : String(value);
  // Formeln in Tabellenprogrammen nicht ausfuehren lassen.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[";\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};

/** Eine Zeile je Auflage, bei "je Team" zusaetzlich eine je Team. Semikolon, wie es deutsche Tabellen erwarten. */
export function fundingCsv(report: FundingReport, labels: FundingCsvLabels): string {
  const lines = [labels.header.map(cell).join(";")];
  for (const requirement of report.requirements) {
    lines.push(
      [requirement.title, labels.kind[requirement.kind], requirement.kind === "per_team" ? labels.allTeams : "", requirement.target, requirement.kind === "once" ? null : requirement.achieved, requirement.unit, requirement.fulfilled ? labels.fulfilled : labels.open]
        .map(cell)
        .join(";"),
    );
    for (const team of requirement.teams) {
      lines.push([requirement.title, labels.kind[requirement.kind], team.name, requirement.target, team.achieved, requirement.unit, team.fulfilled ? labels.fulfilled : labels.open].map(cell).join(";"));
    }
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** Ein gespeicherter Stand aus der Datenbank. Was nicht passt, wird nicht geraten. */
export function snapshotReportOf(data: unknown): FundingReport | null {
  if (!data || typeof data !== "object") return null;
  const report = data as Partial<FundingReport>;
  if (!report.grant || !Array.isArray(report.requirements) || typeof report.countedUntil !== "string") return null;
  return report as FundingReport;
}

export function grantOf(row: Record<string, unknown>): Grant {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    name: row.name as string,
    funder: (row.funder as string | null) ?? null,
    reference: (row.reference as string | null) ?? null,
    startsOn: row.starts_on as string,
    endsOn: row.ends_on as string,
    notes: (row.notes as string | null) ?? null,
  };
}

export function requirementOf(row: Record<string, unknown>): Requirement {
  return {
    id: row.id as string,
    grantId: row.grant_id as string,
    title: row.title as string,
    kind: isRequirementKind(row.kind) ? row.kind : "once",
    measure: isRequirementMeasure(row.measure) ? row.measure : "manual",
    eventKind: isEventKind(row.event_kind) ? row.event_kind : null,
    formatId: typeof row.format_id === "string" ? row.format_id : null,
    target: row.target === null || row.target === undefined ? null : Number(row.target),
    unit: (row.unit as string | null) ?? null,
    dueOn: (row.due_on as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    sortOrder: Number(row.sort_order ?? 0),
  };
}
