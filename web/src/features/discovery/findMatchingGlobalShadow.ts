import "server-only";

import type { FounderDiscoveryProfile } from "@/features/discovery/discoveryTypes";
import {
  buildFindPersonInput,
  createShadowServiceClient,
  FIND_SHADOW_IDF_CORPUS_VERSION,
  hasMatchingPermission,
  pairKey,
  PERSON_CORE_MATCHING_COLUMNS,
  type CapabilityEntryRow,
  type MatchingCoreRow,
  type ShadowClient,
} from "@/features/discovery/findMatchingInputs";
import { loadFindMatchingPool } from "@/features/discovery/findMatchingPool";
import { getCandidateMatchingV01Constraints } from "@/features/discovery/privateSearchConstraints";
import { presentFindReasons } from "@/lib/matching/reasonPresentation";
import { EMPTY_MUST_HAVES } from "@/lib/matching/v01/adapters";
import { matchFindPair } from "@/lib/matching/v01/findMatcher";
import { rankWithTies } from "@/lib/matching/v01/ranking";
import type { FindMatchResult, FindMustHavesInput, FindPersonInput, GateStatus, Ranked } from "@/lib/matching/v01/types";
import { MATCHING_VERSION, NORMALIZATION_VERSION } from "@/lib/matching/v01/version";

/**
 * FIND Matching v0.1 – GLOBALER SHADOW (E2).
 *
 *   aktive FIND-Profile -> Basispool (nur Produkt-/Access-Gates)
 *   -> v0.1-Eingaben -> bilaterales Gate v03 -> Relevanz + Gegenseitigkeit
 *   -> globale stabile Reihenfolge -> ERST DANN Seiten
 *
 * Nichts davon erreicht Nutzer. Die sichtbare Suche (search_founder_discovery_profiles_v2)
 * bleibt unverändert. Keine Speicherung, keine Logs.
 *
 * Basispool (Produkt-/Access-Gates, Klasse A):
 *   - FIND-Profil `active`               (Pool-Voraussetzung Spec §7, wie heute)
 *   - Rolle `founder` (profiles.roles)    (Spec §7; heute in der Suche NICHT geprüft)
 *   - nicht die betrachtende Person
 *   - keine Blockierung (network_blocks, symmetrisch; heute in der Suche NICHT geprüft)
 * Private Must-haves sind KEIN Pool-Kriterium: Sie gehören ins Gate v03 (Klasse B).
 *
 * Doku: docs/research/matching-v0.1-find-shadow.md
 */

export const GLOBAL_FIND_SHADOW_FLAG = "MATCHING_FIND_V01_GLOBAL_SHADOW_ENABLED";

export function isGlobalFindMatchingShadowEnabled(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  const raw = env[GLOBAL_FIND_SHADOW_FLAG];
  return typeof raw === "string" && raw.trim().toLowerCase() === "true";
}

/** PostgREST liefert höchstens so viele Zeilen je Abfrage (supabase/config.toml max_rows). */
export const POPULATION_PAGE_SIZE = 1000;
/** Länge einer `in`-Liste (URL-Länge). */
export const ID_CHUNK_SIZE = 200;

/** Nur Spalten, die Matching oder der RPC-Vergleich brauchen - keine Namen, Headlines, Bios. */
export const FIND_PROFILE_MATCHING_COLUMNS =
  "user_id, own_roles, seeking_roles, expertise, location_region, remote_mode, availability_hours_per_week, " +
  "availability_flexibility, commitment_level, venture_stage, venture_goal, search_intent, start_horizon, published_at, updated_at";

type FindProfileRow = {
  user_id: string;
  own_roles: string[] | null;
  seeking_roles: string[] | null;
  expertise: string[] | null;
  location_region: string | null;
  remote_mode: string | null;
  availability_hours_per_week: number | null;
  availability_flexibility: string | null;
  commitment_level: string | null;
  venture_stage: string | null;
  venture_goal: string | null;
  search_intent: string | null;
  start_horizon: string | null;
  published_at: string | null;
  updated_at: string | null;
};

