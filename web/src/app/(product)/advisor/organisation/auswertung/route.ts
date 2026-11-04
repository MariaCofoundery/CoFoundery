import { getLocale, getTranslations } from "next-intl/server";
import { attendanceCsv, buildProgramReport, parseReportRange, teamsCsv, type ReportCsvLabels } from "@/features/advisor/programReport";
import { getOrgReportRows } from "@/features/advisor/teamProgramData";
import { getPresentationLocale } from "@/i18n/presentationLocale";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * CSV der Auswertung. Dieselben Zeilen wie der Reiter "Auswertung" - welche Teams darin stehen,
 * entscheidet die Datenbank (get_org_report_*). Ohne Anmeldung oder ohne Organisation: leere Datei
 * gibt es nicht, sondern 401 bzw. eine Datei nur mit Kopfzeile.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get("org") ?? "";
  const kind = url.searchParams.get("kind") === "teams" ? "teams" : "attendance";
  if (!/^[0-9a-f-]{36}$/.test(orgId)) return new Response("Bad request", { status: 400 });

  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });

  const range = parseReportRange(url.searchParams.get("from") ?? undefined, url.searchParams.get("to") ?? undefined);
  const rows = await getOrgReportRows(client, orgId, range);
  const t = await getTranslations("advisor.programReport");
  const tProgram = await getTranslations("advisor.teamProgram");
  const locale = getPresentationLocale(await getLocale());
  const day = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" });
  const labels: ReportCsvLabels = {
    date: t("colDate"),
    event: t("colEvent"),
    kind: tProgram("planKind"),
    team: t("colTeam"),
    people: t("colPeople"),
    attendance: t("csvAttendance"),
    rsvpYes: t("csvRsvpYes"),
    rsvpNo: t("csvRsvpNo"),
    rsvpOpen: t("csvRsvpOpen"),
    checkIns: t("colCheckIns"),
    lastCheckIn: t("csvLastCheckIn"),
    nextCheckIn: t("csvNextCheckIn"),
    present: t("present"),
    absent: t("absent"),
    excused: t("excused"),
    unmarked: t("unmarked"),
    planned: t("planned"),
    unnamedTeam: tProgram("unnamedTeam"),
    kinds: { education: tProgram("kindEducation"), internal: tProgram("kindInternal"), external: tProgram("kindExternal") },
    formatDate: (iso) => day.format(new Date(iso)),
  };
  const now = new Date();
  const body =
    kind === "teams" ? teamsCsv(buildProgramReport(rows.attendance, rows.checkIns, now), labels) : attendanceCsv(rows.attendance, now, labels);
  const period = [range.from, range.to].filter(Boolean).join("_") || "gesamt";
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="auswertung-${t(kind === "teams" ? "fileTeams" : "fileAttendance")}-${period}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
