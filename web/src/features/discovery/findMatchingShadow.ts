import "server-only";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

import { capabilityMatchingPermissionFromRow } from "@/features/capability/capabilityMatchingPermission";
import type { CapabilityDisclosure } from "@/features/capability/capabilityTypes";
import type { DiscoveryMustHaves, FounderDiscoveryProfile } from "@/features/discovery/discoveryTypes";
import { getCandidateMatchingV01Constraints } from "@/features/discovery/privateSearchConstraints";
import { presentFindReasons } from "@/lib/matching/reasonPresentation";
import { findPersonFromDiscovery, type CapabilityRowLike } from "@/lib/matching/v01/adapters";
import { matchFindPair, rankFindCandidates } from "@/lib/matching/v01/findMatcher";
import type { FindMatchResult, FindMustHavesInput, FindPersonInput, GateStatus } from "@/lib/matching/v01/types";
import { MATCHING_VERSION, NORMALIZATION_VERSION } from "@/lib/matching/v01/version";

/**
 * FIND Matching v0.1 im SHADOW MODE (Schritt E1).
 *
 * Rechnet für eine echte FIND-Suche zusätzlich Gate, Relevanz, Gegenseitigkeit,
 * Rang und präsentierbare Reason-Codes - und verwirft das Ergebnis. Die sichtbare
 * Suche (search_founder_discovery_profiles_v2, published_at) bleibt die einzige
 * Quelle für Auswahl, Reihenfolge und Seiten.
 *
 *   - Aus, solange MATCHING_FIND_V01_SHADOW_ENABLED nicht genau "true" ist.
 *   - Läuft nach der Antwort (der Aufrufer übergibt `after`); wirft nie.
 *   - Keine Speicherung, keine Logs. Ergebnisse sieht nur ein ausdrücklich
 *     übergebener Beobachter (Tests, lokale Hilfen).
 *   - Eingabe ist nur die geladene Seite: kein globaler Rang (POOL-BIAS, siehe Doku).
 *
 * Doku: docs/research/matching-v0.1-find-shadow.md
 */

export const FIND_SHADOW_FLAG = "MATCHING_FIND_V01_SHADOW_ENABLED";
/** FIND nutzt kein IDF (Spec §11.2); das Ergebnis trägt die Version trotzdem mit. */
export const FIND_SHADOW_IDF_CORPUS_VERSION = "none-find-does-not-use-idf";

export function isFindMatchingShadowEnabled(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  const raw = env[FIND_SHADOW_FLAG];
  return typeof raw === "string" && raw.trim().toLowerCase() === "true";
}

export type FindMatchingShadowFailure = "service_unavailable" | "load_failed" | "engine_failed" | "presenter_failed";

/** Nur, was QA braucht: keine Profile, keine Kriterien, keine Capability-Werte, keine Scores. */
export type FindMatchingShadowResult = Readonly<{
  status: "ok" | "failed";
  failure: FindMatchingShadowFailure | null;
  matchingVersion: string;
  normalizationVersion: string;
  computedAt: string;
  pool: Readonly<{ scope: "visible_page"; page: number; pageSize: number; candidatesOnPage: number; rpcTotalCount: number }>;
  candidates: readonly Readonly<{
    /** intern: user_id des Kandidaten */
    candidateId: string;
    visiblePosition: number;
    eligibility: GateStatus;
    shadowRank: number | null;
    tieGroup: string | null;
    reasonCodes: readonly string[];
  }>[];
  counts: Readonly<{ candidates: number; eligible: number; uncertain: number; ineligible: number }>;
}>;

export type FindMatchingShadowInput = Readonly<{
  viewerUserId: string;
  viewerProfile: FounderDiscoveryProfile;
  /** Die eigenen Kriterien, wie die sichtbare Suche sie schon geladen hat; der Adapter nimmt nur die acht v0.1-Kriterien. */
  viewerMustHaves: DiscoveryMustHaves | null;
  /** Die sichtbare Seite in sichtbarer Reihenfolge. */
  candidates: readonly FounderDiscoveryProfile[];
  page: number;
  pageSize: number;
  rpcTotalCount: number;
}>;

type ShadowClient = Pick<SupabaseClient, "from">;

type CoreRow = {
  user_id: string;
  industries: string[] | null;
  expertise: string[] | null;
  location_region: string | null;
  remote_mode: string | null;
  capability_disclosure: string | null;
  capability_matching_allowed: boolean | null;
};

class StageError extends Error {
  readonly failure: FindMatchingShadowFailure;
  constructor(failure: FindMatchingShadowFailure) {
    super(failure);
    this.failure = failure;
  }
}

async function rows<T>(query: PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  const { data, error } = await query;
  if (error || !Array.isArray(data)) throw new StageError("load_failed");
  return data as T[];
}

