import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getOwnCapabilityEntries } from "@/features/capability/capabilityData";
import { getPersonStrengths } from "@/features/capability/strengthData";
import {
  VENTURE_ALIGNMENT_INSTRUMENT_ID,
  VENTURE_TRADEOFFS_INSTRUMENT_ID,
} from "@/features/instruments/instruments";
import { CURRENT_WORKSTYLE_INSTRUMENT } from "@/features/instruments/workstyle/current";
import type { AssessmentRow, ModuleContext, TradeoffAnswerRow } from "@/features/modules/types";
import { getAboutYouFacts } from "@/features/profile/aboutYouData";
import { loadTradeoffsReadiness } from "@/features/modules/tradeoffs/teamData";
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
 *   - Vorhaben: die Abfrage von `loadTeamJourneyStatus` (neueste Zeile je
 *     Vorhaben und Instrument) plus die neueste ABGEGEBENE Zeile - ein
 *     abgeschlossener Stand bleibt gueltig, auch neben einem neuen Entwurf.
 *   - Workstyle: ob das aktuelle Instrument je abgegeben wurde, aus demselben
 *     Grund.
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
  options: {
    ventureId?: string | null;
    teamId?: string | null;
    /** Fuer die Teaser-Zeilen abgeschlossener Vertiefungen - ohne sie gibt es keine. */
    translate?: ModuleContext["translate"];
    locale?: ModuleContext["locale"];
  } = {}
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
  if (options.translate) context.translate = options.translate;
  if (options.locale) context.locale = options.locale;

  // Das aktuelle Workstyle-Instrument: wurde je abgegeben? (`AboutYouFacts` sieht nur die neueste Zeile.)
  try {
    const { data, error } = await client
      .from("assessments")
      .select("submitted_at")
      .eq("user_id", userId)
      .eq("instrument_id", CURRENT_WORKSTYLE_INSTRUMENT)
      .not("submitted_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    context.workstyleSubmitted = error ? null : Boolean(data);
  } catch {
    context.workstyleSubmitted = null;
  }

  if (options.ventureId) {
    context.ventureId = options.ventureId;
    const ventureId = options.ventureId;

    // Die neueste Zeile UND die neueste abgegebene (oft dieselbe): ein
    // abgeschlossener Stand bleibt gueltig, auch neben einem neuen Entwurf.
    // Jede Kette nennt ihr Instrument - Venture Alignment und „Werte &
    // Zielkonflikte" teilen sich eine Speicherfamilie, aber nie einen Leser.
    const rowsOf = async (instrumentId: string): Promise<readonly AssessmentRow[] | null> => {
      const query = (onlySubmitted: boolean) => {
        let chain = client
          .from("assessments")
          .select("id, instrument_id, venture_id, submitted_at, created_at")
          .eq("user_id", userId)
          .eq("instrument_id", instrumentId)
          .eq("venture_id", ventureId);
        if (onlySubmitted) chain = chain.not("submitted_at", "is", null);
        return chain.order("created_at", { ascending: false }).limit(1).maybeSingle();
      };
      try {
        const [latest, submitted] = await Promise.all([query(false), query(true)]);
        if (latest.error || submitted.error) return null;
        const found = [latest.data, submitted.data].filter(Boolean) as AssessmentRow[];
        return found.filter(
          (row, index) => found.findIndex((other) => other.created_at === row.created_at && other.submitted_at === row.submitted_at) === index
        );
      } catch {
        return null;
      }
    };

    context.ventureAssessments = await rowsOf(VENTURE_ALIGNMENT_INSTRUMENT_ID);

    const tradeoffs = await rowsOf(VENTURE_TRADEOFFS_INSTRUMENT_ID);
    context.tradeoffsAssessments = tradeoffs;
    // Die eigene Freigabe-Lage kommt von der Datenbank (nur lesen; ueber andere Personen gibt sie nichts her).
    context.tradeoffsReadiness = await loadTradeoffsReadiness(client, ventureId);

    // Die Antworten der neuesten abgegebenen Fassung - fuer die kurzen Zeilen im Profil.
    const abgegeben = tradeoffs
      ?.filter((row) => row.submitted_at)
      .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))[0];
    if (abgegeben?.id) {
      try {
        const { data, error } = await client
          .from("alignment_answers")
          .select("block_id, value, missing_code")
          .eq("assessment_id", abgegeben.id);
        context.tradeoffsAnswers = error ? null : ((data ?? []) as TradeoffAnswerRow[]);
      } catch {
        context.tradeoffsAnswers = null;
      }
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
