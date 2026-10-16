import { POPULATION_PAGE_SIZE } from "@/features/discovery/findMatchingGlobalShadow";

/**
 * Gemeinsame Fake-Welt für Pool- und Ranking-Tests (E3a/E3b): Tabellen wie in der Datenbank,
 * dazu Fakes der RPCs get_find_matching_pool*, get_find_matching_inputs mit den Gates aus
 * find_matching_pool_core (dort per pgTAP geprüft).
 */
export const NOW = () => new Date("2026-10-16T10:00:00.000Z");
export const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const V = uid(1);

export type Row = Record<string, unknown>;
export type World = { profiles: Row[]; roles: Row[]; core: Row[]; prefs: Row[]; blocks: Row[]; entries: Row[]; intros: Row[] };

export const product = { requiredIndustriesAny: ["Geheimbranche"], acceptedCommitmentLevels: ["full_time"], acceptedVentureStages: ["already_building"], acceptedVentureGoals: ["exit_oriented"] };

export function world(n: number): World {
  const ids = Array.from({ length: n }, (_, i) => i + 1);
  const roleCycle = [["tech"], ["sales"], ["product"], ["design"]];
  return {
    profiles: ids.map((i) => ({
      id: `fdp-${i}`, user_id: uid(i), status: i % 17 === 0 ? "paused" : "active",
      own_roles: roleCycle[i % 4], seeking_roles: roleCycle[(i + 1) % 4], expertise: [], location_region: "Berlin", remote_mode: "remote",
      availability_hours_per_week: 10 + (i % 30), availability_flexibility: null, commitment_level: i % 2 ? "part_time" : "full_time",
      venture_stage: i % 3 ? "idea_validating" : "exploring", venture_goal: "profitable_business",
      search_intent: i % 5 ? "ready_now" : null, start_horizon: "now",
      published_at: `2026-09-${String((i % 28) + 1).padStart(2, "0")}T00:00:00Z`, updated_at: "2026-10-01T00:00:00Z",
    })),
    roles: ids.map((i) => ({ user_id: uid(i), roles: i % 13 === 0 ? ["advisor"] : ["founder"] })),
    core: ids.map((i) => ({
      user_id: uid(i), industries: ["Software"], expertise: ["Vertrieb"], location_region: i % 7 ? "Berlin" : null, remote_mode: "remote",
      capability_disclosure: "areas_depth_on_contact", capability_matching_allowed: i % 3 === 0,
    })),
    prefs: ids.filter((i) => i % 4 === 0).map((i) => ({ user_id: uid(i), must_haves: { requiredRolesAny: ["tech"], minimumAvailabilityHoursPerWeek: 20, ...product } })),
    blocks: [{ blocker_user_id: uid(11), blocked_user_id: V }, { blocker_user_id: V, blocked_user_id: uid(12) }],
    entries: ids.flatMap((i) => [{ user_id: uid(i), area_id: "b2b_sales", application_level: (i % 5) + 1, ownership_wish: i % 2 ? "own" : "prefer_other" }]),
    intros: [{ requester_user_id: V, recipient_user_id: uid(3), status: "accepted" }],
  };
}

export const AREAS = [{ area_id: "b2b_sales", family_id: "commercial_growth" }];
const isFounder = (w: World, id: string) => (w.roles.find((r) => r.user_id === id)?.roles as string[]).includes("founder");
const blocked = (w: World, a: string, b: string) => w.blocks.some((x) => (x.blocker_user_id === a && x.blocked_user_id === b) || (x.blocker_user_id === b && x.blocked_user_id === a));