/** Alle Zusatzdaten für Betrachter + Seite in festen Batch-Abfragen (keine N+1). */
async function loadShadowData(client: ShadowClient, viewerUserId: string, candidateIds: readonly string[]) {
  const ids = [viewerUserId, ...candidateIds];
  const either = (a: string, b: string) => `${a}.eq.${viewerUserId},${b}.eq.${viewerUserId}`;
  const [roleRows, coreRows, blockRows, introRows, contactRows, candidateMustHaves] = await Promise.all([
    rows<{ user_id: string; roles: string[] | null }>(client.from("profiles").select("user_id, roles").in("user_id", ids)),
    rows<CoreRow>(
      client
        .from("person_core")
        .select("user_id, industries, expertise, location_region, remote_mode, capability_disclosure, capability_matching_allowed")
        .in("user_id", ids),
    ),
    rows<{ blocker_user_id: string; blocked_user_id: string }>(
      client.from("network_blocks").select("blocker_user_id, blocked_user_id").or(either("blocker_user_id", "blocked_user_id")),
    ),
    rows<{ requester_user_id: string; recipient_user_id: string }>(
      client
        .from("discovery_intro_requests")
        .select("requester_user_id, recipient_user_id")
        .eq("status", "accepted")
        .or(either("requester_user_id", "recipient_user_id")),
    ),
    rows<{ sender_user_id: string; recipient_user_id: string }>(
      client
        .from("network_contact_requests")
        .select("sender_user_id, recipient_user_id")
        .eq("status", "accepted")
        .or(either("sender_user_id", "recipient_user_id")),
    ),
    // Wirft bei Ladefehlern - nie still „keine Kriterien“.
    getCandidateMatchingV01Constraints(client, candidateIds).catch(() => {
      throw new StageError("load_failed");
    }),
  ]);

  const core = new Map(coreRows.map((r) => [r.user_id, r]));
  // Capability nur für Personen mit ausdrücklicher Matching-Freigabe - die übrigen werden gar nicht gelesen.
  const allowedIds = ids.filter((id) => capabilityMatchingPermissionFromRow(core.get(id) ?? null).allowed);
  const [entryRows, areaRows] =
    allowedIds.length === 0
      ? [[], []]
      : await Promise.all([
          rows<CapabilityRowLike & { user_id: string }>(
            client.from("person_capability_entries").select("user_id, area_id, application_level, ownership_wish").in("user_id", allowedIds),
          ),
          rows<{ area_id: string; family_id: string }>(client.from("capability_areas").select("area_id, family_id")),
        ]);

  const other = (a: string, b: string) => (a === viewerUserId ? b : a);
  return {
    founders: new Set(roleRows.filter((r) => (r.roles ?? []).includes("founder")).map((r) => r.user_id)),
    core,
    blocked: new Set(blockRows.map((r) => other(r.blocker_user_id, r.blocked_user_id))),
    // Angenommene Verbindung (Intro oder CONNECT-Kontakt) - nur für die Tiefen-Sichtbarkeit von Reasons.
    // Gemeinsame Teams zählen hier nicht: schlimmstenfalls fehlt ein Reason, nie wird zu viel gezeigt.
    connected: new Set([
      ...introRows.map((r) => other(r.requester_user_id, r.recipient_user_id)),
      ...contactRows.map((r) => other(r.sender_user_id, r.recipient_user_id)),
    ]),
    entries: entryRows,
    familyOfArea: Object.fromEntries(areaRows.map((r) => [r.area_id, r.family_id])) as Record<string, string>,
    candidateMustHaves,
  };
}

function personInput(
  profile: FounderDiscoveryProfile,
  mustHaves: DiscoveryMustHaves | FindMustHavesInput | null,
  data: Awaited<ReturnType<typeof loadShadowData>>,
  hasContact: boolean,
): FindPersonInput {
  const core = data.core.get(profile.userId);
  return findPersonFromDiscovery({
    // Branchen, Expertise, Ort, Remote aus person_core (Spec §4); fehlt die Zeile, bleiben die Profilwerte.
    profile: core
      ? {
          ...profile,
          industries: core.industries ?? [],
          expertise: core.expertise ?? [],
          locationRegion: core.location_region,
          remoteMode: (core.remote_mode ?? profile.remoteMode) as FounderDiscoveryProfile["remoteMode"],
        }
      : profile,
    mustHaves,
    isFounder: data.founders.has(profile.userId),
    capabilityRows: data.entries.filter((e) => e.user_id === profile.userId),
    capabilityDisclosure: (core?.capability_disclosure ?? null) as CapabilityDisclosure | null,
    hasContact,
    capabilityMatchingPermission: capabilityMatchingPermissionFromRow(core ?? null),
  });
}

