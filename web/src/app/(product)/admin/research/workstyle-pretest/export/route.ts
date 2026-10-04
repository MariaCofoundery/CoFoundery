import { requirePlatformAdmin } from "@/features/moderation/access";
import { workstyleLongExport } from "@/features/instruments/workstyle/analytics";
import type { ResearchRow } from "@/features/instruments/workstyle/data";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const version = new URL(request.url).searchParams.get("version") ?? "8.5a-v2";
  if (!["8.5a-v1", "8.5a-v2"].includes(version)) return new Response("Unbekannte Version", { status: 400 });
  const client = await requirePlatformAdmin();
  const { data, error } = await client.rpc("get_workstyle_research_dataset_version", { p_assessment_version: version });
  if (error) return new Response("Export nicht verfügbar", { status: 503, headers: { "Cache-Control": "no-store" } });
  return new Response(workstyleLongExport(data as ResearchRow[], version), { headers: {
    "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="workstyle-pretest-${version}-long.csv"`,
    "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
  } });
}