export class PopulationLoadError extends Error {
  constructor() {
    super("find_matching_population_load_failed");
    this.name = "PopulationLoadError";
  }
}

type Query = PromiseLike<{ data: unknown; error: unknown }>;
type RangeQuery = { range: (from: number, to: number) => Query };

async function rowsOf<T>(query: Query): Promise<T[]> {
  const { data, error } = await query;
  if (error || !Array.isArray(data)) throw new PopulationLoadError();
  return data as T[];
}

/** Blättert, bis eine Seite kürzer als POPULATION_PAGE_SIZE ist. */
async function allPages<T>(build: () => RangeQuery, counter: { queries: number }): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += POPULATION_PAGE_SIZE) {
    counter.queries += 1;
    const page = await rowsOf<T>(build().range(from, from + POPULATION_PAGE_SIZE - 1));
    out.push(...page);
    if (page.length < POPULATION_PAGE_SIZE) return out;
  }
}

function chunks<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}


export type FindMatchingPopulation = Readonly<{
  /** Aktive FIND-Profile (nur Matching-Spalten). */
  profiles: ReadonlyMap<string, FounderDiscoveryProfile>;
  founders: ReadonlySet<string>;
  core: ReadonlyMap<string, MatchingCoreRow>;
  /** Die acht v0.1-Kriterien je Person (Service-Role-Loader). Nie nach außen. */
  constraints: ReadonlyMap<string, FindMustHavesInput>;
  blockedPairs: ReadonlySet<string>;
  /** Nur Personen mit Matching-Freigabe. */
  entries: readonly CapabilityEntryRow[];
  familyOfArea: Readonly<Record<string, string>>;
  /** Angenommene Verbindungen - nur geladen, wenn Reasons gebraucht werden. */
  connectedPairs: ReadonlySet<string> | null;
  queryCount: number;
}>;

function profileFromRow(r: FindProfileRow): FounderDiscoveryProfile {
  return {
    id: "",
    userId: r.user_id,
    status: "active",
    displayName: "",
    headline: "",
    bio: "",
    ownRoles: (r.own_roles ?? []) as FounderDiscoveryProfile["ownRoles"],
    seekingRoles: (r.seeking_roles ?? []) as FounderDiscoveryProfile["seekingRoles"],
    ownRoleOther: null,
    seekingRoleOther: null,
    expertise: r.expertise ?? [],
    industries: [],
    locationRegion: r.location_region,
    remoteMode: r.remote_mode as FounderDiscoveryProfile["remoteMode"],
    availabilityHoursPerWeek: r.availability_hours_per_week,
    availabilityFlexibility: r.availability_flexibility as FounderDiscoveryProfile["availabilityFlexibility"],
    availabilityCondition: null,
    recentStep: null,
    commitmentLevel: r.commitment_level as FounderDiscoveryProfile["commitmentLevel"],
    ventureStage: r.venture_stage as FounderDiscoveryProfile["ventureStage"],
    ventureGoal: r.venture_goal as FounderDiscoveryProfile["ventureGoal"],
    searchIntent: r.search_intent as FounderDiscoveryProfile["searchIntent"],
    startHorizon: r.start_horizon as FounderDiscoveryProfile["startHorizon"],
    publishedAt: r.published_at,
    createdAt: "",
    updatedAt: r.updated_at ?? r.published_at ?? "",
  };
}

/**
 * Lädt alle Daten für den globalen Shadow einmal, set-basiert. Abfragen wachsen nur mit
 * ceil(N / 1000) bzw. ceil(N / 200), nie je Kandidat. Liest kein Workstyle, keine Research-
 * Daten, keine Namen/Texte. Wirft PopulationLoadError bei jedem Fehler (fail closed).
 */
