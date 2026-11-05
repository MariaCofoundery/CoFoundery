import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { listFundingSnapshots, listGrants, loadFunding } from "@/features/advisor/fundingData";
import type { FundingReport, Grant } from "@/features/advisor/fundingModel";
import { getOrgTeamPrograms } from "@/features/advisor/teamProgramData";

/**
 * Der Bericht fuer Druckansicht und CSV: der aktuelle Stand, oder ein festgehaltener (?snapshot=).
 * Was die Person nicht sehen darf, liefert die Datenbank nicht - festgehaltene Staende nur der Fuehrung.
 */
export async function fundingReportFor(
  client: SupabaseClient,
  orgId: string,
  grantId: string,
  snapshotId: string | null,
  unnamedTeam: string,
): Promise<{ grant: Grant; report: FundingReport; takenAt: string | null; note: string | null } | null> {
  const grant = (await listGrants(client, orgId)).find((entry) => entry.id === grantId);
  if (!grant) return null;
  if (snapshotId) {
    const snapshot = (await listFundingSnapshots(client, grant.id)).find((entry) => entry.id === snapshotId);
    return snapshot ? { grant, report: snapshot.report, takenAt: snapshot.takenAt, note: snapshot.note } : null;
  }
  const programs = await getOrgTeamPrograms(client, orgId);
  const teamNames = new Map(programs.map((program) => [program.programId, program.teamName ?? unnamedTeam]));
  const { report } = await loadFunding(client, grant, teamNames, new Date().toISOString().slice(0, 10));
  return { grant, report, takenAt: null, note: null };
}