/** Fake der Datenbankfunktionen - Gates wie find_matching_pool_core (dort per pgTAP geprüft). */
export function rpcClient(w: World, opts: { fail?: "pool" | "inputs" | "areas" | "throw" } = {}) {
  const calls: { name: string; ids?: number }[] = [];
  const pick = (p: Row) => {
    const out: Row = {};
    for (const k of ["user_id", "own_roles", "seeking_roles", "availability_hours_per_week", "availability_flexibility", "commitment_level", "venture_stage", "venture_goal", "search_intent", "start_horizon", "published_at", "updated_at"]) out[k] = p[k];
    out.profile_id = p.id;
    out.has_contact = w.intros.some((x) => x.status === "accepted" && ((x.requester_user_id === V && x.recipient_user_id === p.user_id) || (x.recipient_user_id === V && x.requester_user_id === p.user_id)));
    return out;
  };
  const pool = (viewer: string) => {
    const me = w.profiles.find((p) => p.user_id === viewer);
    if (!me || me.status !== "active" || !isFounder(w, viewer)) return null;
    return {
      viewer: { ...pick(me), has_contact: false },
      candidates: w.profiles
        .filter((p) => p.status === "active" && p.user_id !== viewer && isFounder(w, p.user_id as string) && !blocked(w, p.user_id as string, viewer))
        .map(pick),
    };
  };
  const eight = ["requiredRolesAny", "minimumAvailabilityHoursPerWeek", "acceptedRemoteModes", "desiredLocationRegion", "acceptedSearchIntents", "acceptedStartHorizons", "requiredCapabilityAreasAny", "requiredExpertiseAny"];
  const client = {
    rpc(name: string, args: Record<string, unknown> = {}) {
      if (opts.fail === "throw") return Promise.reject(new Error("netz"));
      if (name === "get_find_matching_pool_for_viewer" || name === "get_find_matching_pool") {
        calls.push({ name });
        if (opts.fail === "pool") return Promise.resolve({ data: null, error: { code: "x" } });
        return Promise.resolve({ data: pool((args.p_viewer as string) ?? V), error: null });
      }
      if (name === "get_find_matching_inputs") {
        const ids = args.p_user_ids as string[];
        calls.push({ name, ids: ids.length });
        if (opts.fail === "inputs") return Promise.resolve({ data: null, error: { code: "x" } });
        return Promise.resolve({
          data: w.core.filter((c) => ids.includes(c.user_id as string)).map((c) => {
            const pref = w.prefs.find((p) => p.user_id === c.user_id)?.must_haves as Row | undefined;
            return {
              ...c,
              must_haves: pref ? Object.fromEntries(Object.entries(pref).filter(([k]) => eight.includes(k))) : null,
              capability_entries: c.capability_matching_allowed ? w.entries.filter((e) => e.user_id === c.user_id).map(({ user_id: _u, ...rest }) => rest) : [],
            };
          }),
          error: null,
        });
      }
      throw new Error(`unerwarteter RPC ${name}`);
    },
    from(table: string) {
      calls.push({ name: `from:${table}` });
      const chain = {
        select: () => chain,
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve(opts.fail === "areas" ? { data: null, error: { code: "x" } } : { data: table === "capability_areas" ? AREAS : [], error: null }).then(resolve),
      };
      return chain;
    },
  };
  return { client: client as never, calls };
}

/** Tabellen-Fake für den E2-Lader (gleiche Welt). */
export function tableClient(w: World) {
  const tables: Record<string, Row[]> = {
    founder_discovery_profiles: w.profiles, profiles: w.roles, person_core: w.core, founder_search_preferences: w.prefs,
    network_blocks: w.blocks, person_capability_entries: w.entries, capability_areas: AREAS, discovery_intro_requests: w.intros, network_contact_requests: [],
  };
  return {
    from(table: string) {
      let rows = [...(tables[table] ?? [])];
      const chain = {
        select: () => chain,
        eq: (c: string, v: unknown) => ((rows = rows.filter((r) => r[c] === v)), chain),
        in: (c: string, v: unknown[]) => ((rows = rows.filter((r) => v.includes(r[c]))), chain),
        order: (c: string) => ((rows = [...rows].sort((a, b) => String(a[c] ?? "").localeCompare(String(b[c] ?? "")))), chain),
        range: (from: number, to: number) => ((rows = rows.slice(from, Math.min(to + 1, from + POPULATION_PAGE_SIZE))), chain),
        then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve),
      };
      return chain;
    },
  } as never;
}

