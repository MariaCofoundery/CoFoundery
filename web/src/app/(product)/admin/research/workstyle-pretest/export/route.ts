import { requirePlatformAdmin } from "@/features/moderation/access";
import { workstyleLongExport } from "@/features/instruments/workstyle/analytics";
import type { ResearchRow } from "@/features/instruments/workstyle/data";

export const dynamic = "force-dynamic";
export async function GET() {
  const client = await requirePlatformAdmin();
  const { data, error } = await client.rpc("get_workstyle_research_dataset");
  if (error) return new Response("Export nicht verfügbar", { status: 503, headers: { "Cache-Control": "no-store" } });
  return new Response(workstyleLongExport(data as ResearchRow[]), { headers: {
    "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="workstyle-pretest-8.5a-v1-long.csv"',
    "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
  } });
}
