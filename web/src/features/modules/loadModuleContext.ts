import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getOwnCapabilityEntries } from "@/features/capability/capabilityData";
import { getPersonStrengths } from "@/features/capability/strengthData";
import { VENTURE_ALIGNMENT_INSTRUMENT_ID } from "@/features/instruments/instruments";
import type { AssessmentRow, ModuleContext } from "@/features/modules/types";
import { getAboutYouFacts } from "@/features/profile/aboutYouData";
import { parseTeamReadiness } from "@/features/reporting/workstyle/teamReadiness";

/**
 * Laedt, was die Adapter brauchen - mit den Abfragen, die das Produkt heute
 * auch benutzt.
 *
 * NUR LESEN. Hier gibt es kein `insert`, `update`, `delete`, `upsert` und
 * keine schreibende RPC; ein Test haelt das fest. Die einzige RPC ist die
 * Lese-Auskunft, die die Teamseite ohnehin ruft.
 *
 * WIEDERVERWENDET STATT NACHGEBAUT:
 *   - Person-Fakten: `getAboutYouFacts` (zaehlt, laedt keine Antworten),
 *     gespeist wie auf `/profile` mit den eigenen Bereichen und der Stärkenliste.
 *   - Vorhaben: dieselbe Abfrage wie `loadTeamJourneyStatus` - neueste Zeile
 *     je Vorhaben und Instrument.
 *   - Teamfreigabe: `get_workstyle_team_share_readiness` mit
 *     `parseTeamReadiness`.
 *   - Capability-Freigabe: `person_core.capability_disclosure`, wie `/profile`.
 *
 * `core: null` an `getAboutYouFacts` beeinflusst nur die Station „Über dich"
 * (Identity), die kein Modul ist; kein Adapter liest sie.
 *
 * FEHLER: Wie im Produkt ueberleben die Person-Fakten einen Zaehlfehler
 * (`getAboutYouFacts` faengt ihn ab und zaehlt 0). Beim Vorhaben und bei der
 * Teamfreigabe wird ein Lesefehler als `null` gemeldet - nicht als „leer".
 */
export async function loadModuleContext(
  client: SupabaseClient,
  userId: string,
  options: { ventureId?: string | null; teamId?: string | null } = {}
): Promise<ModuleContext> {
  const [entries, strengths, disclosure] = await Promise.all([
    getOwnCapabilityEntries(client, userId),
    getPersonStrengths(client),
    (async () => {
      try {
        const { data } = await client
          .from("person_core")
          .select("capability_disclosure")
          .eq("user_id", userId)
          .maybeSingle();
        return (data?.capability_disclosure as string | undefined) ?? "private";
      } catch {
        return null;
      }
    })(),
  ]);

  const personFacts = await getAboutYouFacts(client, userId, {
    core: null,
    entries,
    strengthCount: strengths.length,
  });

  const context: ModuleContext = { personFacts, capabilityDisclosure: disclosure };

  if (options.ventureId) {
    context.ventureId = options.ventureId;
    try {
      const { data, error } = await client
        .from("assessments")
        .select("instrument_id, venture_id, submitted_at, created_at")
        .eq("user_id", userId)
        .eq("instrument_id", VENTURE_ALIGNMENT_INSTRUMENT_ID)
        .eq("venture_id", options.ventureId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      context.ventureAssessments = error ? null : data ? [data as AssessmentRow] : [];
    } catch {
      context.ventureAssessments = null;
    }
  }

  if (options.teamId) {
    try {
      const { data, error } = await client.rpc("get_workstyle_team_share_readiness", {
        p_team_id: options.teamId,
      });
      const readiness = error ? null : parseTeamReadiness(data);
      context.teamShare = readiness ? { teamId: options.teamId, active: readiness.viewer_team_share } : null;
    } catch {
      context.teamShare = null;
    }
  }

  return context;
}
