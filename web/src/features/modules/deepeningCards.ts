import { MODULE_REGISTRY } from "@/features/modules/registry";
import type {
  ModuleDefinition,
  ModuleState,
  ModuleStatus,
  ModuleTeaser,
} from "@/features/modules/types";

/**
 * Das Modell der Vertiefungskarten (Phase C) - rein, ohne Oberflaeche.
 *
 * VERTIEFUNGEN SIND ANGEBOTE, KEINE LUECKEN. Aus dem Zustand eines Moduls wird
 * der Zustand einer Karte:
 *
 *   not_started  ->  available    ein Angebot, nicht ein fehlender Profilteil
 *   in_progress  ->  in_progress  „Begonnen"
 *   done_for_now ->  completed    ein bis zwei kurze Saetze, Details hinter einem Klick
 *
 * Es gibt hier KEINE Prozentzahl, KEIN „x von y" und KEINEN Gesamtfortschritt
 * ueber Vertiefungen - und nichts davon beeinflusst je die Core-Completion.
 *
 * DIE METADATEN KOMMEN AUS DER REGISTRY. Welche Vertiefung an welchem
 * Core-Bereich haengt, steht in `ModuleDefinition.deepens`; hier gibt es keine
 * zweite Liste. Solange keine Vertiefung registriert ist, liefert dieses Modell
 * nichts - und die Oberflaeche zeigt dann nichts (`ProfileDeepenings`).
 */

/** So viele Karten sind gleichzeitig sichtbar; der Rest steht unter „Weitere Vertiefungen". */
export const MAX_VISIBLE_DEEPENINGS = 3;
/** So viele kurze Saetze zeigt eine abgeschlossene Vertiefung. */
export const MAX_TEASER_LINES = 2;

export type DeepeningCardState = "available" | "in_progress" | "completed";

export type DeepeningCardModel = {
  moduleId: string;
  state: DeepeningCardState;
  /** Wohin der Klick fuehrt: das Detail des Moduls (Ziel aus der Registry, ggf. mit Vorhaben). */
  href: string;
  /** Nur bei `completed`. */
  teaser: readonly string[];
};

export function cardStateOf(state: ModuleState): DeepeningCardState {
  switch (state) {
    case "not_started":
      return "available";
    case "in_progress":
      return "in_progress";
    case "done_for_now":
      return "completed";
  }
}

/**
 * Die Vertiefungen eines Core-Moduls - in der Reihenfolge der Registry.
 *
 * Es zaehlen nur Produkt-Vertiefungen desselben Scopes wie das Core-Modul:
 * Person-Vertiefungen haengen nur an Person-Bereichen, Vorhaben-Vertiefungen nur
 * am Vorhaben-Bereich. Research und Team-Module sind nie Profilkarten. Die
 * Scope-Pruefung steht auch im Validator; hier nochmals, damit eine
 * ungepruefte Registry nie Scopes mischen kann.
 */
export function deepeningsOf(
  anchorModuleId: string,
  registry: readonly ModuleDefinition[] = MODULE_REGISTRY
): ModuleDefinition[] {
  const anchor = registry.find((def) => def.moduleId === anchorModuleId);
  if (!anchor || anchor.tier !== "core" || anchor.scope === "team") return [];
  return registry.filter(
    (def) =>
      def.tier === "deepening" &&
      def.deepens === anchor.moduleId &&
      def.scope === anchor.scope &&
      def.usage === "product" &&
      def.renderers.teamView === undefined
  );
}

/**
 * Der Abschnitt von `/me/profile`, an dem ein Core-Modul haengt - aus seiner
 * Profilkarten-Referenz in der Registry (`me-profile:<id>`).
 */
export function profileSectionOf(
  moduleId: string,
  registry: readonly ModuleDefinition[] = MODULE_REGISTRY
): string | null {
  const reference = registry.find((def) => def.moduleId === moduleId)?.renderers.profileCard;
  return reference?.startsWith("me-profile:") ? reference.slice("me-profile:".length) : null;
}

const RANG: Record<DeepeningCardState, number> = { completed: 0, in_progress: 1, available: 2 };

/**
 * Baut die Karten: Abgeschlossene zuerst, dann Begonnene, dann Angebote - und
 * je Gruppe in der Reihenfolge der Registry. Hoechstens drei sind sichtbar.
 */
export function buildDeepeningCards(
  defs: readonly ModuleDefinition[],
  resolve: (def: ModuleDefinition) => { status: ModuleStatus; teaser: ModuleTeaser | null } | null
): { visible: DeepeningCardModel[]; more: DeepeningCardModel[] } {
  const cards: DeepeningCardModel[] = [];
  for (const def of defs) {
    const resolved = resolve(def);
    if (!resolved) continue; // nicht lesbar: keine Karte statt einer falschen
    const state = cardStateOf(resolved.status.state);
    cards.push({
      moduleId: def.moduleId,
      state,
      // Das Ziel kommt aus der Registry; ein Modul darf es um den Kontext ergaenzen
      // (bei `person_in_venture` haengt das Vorhaben als Parameter dran).
      href: resolved.teaser?.href ?? def.renderers.detail,
      teaser: state === "completed" ? (resolved.teaser?.lines ?? []).slice(0, MAX_TEASER_LINES) : [],
    });
  }
  const sorted = cards
    .map((card, index) => ({ card, index }))
    .sort((a, b) => RANG[a.card.state] - RANG[b.card.state] || a.index - b.index)
    .map(({ card }) => card);
  return { visible: sorted.slice(0, MAX_VISIBLE_DEEPENINGS), more: sorted.slice(MAX_VISIBLE_DEEPENINGS) };
}
