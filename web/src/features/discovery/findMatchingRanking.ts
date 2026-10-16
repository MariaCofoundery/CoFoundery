import "server-only";

import type { FindCardReason, FounderDiscoveryProfile } from "@/features/discovery/discoveryTypes";
import { paginateFindShadow, runGlobalFindMatchingShadow } from "@/features/discovery/findMatchingGlobalShadow";
import { createShadowServiceClient, type ShadowClient } from "@/features/discovery/findMatchingInputs";
import { FindMatchingPoolError, loadFindMatchingPool } from "@/features/discovery/findMatchingPool";
import { presentFindReasons, type PresentedMatch } from "@/lib/matching/reasonPresentation";
import type { FindMatchResult } from "@/lib/matching/v01/types";

/**
 * FIND Matching v0.1 als produktiver Rankingpfad (E3b) - hinter einem Server-Flag,
 * standardmäßig AUS.
 *
 *   Sitzung prüfen -> Pool über die Sitzung (get_find_matching_pool, auth.uid())
 *   -> private Inputs über den Service-Client (get_find_matching_inputs, nur dafür)
 *   -> Gate v03, Relevanz, Gegenseitigkeit, globaler Rang (Engine, ein Durchlauf je Paar)
 *   -> Seite (12) -> NUR für die IDs dieser Seite die Karten-Daten über den
 *      bestehenden RLS-Lader -> Reihenfolge der Engine, Suchprojektion wie heute.
 *
 * Nach außen geht nur die Seite in derselben Form wie die heutige Suche: keine Scores,
 * Komponenten, Gegenseitigkeit, Confidence, Gate-Gründe, Kriterien, tieGroup,
 * secondaryOrder, Capability-Freigabe oder Capability-Details.
 *
 * E3c: Dazu je Karte höchstens FIND_CARD_REASON_LIMIT Reasons - NUR Presenter-Ausgabe
 * (presentFindReasons, Sicht der betrachtenden Person) und NUR für die Kandidaten der
 * gezeigten Seite, nie für die ganze Population.
 *
 * Schlägt etwas fehl, kommt `{ ok: false, failure }` - der Aufrufer nimmt dann für
 * diese Anfrage die heutige Suche. Nie ein halbes Ergebnis, kein Fehler an den Client,
 * keine Logs.
 */

export { FIND_V01_RANKING_FLAG, isFindV01RankingEnabled } from "@/features/discovery/findV01RankingFlag";

export type FindV01Failure =
  | "session_invalid"
  | "viewer_mismatch"
  | "viewer_not_searching"
  | "service_unavailable"
  | "pool_failed"
  | "inputs_failed"
  | "engine_failed"
  | "detail_failed"
  | "presenter_failed";

export type FindV01Page = Readonly<{
  /** Karten in Engine-Reihenfolge, als Suchprojektion (wie search_founder_discovery_profiles_v2). */
  profiles: readonly FounderDiscoveryProfile[];
  /** Presenter-Reasons je Profil-ID der Seite (höchstens FIND_CARD_REASON_LIMIT, ohne Rohdaten). */
  reasonsByProfileId: ReadonlyMap<string, readonly FindCardReason[]>;
  page: number;
  pageSize: number;
  /** Alle für die Person zulässigen Kandidaten (eligible + uncertain), global. */
  totalCount: number;
}>;

