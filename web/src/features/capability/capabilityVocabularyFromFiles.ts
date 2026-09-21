import { readFileSync, readdirSync } from "node:fs";

import type { AnalyzableArea } from "./narrativeAnalysisModel";

/**
 * Das Vokabular aus den Dateien lesen - für Skripte ohne Datenbankzugang.
 *
 * WOFUER: Der KI-Arbeiter und die Auswertung (`scripts/ai-worker.ts`,
 * `scripts/ai-eval.ts`) brauchen die Liste der Bereiche mit ihren
 * Beschriftungen, um dem Modell zu sagen, worunter es einordnen darf. Beide
 * laufen als einfache Node-Skripte: Der Arbeiter ist ausdrücklich KEIN
 * Netzwerkmitglied und darf `capability_areas` nicht lesen (die Policy heißt
 * `capability_areas_select_members`), und die Auswertung läuft ganz ohne
 * Anmeldung.
 *
 * HERAUSGEZOGEN AM 21.09.2026, und zwar wegen eines Fehlers: `ai-eval.ts` las
 * die Bereiche aus EINER Migration (20260907160000). Damit fehlten dort die
 * fünf Bereiche der Familie "Außenauftritt & Moderation" aus 20261021120000 -
 * genau die, deren Unsichtbarkeit Maria als "das waren wirklich nur die Hard
 * Skills" gemeldet hat. Eine Auswertung, die eine Datei nennt, veraltet mit
 * der ersten Erweiterung des Vokabulars.
 *
 * Gelesen wird deshalb über ALLE Migrationen. Das ist langsamer und richtig.
 */

const MIGRATION_DIR = "../supabase/migrations";
const LABELS = "messages/de/capability.json";

/** Die area_ids, wie sie in den Migrationen eingefügt werden. */
export function readCapabilityAreaIds(migrationDir = MIGRATION_DIR): string[] {
  const ids: string[] = [];
  for (const file of readdirSync(migrationDir).sort()) {
    if (!file.endsWith(".sql")) continue;
    const sql = readFileSync(`${migrationDir}/${file}`, "utf8");
    for (const block of sql.split("insert into public.capability_areas").slice(1)) {
      for (const row of block.match(/\('([a-z_0-9]+)', '[a-z_]+', \d+\)/g) ?? []) {
        ids.push(row.split("'")[1]);
      }
    }
  }
  return [...new Set(ids)];
}

/**
 * Bereiche mit Beschriftung, wie das Modell sie braucht.
 *
 * OHNE BESCHRIFTUNG IST EIN BEREICH FUER EIN MODELL NICHTS. Am 21.09.2026 hat
 * die erste Auswertung nichts gefunden, weil dem Modell nur die Kennungen
 * gegeben wurden ("customer_discovery"); mit den deutschen Beschriftungen fand
 * dasselbe Modell 10 von 10. Ein Bereich ohne Beschriftung fällt deshalb auf -
 * er wird gemeldet, nicht stillschweigend als Kennung durchgereicht.
 */
export function readCapabilityAreas(options?: {
  migrationDir?: string;
  labelFile?: string;
}): { areas: AnalyzableArea[]; withoutLabel: string[] } {
  const ids = readCapabilityAreaIds(options?.migrationDir ?? MIGRATION_DIR);
  const labels = (
    JSON.parse(readFileSync(options?.labelFile ?? LABELS, "utf8")) as {
      areaLabels: Record<string, string>;
    }
  ).areaLabels;

  const areas = ids
    .filter((id) => id !== "other")
    .map((id) => ({ id, label: labels[id] ?? id }));

  return {
    areas,
    withoutLabel: areas.filter((area) => area.label === area.id).map((area) => area.id),
  };
}
