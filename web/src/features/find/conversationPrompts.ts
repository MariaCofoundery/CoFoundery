/**
 * "Warum ein Gespräch interessant sein könnte" und "Das solltet ihr früh
 * besprechen" (Phase 11).
 *
 * KEIN MATCHING. Diese Funktion bewertet nicht, wie gut zwei Menschen
 * zusammenpassen, und sie sortiert nichts. Sie stellt einzelne, ausdrückliche
 * Angaben nebeneinander und benennt jede Übereinstimmung bzw. jeden Unterschied
 * für sich - mit einer eigenen Claim-ID (z. B. `FIND.WHY.ROLE_SOUGHT_BY_THEM`).
 * Es gibt keine Gewichtung, keine Summe, keine Gesamtaussage und keine
 * Rangfolge zwischen Kandidat:innen; die Reihenfolge der Punkte ist fest.
 *
 * Quellen (nur, was beide Seiten bewusst angegeben bzw. freigegeben haben):
 * - veröffentlichte FIND-Profilfelder (Rollen, Branchen, Suchintention,
 *   Starthorizont, Verfügbarkeit, Remote-Modus),
 * - die EIGENE private Suche der betrachtenden Person (gesuchte Bereiche) -
 *   sie wird nur der Person selbst angezeigt,
 * - Capability nur so weit, wie `get_disclosed_capability` sie liefert
 *   (Bereiche; Verantwortungswunsch erst nach angenommenem Kontakt),
 * - Workstyle nur als Discovery-Signal aus `get_discovery_workstyle_signals`
 *   (beidseitiger Opt-in), und dort nur DISCUSSION_POINT als Gesprächsimpuls.
 *
 * Grenzen (Phase 10B gilt auch hier): Eine Capability-Angabe ist keine
 * Kompetenzprüfung, ein Verantwortungswunsch keine Rolle; ein Unterschied ist
 * kein Konflikt, eine Übereinstimmung kein Vorteil. Fehlende Angaben erzeugen
 * keinen Punkt.
 */

export type ConversationProfile = {
  displayName: string;
  ownRoles: string[];
  seekingRoles: string[];
  industries?: string[];
  remoteMode?: string | null;
  availabilityHoursPerWeek?: number | null;
  searchIntent?: string | null;
  startHorizon?: string | null;
};

export type CapabilitySignal = { area_id: string; ownership_wish: string | null };

export type ConversationInput = {
  viewer: ConversationProfile | null;
  candidate: ConversationProfile;
  /** Eigene private Suche: Bereiche, nach denen die betrachtende Person sucht. */
  viewerSearchAreas?: string[];
  /** Eigene Capability-Einträge der betrachtenden Person. */
  viewerCapability?: CapabilitySignal[];
  /** Was die andere Person freigegeben hat (get_disclosed_capability). */
  candidateCapability?: CapabilitySignal[];
  /** Discovery-Workstyle-Signale (beidseitiger Opt-in). */
  workstyleSignals?: { area_key: string; pattern: string }[];
};

export type ConversationPoint = {
  /** Interne Claim-ID, nur für Entwickler (data-claim). */
  claim: string;
  /** Message-Key unter `find.conversation`. */
  key: string;
  /** Werte für den Message-Text; Rollen/Bereiche/Areas als Schlüssel, die Seite übersetzt sie. */
  values: { roles?: string[]; areas?: string[]; industries?: string[]; you?: string; them?: string; workstyleArea?: string };
};

const AVAILABILITY_GAP_HOURS = 10;
const lower = (values: string[] = []) => values.map((v) => v.trim().toLocaleLowerCase());
const overlap = (a: string[] = [], b: string[] = []) => a.filter((x) => b.includes(x));
const OWNERSHIP_ELSEWHERE = new Set(["prefer_other", "prefer_external"]);