type SessionClient = ShadowClient & {
  auth: { getUser: () => PromiseLike<{ data: { user: { id: string } | null }; error: unknown }> };
  rpc: (name: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
};
type ServiceClient = Parameters<typeof loadFindMatchingPool>[0];

export const FIND_V01_PAGE_SIZE = 12;

/**
 * Höchstens so viele Reasons je Karte. Reihenfolge = Presenter-Reihenfolge (die der
 * Engine-Erklärungen: Rollen, Capability, Branche, Start, Phase, Unterschiede, offene
 * Standortangaben); je Code nur der erste, damit z. B. drei gesuchte Rollen nicht alle
 * Plätze belegen. Keine eigene Gewichtung - das ist reine Kürzung für die Karte.
 */
export const FIND_CARD_REASON_LIMIT = 3;

/** Presenter-Ausgabe -> Karten-Reasons. Nur messageKey, erlaubte Daten, Label-Namespaces. */
export function cardReasonsFromPresented(presented: PresentedMatch): FindCardReason[] {
  if (!presented.visible) return [];
  const seen = new Set<string>();
  const out: FindCardReason[] = [];
  for (const reason of presented.reasons) {
    if (out.length >= FIND_CARD_REASON_LIMIT) break;
    if (seen.has(reason.code)) continue;
    // „Anderer Schwerpunkt“ sagt nicht, welcher - als Satz („Du suchst Anderer Schwerpunkt“)
    // wäre das ein künstlicher Grund. Er entfällt; der nächste Reason rückt nach.
    if (reason.data.role === "other") continue;
    seen.add(reason.code);
    out.push({ messageKey: reason.messageKey, data: { ...reason.data }, labels: { ...reason.labels } });
  }
  return out;
}

/** Dieselbe Projektion wie die heutige Suche: Bio, Branchen und letzter Schritt stehen nur auf der Profilseite. */
export function toSearchCardProfile(profile: FounderDiscoveryProfile): FounderDiscoveryProfile {
  return {
    id: profile.id,
    userId: profile.userId,
    status: "active",
    displayName: profile.displayName,
    headline: profile.headline,
    bio: "",
    ownRoles: profile.ownRoles,
    ownRoleOther: profile.ownRoleOther,
    seekingRoleOther: profile.seekingRoleOther,
    seekingRoles: profile.seekingRoles,
    expertise: profile.expertise ?? [],
    industries: [],
    locationRegion: profile.locationRegion,
    remoteMode: profile.remoteMode,
    availabilityHoursPerWeek: profile.availabilityHoursPerWeek,
    availabilityFlexibility: profile.availabilityFlexibility,
    availabilityCondition: profile.availabilityCondition,
    recentStep: null,
    commitmentLevel: profile.commitmentLevel,
    ventureStage: profile.ventureStage,
    ventureGoal: profile.ventureGoal,
    searchIntent: profile.searchIntent ?? null,
    startHorizon: profile.startHorizon ?? null,
    publishedAt: profile.publishedAt,
    createdAt: profile.publishedAt ?? "",
    updatedAt: profile.publishedAt ?? "",
  };
}

export type FindV01Result = { ok: true; page: FindV01Page } | { ok: false; failure: FindV01Failure };

export async function getFindCandidatesV01ForCurrentUser(input: Readonly<{
  sessionClient: SessionClient;
  /** Die ID, für die der Aufrufer sucht - muss die Sitzung sein, sonst kein v0.1. */
  expectedUserId: string;
  page: number;
  /** Bestehender RLS-Lader für Karten (getActiveDiscoveryProfilesByIds). */
  loadPageProfiles: (profileIds: string[]) => Promise<FounderDiscoveryProfile[]>;
  createServiceClient?: () => ServiceClient | null;
  now?: () => Date;
  /** Nur für Tests (Zählung); Standard presentFindReasons. */
  presentReasons?: (result: FindMatchResult) => PresentedMatch;
}>): Promise<FindV01Result> {
  // A/B/D: gültige Sitzung, und die gesuchte ID IST die Sitzung.
  let sessionUserId: string | null = null;
  try {
    const { data, error } = await input.sessionClient.auth.getUser();
    sessionUserId = error ? null : (data.user?.id ?? null);
  } catch {
    sessionUserId = null;
  }
  if (!sessionUserId) return { ok: false, failure: "session_invalid" };
  if (sessionUserId !== input.expectedUserId) return { ok: false, failure: "viewer_mismatch" };

  // C: Service-Client nur für die privaten Inputs.
  let serviceClient: ServiceClient | null;
  try {
    serviceClient = (input.createServiceClient ?? (createShadowServiceClient as () => ServiceClient | null))();
  } catch {
    serviceClient = null;
  }
  if (!serviceClient) return { ok: false, failure: "service_unavailable" };

  let population;
  try {
    ({ population } = await loadFindMatchingPool(serviceClient, { kind: "session", client: input.sessionClient }));
  } catch (error) {
    return { ok: false, failure: error instanceof FindMatchingPoolError && error.stage === "inputs" ? "inputs_failed" : "pool_failed" };
  }
  if (!population) return { ok: false, failure: "viewer_not_searching" };
  // E: Pool (Sitzung) und Inputs gehören zur selben Person.
  if (!population.profiles.has(sessionUserId) || !population.core.has(sessionUserId)) return { ok: false, failure: "viewer_mismatch" };

  const run = runGlobalFindMatchingShadow(population, sessionUserId, { now: input.now });
  if (run.status === "viewer_not_in_pool") return { ok: false, failure: "viewer_not_searching" };
  if (run.status !== "ok") return { ok: false, failure: "engine_failed" };

  // Seiten erst nach dem globalen Rang. Außerhalb des Bereichs: leere Seite, Gesamtzahl bleibt.
  const page = Number.isFinite(input.page) ? Math.max(1, Math.floor(input.page)) : 1;
  const totalCount = run.ranked.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / FIND_V01_PAGE_SIZE));
  const items = page > totalPages ? [] : paginateFindShadow(run.ranked, page, FIND_V01_PAGE_SIZE).items;
  const pageItems = items.flatMap((r) => {
    const profileId = population.profiles.get(r.result.subject.b)?.id;
    return profileId ? [{ profileId, result: r.result }] : [];
  });
  const orderedProfileIds = pageItems.map((item) => item.profileId);

  let loaded: FounderDiscoveryProfile[];
  try {
    loaded = orderedProfileIds.length === 0 ? [] : await input.loadPageProfiles(orderedProfileIds);
  } catch {
    return { ok: false, failure: "detail_failed" };
  }
  // Reihenfolge der Engine wiederherstellen. Was der RLS-Lader nicht (mehr) liefert -
  // inzwischen pausiert, blockiert, keine Founder-Rolle -, entfällt; nichts kommt hinzu.
  const byId = new Map(loaded.map((p) => [p.id, p]));
  const profiles = orderedProfileIds.flatMap((id) => {
    const profile = byId.get(id);
    return profile ? [toSearchCardProfile(profile)] : [];
  });

  // E3c: Reasons erst jetzt und nur für die Karten, die tatsächlich gezeigt werden.
  // Betrachter ist in der Engine Seite "a". Scheitert der Presenter, gilt die heutige Suche.
  const present = input.presentReasons ?? ((result: FindMatchResult) => presentFindReasons(result, { side: "a" }));
  const reasonsByProfileId = new Map<string, readonly FindCardReason[]>();
  try {
    for (const item of pageItems) {
      if (byId.has(item.profileId)) reasonsByProfileId.set(item.profileId, cardReasonsFromPresented(present(item.result)));
    }
  } catch {
    return { ok: false, failure: "presenter_failed" };
  }

  return { ok: true, page: { profiles, reasonsByProfileId, page, pageSize: FIND_V01_PAGE_SIZE, totalCount } };
}
