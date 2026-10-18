import { readFileSync, readdirSync } from "node:fs";

import type { CapabilityTerms } from "@/features/strengths/strengthAnalysisModel";
import { labelTokens, normalizeLabel } from "@/features/strengths/strengthAnalysisModel";

/**
 * Das Capability-Vokabular als SPERRLISTE für die Stärken-Auswertung.
 *
 * Gelesen aus denselben Dateien wie `capabilityVocabularyFromFiles.ts`: den
 * Migrationen (welcher Bereich zu welcher Gruppe gehört) und den
 * Sprachbundles (wie sie heißen), in BEIDEN Sprachen - eine Stärke auf
 * Englisch darf genauso wenig "Marketing & Brand" heißen.
 *
 * Es geht NIE in die Anweisung an das Modell - nur in die Prüfung danach.
 */

/**
 * Gruppen, deren Bereiche selbst Verhalten beschreiben ("Unangenehmes
 * ansprechen", "Moderation & Gespräche führen"). Ihre Wörter sind keine
 * Fachgebiete; gesperrt ist dort nur die wörtlich abgeschriebene
 * Bezeichnung.
 */
const BEHAVIOURAL_FAMILIES = new Set(["working_style", "communication_representation", "other"]);

const MIGRATION_DIR = "../supabase/migrations";

function areaFamilies(migrationDir: string) {
  const families = new Map<string, string>();
  for (const file of readdirSync(migrationDir).sort()) {
    if (!file.endsWith(".sql")) continue;
    const sql = readFileSync(`${migrationDir}/${file}`, "utf8");
    for (const block of sql.split("insert into public.capability_areas").slice(1)) {
      for (const row of block.match(/\('([a-z_0-9]+)', '([a-z_]+)', \d+\)/g) ?? []) {
        const [, area, family] = row.split("'");
        families.set(area!, family!);
      }
    }
  }
  return families;
}

export function readCapabilityTerms(options?: {
  migrationDir?: string;
  messageFiles?: string[];
}): CapabilityTerms {
  const familiesOfArea = areaFamilies(options?.migrationDir ?? MIGRATION_DIR);
  const exact = new Set<string>();
  const domain = new Set<string>();

  for (const file of options?.messageFiles ?? ["messages/de/capability.json", "messages/en/capability.json"]) {
    const bundle = JSON.parse(readFileSync(file, "utf8")) as {
      areaLabels: Record<string, string>;
      families: Record<string, string>;
    };
    for (const [familyId, label] of Object.entries(bundle.families)) {
      exact.add(normalizeLabel(label));
      if (!BEHAVIOURAL_FAMILIES.has(familyId)) labelTokens(label).forEach((token) => domain.add(token));
    }
    for (const [areaId, label] of Object.entries(bundle.areaLabels)) {
      exact.add(normalizeLabel(label));
      const family = familiesOfArea.get(areaId);
      if (family && !BEHAVIOURAL_FAMILIES.has(family)) labelTokens(label).forEach((token) => domain.add(token));
    }
  }

  return { exact, domain };
}