export async function loadFindMatchingPopulation(
  client: ShadowClient,
  options: Readonly<{ withConnections?: boolean }> = {},
): Promise<FindMatchingPopulation> {
  const counter = { queries: 0 };
  const profileRows = await allPages<FindProfileRow>(
    () =>
      client
        .from("founder_discovery_profiles")
        .select(FIND_PROFILE_MATCHING_COLUMNS)
        .eq("status", "active")
        .order("user_id", { ascending: true }) as unknown as RangeQuery,
    counter,
  );
  const ids = profileRows.map((r) => r.user_id);

  const roleRows: { user_id: string; roles: string[] | null }[] = [];
  const coreRows: MatchingCoreRow[] = [];
  const constraints = new Map<string, FindMustHavesInput>();
  for (const chunk of chunks(ids, ID_CHUNK_SIZE)) {
    counter.queries += 3;
    const [roles, core, mustHaves] = await Promise.all([
      rowsOf<{ user_id: string; roles: string[] | null }>(client.from("profiles").select("user_id, roles").in("user_id", chunk)),
      rowsOf<MatchingCoreRow>(client.from("person_core").select(PERSON_CORE_MATCHING_COLUMNS).in("user_id", chunk)),
      getCandidateMatchingV01Constraints(client, chunk).catch(() => {
        throw new PopulationLoadError();
      }),
    ]);
    roleRows.push(...roles);
    coreRows.push(...core);
    for (const [id, m] of mustHaves) constraints.set(id, m);
  }
  const core = new Map(coreRows.map((r) => [r.user_id, r]));
  const population = new Set(ids);

  const blockRows = await allPages<{ blocker_user_id: string; blocked_user_id: string }>(
    () =>
      client
        .from("network_blocks")
        .select("blocker_user_id, blocked_user_id")
        .order("blocker_user_id", { ascending: true })
        .order("blocked_user_id", { ascending: true }) as unknown as RangeQuery,
    counter,
  );

  // Capability nur für Personen mit ausdrücklicher Matching-Freigabe.
  const allowedIds = ids.filter((id) => hasMatchingPermission(core.get(id)));
  const entries: CapabilityEntryRow[] = [];
  let familyOfArea: Record<string, string> = {};
  if (allowedIds.length > 0) {
    for (const chunk of chunks(allowedIds, ID_CHUNK_SIZE)) {
      entries.push(
        ...(await allPages<CapabilityEntryRow>(
          () =>
            client
              .from("person_capability_entries")
              .select("user_id, area_id, application_level, ownership_wish")
              .in("user_id", chunk)
              .order("user_id", { ascending: true })
              .order("area_id", { ascending: true }) as unknown as RangeQuery,
          counter,
        )),
      );
    }
    const areas = await allPages<{ area_id: string; family_id: string }>(
      () => client.from("capability_areas").select("area_id, family_id").order("area_id", { ascending: true }) as unknown as RangeQuery,
      counter,
    );
    familyOfArea = Object.fromEntries(areas.map((a) => [a.area_id, a.family_id]));
  }

  let connectedPairs: Set<string> | null = null;
  if (options.withConnections) {
    const intros = await allPages<{ requester_user_id: string; recipient_user_id: string }>(
      () =>
        client
          .from("discovery_intro_requests")
          .select("requester_user_id, recipient_user_id")
          .eq("status", "accepted")
          .order("id", { ascending: true }) as unknown as RangeQuery,
      counter,
    );
    const contacts = await allPages<{ sender_user_id: string; recipient_user_id: string }>(
      () =>
        client
          .from("network_contact_requests")
          .select("sender_user_id, recipient_user_id")
          .eq("status", "accepted")
          .order("id", { ascending: true }) as unknown as RangeQuery,
      counter,
    );
    connectedPairs = new Set([
      ...intros.map((r) => pairKey(r.requester_user_id, r.recipient_user_id)),
      ...contacts.map((r) => pairKey(r.sender_user_id, r.recipient_user_id)),
    ]);
  }

  return {
    profiles: new Map(profileRows.map((r) => [r.user_id, profileFromRow(r)])),
    founders: new Set(roleRows.filter((r) => (r.roles ?? []).includes("founder")).map((r) => r.user_id)),
    core,
    constraints,
    blockedPairs: new Set(
      blockRows
        .filter((r) => population.has(r.blocker_user_id) || population.has(r.blocked_user_id))
        .map((r) => pairKey(r.blocker_user_id, r.blocked_user_id)),
    ),
    entries,
    familyOfArea,
    connectedPairs,
    queryCount: counter.queries,
  };
}

