import { MODULE_DEFINITIONS } from "@/features/modules/definitions";
import type { ModuleDefinition, ModuleVersion } from "@/features/modules/types";
import { assertModuleRegistry } from "@/features/modules/validate";
import { FOUNDER_SETUP_ITEM_KEYS } from "@/features/teams/founderSetupCatalog";

/**
 * Die Modul-Registry - Code, keine Datenbank.
 *
 * Wie die Instrument-Registries wird sie beim Laden geprueft: Ein Vertrag, der
 * in sich nicht stimmt, soll nicht erst in einer Oberflaeche auffallen. Die
 * Sprachtexte prueft ein Test (er liest die Message-Dateien).
 *
 * KEINE DB-SPIEGELUNG. Eine Tabelle `module_versions` entsteht erst, wenn ein
 * DB-seitiges Gate sie braucht (Phase E).
 */
export const MODULE_REGISTRY: readonly ModuleDefinition[] = assertModuleRegistry(MODULE_DEFINITIONS, {
  setupItemKeys: FOUNDER_SETUP_ITEM_KEYS,
});

export function getModuleDefinition(moduleId: string): ModuleDefinition | null {
  return MODULE_REGISTRY.find((def) => def.moduleId === moduleId) ?? null;
}

export function getModuleVersion(moduleId: string, versionId: string): ModuleVersion | null {
  return getModuleDefinition(moduleId)?.versions.find((v) => v.versionId === versionId) ?? null;
}

/** Zu welcher Modulversion ein Instrument gehoert - oder keine. */
export function findVersionOfInstrument(
  moduleId: string,
  instrumentId: string
): ModuleVersion | null {
  return getModuleDefinition(moduleId)?.versions.find((v) => v.instrumentId === instrumentId) ?? null;
}