export function conversationPoints(input: ConversationInput): { why: ConversationPoint[]; discuss: ConversationPoint[] } {
  const { viewer, candidate } = input;
  const why: ConversationPoint[] = [];
  const discuss: ConversationPoint[] = [];
  const candidateCapability = input.candidateCapability ?? [];
  const viewerCapability = input.viewerCapability ?? [];

  if (viewer) {
    // --- Warum ein Gespräch interessant sein könnte ---
    const soughtByThem = overlap(candidate.seekingRoles, viewer.ownRoles).filter((r) => r !== "other");
    if (soughtByThem.length) why.push({ claim: "FIND.WHY.ROLE_SOUGHT_BY_THEM", key: "why.roleSoughtByThem", values: { roles: soughtByThem } });

    const soughtByYou = overlap(viewer.seekingRoles, candidate.ownRoles).filter((r) => r !== "other");
    if (soughtByYou.length) why.push({ claim: "FIND.WHY.ROLE_SOUGHT_BY_YOU", key: "why.roleSoughtByYou", values: { roles: soughtByYou } });
  }

  const searchAreas = overlap(candidateCapability.map((c) => c.area_id), input.viewerSearchAreas ?? []);
  if (searchAreas.length) why.push({ claim: "FIND.WHY.CAPABILITY_IN_YOUR_SEARCH", key: "why.capabilityInYourSearch", values: { areas: searchAreas } });

  // Nur sichtbar, wenn die andere Person ihren Verantwortungswunsch nach einem
  // angenommenen Kontakt zeigt. Wunsch gegen Wunsch - keine Fähigkeitsaussage.
  const viewerWish = new Map(viewerCapability.map((c) => [c.area_id, c.ownership_wish]));
  const handOver = candidateCapability
    .filter((c) => c.ownership_wish === "own" && OWNERSHIP_ELSEWHERE.has(viewerWish.get(c.area_id) ?? ""))
    .map((c) => c.area_id);
  if (handOver.length) why.push({ claim: "FIND.WHY.OWNERSHIP_YOU_HAND_OVER", key: "why.ownershipYouHandOver", values: { areas: handOver } });

  if (viewer) {
    const viewerIndustries = lower(viewer.industries);
    const sharedIndustries = (candidate.industries ?? []).filter((i) => viewerIndustries.includes(i.trim().toLocaleLowerCase()));
    if (sharedIndustries.length) why.push({ claim: "FIND.WHY.SHARED_INDUSTRY", key: "why.sharedIndustry", values: { industries: sharedIndustries } });

    // --- Was ihr früh besprechen solltet ---
    const sameRole = overlap(viewer.ownRoles, candidate.ownRoles).filter((r) => r !== "other");
    if (sameRole.length) discuss.push({ claim: "FIND.DISCUSS.SAME_OWN_ROLE", key: "discuss.sameOwnRole", values: { roles: sameRole } });
  }

  const bothOwn = candidateCapability
    .filter((c) => c.ownership_wish === "own" && viewerWish.get(c.area_id) === "own")
    .map((c) => c.area_id);
  if (bothOwn.length) discuss.push({ claim: "FIND.DISCUSS.BOTH_WANT_TO_OWN", key: "discuss.bothWantToOwn", values: { areas: bothOwn } });

  if (viewer) {
    if (viewer.searchIntent && candidate.searchIntent && viewer.searchIntent !== candidate.searchIntent)
      discuss.push({ claim: "FIND.DISCUSS.SEARCH_INTENT_DIFFERS", key: "discuss.searchIntentDiffers", values: { you: viewer.searchIntent, them: candidate.searchIntent } });
    if (viewer.startHorizon && candidate.startHorizon && viewer.startHorizon !== candidate.startHorizon)
      discuss.push({ claim: "FIND.DISCUSS.START_HORIZON_DIFFERS", key: "discuss.startHorizonDiffers", values: { you: viewer.startHorizon, them: candidate.startHorizon } });
    const a = viewer.availabilityHoursPerWeek, b = candidate.availabilityHoursPerWeek;
    if (typeof a === "number" && typeof b === "number" && Math.abs(a - b) >= AVAILABILITY_GAP_HOURS)
      discuss.push({ claim: "FIND.DISCUSS.AVAILABILITY_DIFFERS", key: "discuss.availabilityDiffers", values: { you: String(a), them: String(b) } });
    const modes = new Set([viewer.remoteMode, candidate.remoteMode]);
    if (modes.has("onsite") && modes.has("remote"))
      discuss.push({ claim: "FIND.DISCUSS.REMOTE_MODE_DIFFERS", key: "discuss.remoteModeDiffers", values: { you: viewer.remoteMode ?? "", them: candidate.remoteMode ?? "" } });
  }

  // Workstyle: nur das bestehende Discovery-Signal, höchstens zwei Bereiche.
  for (const signal of (input.workstyleSignals ?? []).filter((s) => s.pattern === "DISCUSSION_POINT").slice(0, 2))
    discuss.push({ claim: `FIND.DISCUSS.WORKSTYLE.${signal.area_key}`, key: "discuss.workstyleDiscussionPoint", values: { workstyleArea: signal.area_key } });

  return { why: why.slice(0, 4), discuss: discuss.slice(0, 4) };
}