const EMPTY_POPULATION: FindMatchingPopulation = {
  profiles: new Map(),
  founders: new Set(),
  core: new Map(),
  constraints: new Map(),
  blockedPairs: new Set(),
  entries: [],
  familyOfArea: {},
  connectedPairs: null,
  queryCount: 0,
};

export type FindBasePool = Readonly<{
  viewer: FounderDiscoveryProfile;
  candidates: readonly FounderDiscoveryProfile[];
  stats: Readonly<{ activeProfiles: number; baseCandidates: number; excludedNoFounderRole: number; excludedBlocked: number }>;
}>;

/** Nur Produkt-/Access-Gates. null: die betrachtende Person ist selbst nicht im Pool (nicht aktiv / kein Founder). */
export function findBasePool(population: FindMatchingPopulation, viewerUserId: string): FindBasePool | null {
  const viewer = population.profiles.get(viewerUserId);
  if (!viewer || !population.founders.has(viewerUserId)) return null;
  let excludedNoFounderRole = 0;
  let excludedBlocked = 0;
  const candidates: FounderDiscoveryProfile[] = [];
  for (const [id, profile] of population.profiles) {
    if (id === viewerUserId) continue;
    if (!population.founders.has(id)) {
      excludedNoFounderRole += 1;
      continue;
    }
    if (population.blockedPairs.has(pairKey(id, viewerUserId))) {
      excludedBlocked += 1;
      continue;
    }
    candidates.push(profile);
  }
  return {
    viewer,
    candidates,
    stats: { activeProfiles: population.profiles.size, baseCandidates: candidates.length, excludedNoFounderRole, excludedBlocked },
  };
}

export type GlobalFindShadowRun = Readonly<{
  status: "ok" | "failed" | "viewer_not_in_pool";
  failure: "engine_failed" | "presenter_failed" | null;
  matchingVersion: string;
  normalizationVersion: string;
  computedAt: string;
  pool: FindBasePool["stats"] | null;
  counts: Readonly<{ candidates: number; eligible: number; uncertain: number; ineligible: number }>;
  /** INTERN: global gerankte Engine-Ergebnisse (enthalten Gate-Gründe) - verlassen den Server nie. */
  ranked: readonly Ranked<FindMatchResult>[];
  /** INTERN: Gate-Status je Kandidat des Basispools. */
  statusById: ReadonlyMap<string, GateStatus>;
  /** INTERN, nur mit `withReasons`: präsentierbare Reason-Codes je zulässigem Kandidaten. */
  reasonCodesById: ReadonlyMap<string, readonly string[]> | null;
}>;

const tally = (statuses: readonly GateStatus[]) => ({
  candidates: statuses.length,
  eligible: statuses.filter((s) => s === "eligible").length,
  uncertain: statuses.filter((s) => s === "uncertain").length,
  ineligible: statuses.filter((s) => s === "ineligible").length,
});

/**
 * Reiner Kern: Gate und globales Ranking über vorbereitete Eingaben - der eine kanonische
 * Baustein für Seiten-Shadow (E1), globalen Shadow (E2/E3a) und den v0.1-Rankingpfad (E3b).
 * Gerankt wird nach Gegenseitigkeit unter eligible/uncertain, Gleichstände wie die Engine.
 */
