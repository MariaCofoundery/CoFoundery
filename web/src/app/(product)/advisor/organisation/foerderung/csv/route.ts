import { getTranslations } from "next-intl/server";
import { fundingCsv, type FundingCsvLabels } from "@/features/advisor/fundingModel";
import { createClient } from "@/lib/supabase/server";
import { fundingReportFor } from "../fundingReportSource";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/;

/** CSV zum Sachbericht - dieselben Zahlen wie die Druckansicht, aktuell oder festgehalten. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get("org") ?? "";
  const grantId = url.searchParams.get("grant") ?? "";
  const snapshot = url.searchParams.get("snapshot");
  if (!UUID.test(orgId) || !UUID.test(grantId)) return new Response("Bad request", { status: 400 });

  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });

  const t = await getTranslations("advisor.funding");
  const tProgram = await getTranslations("advisor.teamProgram");
  const data = await fundingReportFor(client, orgId, grantId, snapshot && UUID.test(snapshot) ? snapshot : null, tProgram("unnamedTeam"));
  if (!data) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

  const labels: FundingCsvLabels = {
    header: [t("csv.requirement"), t("csv.kind"), t("csv.team"), t("csv.target"), t("csv.achieved"), t("csv.unit"), t("csv.status")],
    kind: { once: t("kinds.once"), count: t("kinds.count"), per_team: t("kinds.per_team") },
    fulfilled: t("fulfilled"),
    open: t("open"),
    allTeams: t("csv.allTeams"),
  };
  const stamp = (data.takenAt ?? new Date().toISOString()).slice(0, 10);
  return new Response(fundingCsv(data.report, labels), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="foerderauflagen-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
