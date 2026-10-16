/**
 * FIND Matching v0.1 – globale Shadow-Auswertung (E2) gegen eine Datenbank.
 *
 *   npm run matching:find-shadow-eval                          lokal, alle aktiven Founder als Betrachter
 *   npm run matching:find-shadow-eval -- --viewers=50          höchstens 50 Betrachter (deterministisch nach ID)
 *   npm run matching:find-shadow-eval -- --page-size=12
 *   npm run matching:find-shadow-eval -- --confirm-remote=<host>   nötig für jede nicht-lokale Datenbank
 *
 * Liest mit dem Dienstschlüssel (web/.env.local) die Matching-Population einmal und
 * rechnet je Betrachter Gate, globales Ranking und den Vergleich mit der heutigen Suche
 * (Nachbildung von search_by_frame). Ausgegeben werden NUR aggregierte Kennzahlen:
 * keine IDs, Namen, Kriterien, Orte, Texte oder Capability-Werte. Nichts wird gespeichert.
 *
 * Doku: docs/research/matching-v0.1-find-shadow.md
 */
import { createClient } from "@supabase/supabase-js";

import { isLocalSupabaseUrl } from "@/features/auth/devLogin";
import { loadFindMatchingPopulation } from "@/features/discovery/findMatchingGlobalShadow";
import { evaluateFindShadowPopulation } from "@/features/discovery/findShadowEvaluation";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.length > 0 ? rest.join("=") : "true"] as const;
  }),
);
const known = new Set(["viewers", "page-size", "confirm-remote"]);
for (const key of args.keys()) if (!known.has(key)) throw new Error(`Unbekannte Option --${key}`);

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
if (!url || !serviceKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY fehlen (web/.env.local).");

const host = new URL(url).host;
if (!isLocalSupabaseUrl(url) && args.get("confirm-remote") !== host) {
  throw new Error(
    [
      "",
      "  ABGEBROCHEN. Die Datenbank ist nicht lokal:",
      `    ${host}`,
      "  Eine Auswertung echter FIND-Daten ist eine bewusste Entscheidung.",
      `  Wer das will, bestätigt den Host ausdrücklich: --confirm-remote=${host}`,
      "",
    ].join("\n"),
  );
}

const pageSize = Number(args.get("page-size") ?? 12);
const maxViewers = args.has("viewers") ? Number(args.get("viewers")) : null;
if (!Number.isInteger(pageSize) || pageSize < 1) throw new Error("--page-size muss eine positive ganze Zahl sein");
if (maxViewers !== null && (!Number.isInteger(maxViewers) || maxViewers < 1)) throw new Error("--viewers muss eine positive ganze Zahl sein");

const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const started = Date.now();
const population = await loadFindMatchingPopulation(client);
const loadedMs = Date.now() - started;
const founders = [...population.profiles.keys()].filter((id) => population.founders.has(id)).sort();
const viewerIds = maxViewers === null ? founders : founders.slice(0, maxViewers);
const aggregate = evaluateFindShadowPopulation(population, { viewerIds, pageSize });

console.log(
  JSON.stringify(
    {
      database: isLocalSupabaseUrl(url) ? "lokal" : host,
      population: { activeFindProfiles: population.profiles.size, queries: population.queryCount, loadMs: loadedMs },
      evaluationMs: Date.now() - started - loadedMs,
      pageSize,
      ...aggregate,
    },
    null,
    2,
  ),
);