export function rankGlobalFindShadow(
  viewer: FindPersonInput,
  candidates: readonly FindPersonInput[],
  ctx: Readonly<{ familyOfArea: Readonly<Record<string, string>>; computedAt: string; blockedPersonIds?: ReadonlySet<string> }>,
): { results: FindMatchResult[]; ranked: Ranked<FindMatchResult>[] } {
  const base = { familyOfArea: ctx.familyOfArea, idfCorpusVersion: FIND_SHADOW_IDF_CORPUS_VERSION, computedAt: ctx.computedAt };
  const blocked = ctx.blockedPersonIds ?? new Set<string>();
  // Jedes Paar genau einmal (E3b). Der Rang entsteht aus denselben Ergebnissen genau wie in
  // rankFindCandidates: ohne `ineligible`, Wert = Gegenseitigkeit, Anzeige-Reihenfolge
  // published_at, dann ID (rankWithTies). Paritätstest: findMatchingRanking.test.ts.
  const results = candidates.map((c) => matchFindPair(viewer, c, { ...base, blocked: blocked.has(c.personId) }));
  const ranked = rankWithTies(
    candidates.flatMap((c, i) =>
      results[i].eligibility.status === "ineligible"
        ? []
        : [{ result: results[i], score: results[i].relevance.mutuality, publishedAt: c.publishedAt, id: c.personId }],
    ),
  );
  return { results, ranked };
}

/** Globaler Shadow-Lauf für eine Person. Rein (keine I/O), wirft nie. */
export function runGlobalFindMatchingShadow(
  population: FindMatchingPopulation,
  viewerUserId: string,
  options: Readonly<{ now?: () => Date; withReasons?: boolean }> = {},
): GlobalFindShadowRun {
  const computedAt = (options.now ?? (() => new Date()))().toISOString();
  const empty = {
    matchingVersion: MATCHING_VERSION,
    normalizationVersion: NORMALIZATION_VERSION,
    computedAt,
    counts: tally([]),
    ranked: [],
    statusById: new Map<string, GateStatus>(),
    reasonCodesById: null,
  };
  const pool = findBasePool(population, viewerUserId);
  if (!pool) return { ...empty, status: "viewer_not_in_pool", failure: null, pool: null };

  // Einträge einmal je Person gruppieren (E3b): vorher filterte jede Person die ganze Liste -
  // bei 10.000 Personen quadratisch. Gleicher Inhalt, gleiche Reihenfolge je Person.
  const entriesByUser = new Map<string, CapabilityEntryRow[]>();
  for (const entry of population.entries) {
    const list = entriesByUser.get(entry.user_id);
    if (list) list.push(entry);
    else entriesByUser.set(entry.user_id, [entry]);
  }
  const parts = (userId: string) => ({
    core: population.core.get(userId),
    isFounder: population.founders.has(userId),
    entries: entriesByUser.get(userId) ?? [],
    hasContact: userId !== viewerUserId && (population.connectedPairs?.has(pairKey(userId, viewerUserId)) ?? false),
  });
  let results: FindMatchResult[];
  let ranked: Ranked<FindMatchResult>[];
  let people: FindPersonInput[];
  try {
    const viewer = buildFindPersonInput(pool.viewer, population.constraints.get(viewerUserId) ?? EMPTY_MUST_HAVES, parts(viewerUserId));
    people = pool.candidates.map((c) => buildFindPersonInput(c, population.constraints.get(c.userId) ?? EMPTY_MUST_HAVES, parts(c.userId)));
    ({ results, ranked } = rankGlobalFindShadow(viewer, people, { familyOfArea: population.familyOfArea, computedAt }));
  } catch {
    return { ...empty, status: "failed", failure: "engine_failed", pool: pool.stats };
  }

  let reasonCodesById: Map<string, readonly string[]> | null = null;
  if (options.withReasons) {
    try {
      reasonCodesById = new Map(
        results
          .filter((r) => r.eligibility.status !== "ineligible")
          .map((r) => [r.subject.b, presentFindReasons(r, { side: "a" }).reasons.map((x) => x.code)]),
      );
    } catch {
      return { ...empty, status: "failed", failure: "presenter_failed", pool: pool.stats };
    }
  }

  return {
    status: "ok",
    failure: null,
    matchingVersion: MATCHING_VERSION,
    normalizationVersion: NORMALIZATION_VERSION,
    computedAt,
    pool: pool.stats,
    counts: tally(results.map((r) => r.eligibility.status)),
    ranked,
    statusById: new Map(people.map((p, i) => [p.personId, results[i].eligibility.status])),
    reasonCodesById,
  };
}

