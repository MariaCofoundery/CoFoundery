import { MODULE_REGISTRY } from "@/features/modules/registry";
import type { ModuleDefinition, ModuleStatus } from "@/features/modules/types";

/**
 * „Dein Grundprofil steht" - nur die Ableitung, noch keine Anzeige.
 *
 * ABGELEITET, NICHT GESPEICHERT: Das Grundprofil steht, wenn jedes
 * Person-Core-Modul der Registry `done_for_now` ist (Zustaende kommen aus den
 * Adaptern). Es gibt keine Tabelle, keinen Prozentwert und keine Liste im Code:
 * Welche Module dazugehoeren, sagt die Registry.
 *
 * WARUM ES NOCH KEINE MELDUNG GIBT: Sie ist eine UX-Feier, kein fachlicher
 * Zustand, und sie wird EREIGNISBASIERT ausgeloest - nicht gespeichert:
 *
 *     vorher: isGrundprofilComplete = false
 *     ein Core-Modul wird erfolgreich abgeschlossen
 *     nachher: isGrundprofilComplete = true       =>  einmalige Meldung
 *
 * Es gibt keinen persistierten „schon gezeigt"-Zustand. Geht die Meldung durch
 * einen Abbruch oder ein Neuladen verloren, ist das hinnehmbar. Angebunden wird
 * sie erst dort, wo ein Core-Modul erfolgreich abgeschlossen wird (Phase D und
 * spaeter) - nicht hier, denn Phase C aendert keinen bestehenden Flow.
 *
 * DAMIT DIE FEIER NICHT BEI JEDEM UPDATE ZURUECKKEHRT, gilt die Statusregel der
 * Adapter: Ein gueltig abgeschlossenes Core-Modul bleibt `done_for_now`, auch
 * wenn spaeter ein Update- oder Re-Assessment-Entwurf beginnt (Workstyle,
 * Venture). Ein neuer Entwurf ist eine Aktualisierung, nicht wieder „Profil
 * unvollstaendig".
 *
 * BEKANNTE GRENZE: Bei Capability kann der abgeleitete Zustand zurueckgehen,
 * wenn die Person einen NEUEN Bereich ohne Stufe oder Wunsch hinzufuegt (das ist
 * kein Entwurf, sondern ein neuer Eintrag). Bindet man die Meldung an die
 * Abschluss-Aktion eines Moduls, loest das Ergaenzen eines Bereichs sie nicht
 * aus; bindet man sie an jede Zustandsaenderung, koennte sie erneut kommen.
 * Das ist beim Anbinden zu entscheiden.
 */
export function personCoreModules(registry: readonly ModuleDefinition[] = MODULE_REGISTRY) {
  return registry.filter((def) => def.scope === "person" && def.tier === "core" && def.usage === "product");
}

export function isGrundprofilComplete(
  statuses: Readonly<Record<string, ModuleStatus | undefined>>,
  registry: readonly ModuleDefinition[] = MODULE_REGISTRY
): boolean {
  const core = personCoreModules(registry);
  return core.length > 0 && core.every((def) => statuses[def.moduleId]?.state === "done_for_now");
}
