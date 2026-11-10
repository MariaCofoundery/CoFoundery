import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { berlinToday } from "@/lib/berlinTime";
import { createClient } from "@/lib/supabase/server";
import { loadContentReport } from "@/features/advisor/contentReport/contentReportData";
import { parseReportFilters, toCsv } from "@/features/advisor/contentReport/contentReportModel";
import { buildReportTable } from "@/features/advisor/contentReport/contentReportTable";
import { getRequestLocale } from "@/i18n/getLocale";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Content-Report als CSV. Wer nicht angemeldet oder kein Mitglied ist, bekommt nichts (Zeilensicherheit der Tabellen). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get("org") ?? "";
  if (!UUID.test(orgId)) return new NextResponse("Not found", { status: 404 });
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { data: allowed } = await client.rpc("org_has_right", { p_org_id: orgId, p_right: "results" });
  if (allowed !== true) return new NextResponse("Not found", { status: 404 });
  const [t, locale] = await Promise.all([getTranslations("advisor.contentReport"), getRequestLocale()]);
  const filters = parseReportFilters(Object.fromEntries(url.searchParams), berlinToday());
  const data = await loadContentReport(client, orgId, t("unnamed"));
  const table = buildReportTable(filters.area, data, filters, (key, values) => t(key, values), locale, () => "");
  return new NextResponse(toCsv(table), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="content-report-${filters.area}.csv"`,
      "cache-control": "no-store",
    },
  });
}
