import { getFounderSetup } from "@/features/teams/founderSetupData";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_WORKSTYLE_INSTRUMENT } from "@/features/instruments/workstyle/current";
/** Each area retains its own completion and permission contract. No combined readiness. */
export async function TeamJourneyStatus({ teamId, userId }: { teamId: string; userId: string }) {
  const client = await createClient();
  const [work, venture, report, setup] = await Promise.all([
    client.from("assessments").select("submitted_at").eq("user_id", userId).eq("instrument_id", CURRENT_WORKSTYLE_INSTRUMENT).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    client.from("assessments").select("submitted_at").eq("user_id", userId).eq("instrument_id", "venture-alignment-v1").eq("venture_id", teamId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    client.rpc("get_workstyle_product_team_status", { p_team_id: teamId }),
    getFounderSetup(teamId, userId, client),
  ]);
  const status = (result: typeof work) => result.error ? "Status nicht verfügbar" : result.data?.submitted_at ? "Vorhanden" : result.data ? "In Arbeit" : "Noch offen";
  const setupStatus = !setup ? "Status nicht verfügbar" : setup.items.some(x => x.currentConfirmedRevision) ? "Bestätigte Themen vorhanden" : setup.items.some(x => x.rosterConfirmationMissing || x.pendingRevision || x.workStatus === "discussing") ? "In Klärung" : "Offen";
  const entries = [
    { name: "Deine Arbeitsweise", status: status(work), href: "/me/profile/workstyle" },
    { name: "Dein Venture Alignment", status: status(venture), href: `/founder-alignment/vorhaben?venture=${teamId}` },
    { name: "Euer Zusammenspiel", status: report.error ? "Status nicht verfügbar" : report.data === "available" ? "Verfügbar" : report.data === "share_missing" ? "Freigabe fehlt" : "Noch nicht verfügbar", href: `/teams/${teamId}/workstyle` },
    { name: "Founder Setup", status: setupStatus, href: `/teams/${teamId}/setup` },
  ];
  return <section className="grid gap-3 sm:grid-cols-2" aria-label="Eure nächsten Schritte">{entries.map(e => <div key={e.name} className="rounded-xl border border-slate-200 bg-white p-4"><Link className="font-medium underline" href={e.href}>{e.name}</Link><p className="mt-1 text-sm text-slate-600">{e.status}</p></div>)}</section>;
}
