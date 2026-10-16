import "server-only";

import type { FounderDiscoveryProfile } from "@/features/discovery/discoveryTypes";
import type { FindMatchingPopulation } from "@/features/discovery/findMatchingGlobalShadow";
import { pairKey, type CapabilityEntryRow, type MatchingCoreRow, type ShadowClient } from "@/features/discovery/findMatchingInputs";
import { privateSearchConstraintsFromStored } from "@/features/discovery/privateSearchConstraints";
import type { FindMustHavesInput } from "@/lib/matching/v01/types";

/**
 * FIND Matching v0.1 – produktionsfähiger Kandidatenpool (E3a).
 *
 *   Pool    get_find_matching_pool()                 angemeldete Person (auth.uid())
 *           get_find_matching_pool_for_viewer(id)    nur service_role (Shadow, Auswertung)
 *   Inputs  get_find_matching_inputs(ids)            nur service_role
 *
 * Der Pool wendet NUR Produkt-/Access-Gates an (aktiv, Founder, nicht selbst, keine
 * Blockierung). Das Gate v03, Relevanz, Gegenseitigkeit, Rang und Seiten bleiben in der
 * Engine. Das Ergebnis ist eine FindMatchingPopulation (Betrachter + Pool), damit
 * runGlobalFindMatchingShadow, findBasePool und paginateFindShadow unverändert laufen.
 *
 * Abfragen: Pool 1 + Inputs ceil(N / INPUT_CHUNK_SIZE) + Bereichsfamilien 0–1.
 * Nichts davon wird geloggt oder gespeichert.
 */

export const INPUT_CHUNK_SIZE = 2000;

