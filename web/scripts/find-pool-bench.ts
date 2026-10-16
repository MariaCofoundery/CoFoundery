/**
 * FIND Matching v0.1 – Laufzeit des produktionsfähigen Pools (E3a), NUR LOKAL.
 *
 *   npm run matching:find-pool-bench                 5 Betrachter (deterministisch nach ID)
 *   npm run matching:find-pool-bench -- --viewers=20
 *
 * Misst je Betrachter getrennt: Basispool, Inputs, Bereichsfamilien, Aufbau der
 * Population, Engine (Gate + Ranking, ein Durchlauf je Paar), Pagination, Laden der
 * Karten für die 12 IDs der ersten Seite (lokal über den Service-Client mit denselben
 * Spalten wie der RLS-Lader - eine Annäherung) und Gesamtzeit; dazu einmal den
 * E2-Lader (ganze Population) zum Vergleich. Ausgabe nur Kennzahlen (Mediane, Bytes,
 * Abfragen) - keine IDs, keine Inhalte. Für synthetische lokale Daten gedacht; gegen
 * eine nicht-lokale Datenbank bricht das Skript ab.
 */
import { createClient } from "@supabase/supabase-js";

import { isLocalSupabaseUrl } from "@/features/auth/devLogin";
import { loadFindMatchingPopulation, paginateFindShadow, runGlobalFindMatchingShadow } from "@/features/discovery/findMatchingGlobalShadow";
import { loadFindMatchingPool } from "@/features/discovery/findMatchingPool";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.length > 0 ? rest.join("=") : "true"] as const;
  }),
);
for (const key of args.keys()) if (key !== "viewers") throw new Error(`Unbekannte Option --${key}`);

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
if (!url || !serviceKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY fehlen (web/.env.local).");
if (!isLocalSupabaseUrl(url)) throw new Error("ABGEBROCHEN: Messungen nur gegen eine lokale Datenbank mit synthetischen Daten.");

const viewersWanted = Number(args.get("viewers") ?? 5);
const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length === 0 ? 0 : Math.round((s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) * 10) / 10;
};

// Vergleich: E2-Lader (ganze Population, PostgREST-Blöcke)
const heapBefore = process.memoryUsage().heapUsed;
const e2Start = performance.now();
const e2 = await loadFindMatchingPopulation(client);
const e2Ms = performance.now() - e2Start;
const viewers = [...e2.profiles.keys()].filter((id) => e2.founders.has(id)).sort().slice(0, viewersWanted);

const stages: Record<string, number[]> = { poolMs: [], inputsMs: [], areasMs: [], assemblyMs: [], engineMs: [], paginationMs: [], pageDetailMs: [], totalMs: [] };
const CARD_COLUMNS =
  "id, user_id, display_name, headline, bio, own_roles, seeking_roles, own_role_other, seeking_role_other, expertise, industries, " +
  "location_region, remote_mode, availability_hours_per_week, availability_flexibility, availability_condition, recent_step, " +
  "commitment_level, venture_stage, venture_goal, search_intent, start_horizon, status, published_at, created_at, updated_at";
const sizes = { poolBytes: [] as number[], inputBytes: [] as number[], poolCandidates: [] as number[], ranked: [] as number[], queries: [] as number[] };
for (const viewerUserId of viewers) {
  const start = performance.now();
  const load = await loadFindMatchingPool(client, { kind: "service", viewerUserId });
  if (!load.population) continue;
  const e0 = performance.now();
  const run = runGlobalFindMatchingShadow(load.population, viewerUserId);
  const e1 = performance.now();
  const page = paginateFindShadow(run.ranked, 1);
  const e2End = performance.now();
  const pageIds = page.items.map((r) => load.population!.profiles.get(r.result.subject.b)!.id);
  const { error: detailError } = await client.from("founder_discovery_profiles").select(CARD_COLUMNS).in("id", pageIds).eq("status", "active");
  if (detailError) throw new Error("Kartenabfrage fehlgeschlagen");
  const e3End = performance.now();
  stages.poolMs.push(load.timings.poolMs);
  stages.inputsMs.push(load.timings.inputsMs);
  stages.areasMs.push(load.timings.areasMs);
  stages.assemblyMs.push(load.timings.assemblyMs);
  stages.engineMs.push(e1 - e0);
  stages.paginationMs.push(e2End - e1);
  stages.pageDetailMs.push(e3End - e2End);
  stages.totalMs.push(e3End - start);
  sizes.poolBytes.push(load.payloadBytes.pool);
  sizes.inputBytes.push(load.payloadBytes.inputs);
  sizes.poolCandidates.push(load.population.profiles.size - 1);
  sizes.ranked.push(page.totalEligible);
  sizes.queries.push(load.population.queryCount);
}

console.log(
  JSON.stringify(
    {
      database: "lokal",
      activeFindProfiles: e2.profiles.size,
      viewersMeasured: stages.totalMs.length,
      e3aMedianMs: Object.fromEntries(Object.entries(stages).map(([k, v]) => [k, median(v)])),
      e3aMedian: Object.fromEntries(Object.entries(sizes).map(([k, v]) => [k, median(v)])),
      e2PopulationLoad: { ms: Math.round(e2Ms), queries: e2.queryCount },
      heapMbAfter: Math.round((process.memoryUsage().heapUsed - heapBefore) / 1e5) / 10,
    },
    null,
    2,
  ),
);