const tally = (statuses: readonly GateStatus[]) => ({
  candidates: statuses.length,
  eligible: statuses.filter((s) => s === "eligible").length,
  uncertain: statuses.filter((s) => s === "uncertain").length,
  ineligible: statuses.filter((s) => s === "ineligible").length,
});

/** Rechnet den Shadow für eine Seite. Wirft nie; Fehler stehen in `status`/`failure`. */
export async function computeFindMatchingShadow(
  input: FindMatchingShadowInput,
  client: ShadowClient | null,
  now: () => Date = () => new Date(),
): Promise<FindMatchingShadowResult> {
  const computedAt = now().toISOString();
  const pool = {
    scope: "visible_page" as const,
    page: input.page,
    pageSize: input.pageSize,
    candidatesOnPage: input.candidates.length,
    rpcTotalCount: input.rpcTotalCount,
  };
  const failed = (failure: FindMatchingShadowFailure): FindMatchingShadowResult => ({
    status: "failed",
    failure,
    matchingVersion: MATCHING_VERSION,
    normalizationVersion: NORMALIZATION_VERSION,
    computedAt,
    pool,
    candidates: [],
    counts: tally([]),
  });
  if (!client) return failed("service_unavailable");

  try {
    const candidateIds = input.candidates.map((c) => c.userId);
    const data = await loadShadowData(client, input.viewerUserId, candidateIds);

    let viewer: FindPersonInput;
    let people: FindPersonInput[];
    let results: FindMatchResult[];
    let ranked: ReturnType<typeof rankFindCandidates>;
    try {
      viewer = personInput(input.viewerProfile, input.viewerMustHaves, data, false);
      people = input.candidates.map((c) =>
        personInput(c, data.candidateMustHaves.get(c.userId) ?? null, data, data.connected.has(c.userId)),
      );
      const ctx = { familyOfArea: data.familyOfArea, idfCorpusVersion: FIND_SHADOW_IDF_CORPUS_VERSION, computedAt };
      results = people.map((p) => matchFindPair(viewer, p, { ...ctx, blocked: data.blocked.has(p.personId) }));
      ranked = rankFindCandidates(viewer, people, { ...ctx, blockedPersonIds: data.blocked });
    } catch {
      throw new StageError("engine_failed");
    }

    let reasonCodes: string[][];
    try {
      reasonCodes = results.map((r) => presentFindReasons(r, { side: "a" }).reasons.map((x) => x.code));
    } catch {
      throw new StageError("presenter_failed");
    }

    const rankOf = new Map(ranked.map((r) => [r.result.subject.b, r]));
    return {
      status: "ok",
      failure: null,
      matchingVersion: MATCHING_VERSION,
      normalizationVersion: NORMALIZATION_VERSION,
      computedAt,
      pool,
      candidates: people.map((p, i) => ({
        candidateId: p.personId,
        visiblePosition: i + 1,
        eligibility: results[i].eligibility.status,
        shadowRank: rankOf.get(p.personId)?.rank ?? null,
        tieGroup: rankOf.get(p.personId)?.tieGroup ?? null,
        reasonCodes: reasonCodes[i],
      })),
      counts: tally(results.map((r) => r.eligibility.status)),
    };
  } catch (error) {
    return failed(error instanceof StageError ? error.failure : "load_failed");
  }
}

function defaultServiceClient(): ShadowClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type ScheduleFindShadowOptions = Readonly<{
  env?: Readonly<Record<string, string | undefined>>;
  /** Next: `after` - läuft nach der Antwort. */
  schedule: (task: () => Promise<void>) => void;
  createServiceClient?: () => ShadowClient | null;
  /** Nur Tests und lokale Hilfen. Ohne Beobachter wird das Ergebnis verworfen. */
  onResult?: (result: FindMatchingShadowResult) => void;
}>;

/**
 * Plant den Shadow-Lauf ein, ohne die sichtbare Antwort zu berühren.
 * „disabled“: Flag aus - nichts passiert, kein Client, keine Abfrage.
 */
export function scheduleFindMatchingShadow(
  input: FindMatchingShadowInput,
  options: ScheduleFindShadowOptions,
): "disabled" | "scheduled" | "not_scheduled" {
  if (!isFindMatchingShadowEnabled(options.env)) return "disabled";
  try {
    options.schedule(async () => {
      try {
        const client = (options.createServiceClient ?? defaultServiceClient)();
        const result = await computeFindMatchingShadow(input, client);
        options.onResult?.(result);
      } catch {
        // Shadow darf nie etwas Sichtbares beeinflussen; kein Log, keine Werte.
      }
    });
    return "scheduled";
  } catch {
    return "not_scheduled";
  }
}