type RpcClient = {
  rpc: (name: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
};
type ServiceClient = ShadowClient & RpcClient;

type PoolRow = {
  user_id: string;
  profile_id: string;
  own_roles: string[] | null;
  seeking_roles: string[] | null;
  availability_hours_per_week: number | null;
  availability_flexibility: string | null;
  commitment_level: string | null;
  venture_stage: string | null;
  venture_goal: string | null;
  search_intent: string | null;
  start_horizon: string | null;
  published_at: string | null;
  updated_at: string | null;
  has_contact: boolean;
};
type PoolDocument = { viewer: PoolRow; candidates: PoolRow[] };

type InputRow = MatchingCoreRow & {
  must_haves: Record<string, unknown> | null;
  capability_entries: Array<{ area_id: string; application_level: number | null; ownership_wish: string | null }>;
};

export class FindMatchingPoolError extends Error {
  readonly stage: "pool" | "inputs" | "areas";
  constructor(stage: "pool" | "inputs" | "areas") {
    super(`find_matching_pool_${stage}_failed`);
    this.name = "FindMatchingPoolError";
    this.stage = stage;
  }
}

export type FindMatchingPoolTimings = Readonly<{ poolMs: number; inputsMs: number; areasMs: number; assemblyMs: number }>;
export type FindMatchingPoolLoad = Readonly<{
  /** null: Die betrachtende Person sucht selbst nicht (kein aktives FIND-Profil / kein Founder). */
  population: FindMatchingPopulation | null;
  timings: FindMatchingPoolTimings;
  payloadBytes: Readonly<{ pool: number; inputs: number }>;
}>;

function profileFromPoolRow(r: PoolRow): FounderDiscoveryProfile {
  return {
    id: r.profile_id,
    userId: r.user_id,
    status: "active",
    displayName: "",
    headline: "",
    bio: "",
    ownRoles: (r.own_roles ?? []) as FounderDiscoveryProfile["ownRoles"],
    seekingRoles: (r.seeking_roles ?? []) as FounderDiscoveryProfile["seekingRoles"],
    ownRoleOther: null,
    seekingRoleOther: null,
    // Branchen, Expertise, Ort, Remote kommen aus person_core (Inputs).
    expertise: [],
    industries: [],
    locationRegion: null,
    remoteMode: null as unknown as FounderDiscoveryProfile["remoteMode"],
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

async function call(client: RpcClient, name: string, args: Record<string, unknown> | undefined, stage: "pool" | "inputs") {
  try {
    const { data, error } = await client.rpc(name, args);
    if (error) throw new FindMatchingPoolError(stage);
    return data;
  } catch (error) {
    if (error instanceof FindMatchingPoolError) throw error;
    throw new FindMatchingPoolError(stage);
  }
}

const sizeOf = (value: unknown) => (value == null ? 0 : JSON.stringify(value).length);

/**
 * Lädt Pool und Eingaben. `viewer`:
 *   { kind: "session", client }        Pool über die Sitzung (auth.uid(), ohne Service-Role-Pool)
 *   { kind: "service", viewerUserId }  Pool über get_find_matching_pool_for_viewer (Server-Shadow)
 * Eingaben immer über den Service-Client (fremde person_core-Zeilen und Kriterien sind nur dort lesbar).
 * Jeder Fehler wirft FindMatchingPoolError - nie still leere Daten.
 */
export async function loadFindMatchingPool(
  serviceClient: ServiceClient,
  viewer: Readonly<{ kind: "session"; client: RpcClient } | { kind: "service"; viewerUserId: string }>,
  now: () => number = () => performance.now(),
): Promise<FindMatchingPoolLoad> {
  const t0 = now();
  const poolData =
    viewer.kind === "session"
      ? await call(viewer.client, "get_find_matching_pool", undefined, "pool")
      : await call(serviceClient, "get_find_matching_pool_for_viewer", { p_viewer: viewer.viewerUserId }, "pool");
  const t1 = now();
  if (poolData === null || poolData === undefined) {
    return { population: null, timings: { poolMs: t1 - t0, inputsMs: 0, areasMs: 0, assemblyMs: 0 }, payloadBytes: { pool: 0, inputs: 0 } };
  }
  const pool = poolData as PoolDocument;
  if (!pool.viewer || !Array.isArray(pool.candidates)) throw new FindMatchingPoolError("pool");

  const ids = [pool.viewer.user_id, ...pool.candidates.map((c) => c.user_id)];
  const inputs: InputRow[] = [];
  let inputBytes = 0;
  for (let i = 0; i < ids.length; i += INPUT_CHUNK_SIZE) {
    const data = await call(serviceClient, "get_find_matching_inputs", { p_user_ids: ids.slice(i, i + INPUT_CHUNK_SIZE) }, "inputs");
    if (!Array.isArray(data)) throw new FindMatchingPoolError("inputs");
    inputBytes += sizeOf(data);
    inputs.push(...(data as InputRow[]));
  }
  const t2 = now();

  // Bereichsfamilien nur, wenn überhaupt jemand Capability fürs Matching freigegeben hat.
  let familyOfArea: Record<string, string> = {};
  if (inputs.some((row) => row.capability_entries.length > 0)) {
    const { data, error } = await serviceClient.from("capability_areas").select("area_id, family_id");
    if (error || !Array.isArray(data)) throw new FindMatchingPoolError("areas");
    familyOfArea = Object.fromEntries((data as Array<{ area_id: string; family_id: string }>).map((a) => [a.area_id, a.family_id]));
  }
  const t3 = now();

  const viewerId = pool.viewer.user_id;
  const rows = [pool.viewer, ...pool.candidates];
  const constraints = new Map<string, FindMustHavesInput>();
  const entries: CapabilityEntryRow[] = [];
  for (const row of inputs) {
    constraints.set(row.user_id, privateSearchConstraintsFromStored(row.user_id, row.must_haves, row.must_haves !== null).matchingV01);
    if (row.capability_matching_allowed === true) {
      for (const e of row.capability_entries) {
        entries.push({ user_id: row.user_id, area_id: e.area_id, application_level: e.application_level, ownership_wish: e.ownership_wish } as CapabilityEntryRow);
      }
    }
  }
  const population: FindMatchingPopulation = {
    profiles: new Map(rows.map((r) => [r.user_id, profileFromPoolRow(r)])),
    // Der Pool enthält nur Founder; die betrachtende Person ist ebenfalls geprüft.
    founders: new Set(rows.map((r) => r.user_id)),
    core: new Map(inputs.map((row) => [row.user_id, row])),
    constraints,
    // Blockierte sind gar nicht im Pool.
    blockedPairs: new Set(),
    entries,
    familyOfArea,
    connectedPairs: new Set(pool.candidates.filter((c) => c.has_contact).map((c) => pairKey(c.user_id, viewerId))),
    queryCount: 1 + Math.ceil(ids.length / INPUT_CHUNK_SIZE) + (Object.keys(familyOfArea).length > 0 ? 1 : 0),
  };
  const t4 = now();
  return {
    population,
    timings: { poolMs: t1 - t0, inputsMs: t2 - t1, areasMs: t3 - t2, assemblyMs: t4 - t3 },
    payloadBytes: { pool: sizeOf(poolData), inputs: inputBytes },
  };
}