export type FindShadowPage<T> = Readonly<{ page: number; pageSize: number; totalEligible: number; totalPages: number; items: readonly T[] }>;

/** Seiten ERST nach dem globalen Ranking. Einfache stabile Seiten wie heute (12 je Seite). */
export function paginateFindShadow<T>(ranked: readonly T[], page: number, pageSize = 12): FindShadowPage<T> {
  const size = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 12;
  const totalPages = Math.max(1, Math.ceil(ranked.length / size));
  const current = Number.isFinite(page) ? Math.min(Math.max(1, Math.floor(page)), totalPages) : 1;
  return { page: current, pageSize: size, totalEligible: ranked.length, totalPages, items: ranked.slice((current - 1) * size, current * size) };
}

export type ScheduleGlobalFindShadowOptions = Readonly<{
  env?: Readonly<Record<string, string | undefined>>;
  schedule: (task: () => Promise<void>) => void;
  createServiceClient?: () => ShadowClient | null;
  /** Nur Tests und lokale Hilfen. Ohne Beobachter wird das Ergebnis verworfen. */
  onResult?: (result: GlobalFindShadowRun | { status: "failed"; failure: "service_unavailable" | "load_failed" }) => void;
  /**
   * Standard seit E3a: set-basierter Pool (get_find_matching_pool_for_viewer) + Inputs.
   * null = die Person sucht selbst nicht.
   */
  loadPopulation?: (client: ShadowClient, viewerUserId: string) => Promise<FindMatchingPopulation | null>;
}>;

async function loadPoolPopulation(client: ShadowClient, viewerUserId: string): Promise<FindMatchingPopulation | null> {
  const load = await loadFindMatchingPool(client as Parameters<typeof loadFindMatchingPool>[0], { kind: "service", viewerUserId });
  return load.population;
}

/**
 * Plant den globalen Shadow nach der Antwort ein. Lädt seit E3a nur den Pool der Person
 * (set-basiert, zwei bis drei Abfragen) statt der ganzen Population. Wirft nie.
 */
export function scheduleGlobalFindMatchingShadow(
  viewerUserId: string,
  options: ScheduleGlobalFindShadowOptions,
): "disabled" | "scheduled" | "not_scheduled" {
  if (!isGlobalFindMatchingShadowEnabled(options.env)) return "disabled";
  try {
    options.schedule(async () => {
      try {
        const client = (options.createServiceClient ?? createShadowServiceClient)();
        if (!client) return options.onResult?.({ status: "failed", failure: "service_unavailable" });
        let population: FindMatchingPopulation | null;
        try {
          population = await (options.loadPopulation ?? loadPoolPopulation)(client, viewerUserId);
        } catch {
          return options.onResult?.({ status: "failed", failure: "load_failed" });
        }
        if (!population) return options.onResult?.(runGlobalFindMatchingShadow(EMPTY_POPULATION, viewerUserId));
        options.onResult?.(runGlobalFindMatchingShadow(population, viewerUserId));
      } catch {
        // Shadow darf nie etwas Sichtbares beeinflussen; kein Log, keine Werte.
      }
    });
    return "scheduled";
  } catch {
    return "not_scheduled";
  }
}
