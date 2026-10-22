import "server-only";

import { runGlobalFindMatchingShadow, type FindMatchingPopulation } from "@/features/discovery/findMatchingGlobalShadow";
import { pairKey } from "@/features/discovery/findMatchingInputs";
import { EMPTY_MUST_HAVES } from "@/lib/matching/v01/adapters";
import type { FindMatchResult, FindMustHavesInput, GateStatus, Ranked } from "@/lib/matching/v01/types";

/**
 * Auswertung FIND heute vs. globaler v0.1-Shadow (E2). Nur Kennzahlen - keine IDs,
 * Namen, Kriterien, Orte, Texte oder Capability-Werte im Ergebnis.
 *
 * `currentFindRpcOrder` bildet den WHERE-Teil und die Sortierung von
 * search_founder_discovery_profiles_v2 in der aktuellen Fassung
 * (20261130120000_find_access_integrity.sql) für die Auswertung nach - einseitig,
 * Ja/Nein, fehlende Werte schließen aus; seit 80f39156 nur Founder und ohne
 * Blockierung (beide Richtungen). Den Capability-Filter kann sie nicht nachbilden (er
 * liest Einträge ohne Matching-Freigabe); solche Suchen gelten als „nicht vergleichbar“.
 * Auch den Einsatz-Filter (seit 20261216120000) kennt die Nachbildung nicht: v0.1 hat acht Gate-
 * Kriterien und lädt ihn nicht. Wer danach sucht, erscheint in der Auswertung mit zu vielen
 * Treffern der heutigen Suche. Aufnahme wäre eine neue matching_version.
 *
 * Aus den Zahlen folgt keine Qualitätsaussage und keine automatische Produktentscheidung.
 */

export type RpcComparableCandidate = Readonly<{
  userId: string;
  publishedAt: string | null;
  ownRoles: readonly string[];
  expertise: readonly string[];
  locationRegion: string | null;
  remoteMode: string | null;
  availabilityHoursPerWeek: number | null;
  searchIntent: string | null;
  startHorizon: string | null;
  /** Inhaber aktuell Founder (seit 80f39156 Bedingung der Suche). Fehlt die Angabe, gilt true. */
  isFounder?: boolean;
  /** Blockierung mit der betrachtenden Person, beliebige Richtung (seit 80f39156). */
  blockedWithViewer?: boolean;
}>;

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
/** Wie die Suche: verglichen wird der Ort vor dem ersten Komma ("Berlin, DE" = "Berlin"). */
const city = (s: string | null | undefined) => norm((s ?? "").split(",")[0]);

/** Reihenfolge aller Treffer der heutigen Suche (alle Seiten). "not_comparable" bei Capability-Filter. */
export function currentFindRpcOrder(
  mustHaves: FindMustHavesInput,
  candidates: readonly RpcComparableCandidate[],
): string[] | "not_comparable" {
  if (mustHaves.requiredCapabilityAreasAny.length > 0) return "not_comparable";
  const location = norm(mustHaves.desiredLocationRegion);
  const expertise = new Set(mustHaves.requiredExpertiseAny.map(norm));
  const hits = candidates.filter((c) => {
    if (c.isFounder === false || c.blockedWithViewer === true) return false;
    if (mustHaves.requiredRolesAny.length > 0 && !c.ownRoles.some((r) => mustHaves.requiredRolesAny.includes(r))) return false;
    if (expertise.size > 0 && !c.expertise.some((e) => expertise.has(norm(e)))) return false;
    if (location && (norm(c.locationRegion) === "" || city(c.locationRegion) !== city(location))) return false;
    if (mustHaves.acceptedRemoteModes.length > 0 && (c.remoteMode === null || !mustHaves.acceptedRemoteModes.includes(c.remoteMode))) return false;
    if (mustHaves.minimumAvailabilityHoursPerWeek !== null) {
      if (c.availabilityHoursPerWeek === null || c.availabilityHoursPerWeek < mustHaves.minimumAvailabilityHoursPerWeek) return false;
    }
    if (mustHaves.acceptedSearchIntents.length > 0 && (c.searchIntent === null || !mustHaves.acceptedSearchIntents.includes(c.searchIntent))) return false;
    if (mustHaves.acceptedStartHorizons.length > 0 && (c.startHorizon === null || !mustHaves.acceptedStartHorizons.includes(c.startHorizon))) return false;
    return true;
  });
  return [...hits]
    .sort((x, y) => {
      if (x.publishedAt !== y.publishedAt) {
        if (x.publishedAt === null) return 1;
        if (y.publishedAt === null) return -1;
        return x.publishedAt < y.publishedAt ? 1 : -1;
      }
      return x.userId < y.userId ? -1 : x.userId > y.userId ? 1 : 0;
    })
    .map((c) => c.userId);
}

export type FindShadowEvaluation = Readonly<{
  baseCandidates: number;
  excludedNoFounderRole: number;
  excludedBlocked: number;
  eligible: number;
  uncertain: number;
  ineligible: number;
  visibleTotal: number;
  visiblePage1: number;
  top12Overlap: number;
  shadowTop12NotOnVisiblePage1: number;
  /** Heute sichtbar, aber von v0.1 ausgeschlossen (Gate oder Basispool). */
  visibleExcludedByV01: number;
  /** v0.1 eligible/uncertain, aber von der heutigen Suche schon herausgefiltert. */
  v01KeptButNotInRpc: number;
  positionsCompared: number;
  positionsUnchanged: number;
  positionsMovedUp: number;
  positionsMovedDown: number;
  medianAbsPositionChange: number;
  tieGroups: number;
  candidatesInTies: number;
  tieAtRank1: boolean;
  tieAcrossPageBoundary: boolean;
}>;

type RunLike = Readonly<{
  pool: Readonly<{ baseCandidates: number; excludedNoFounderRole: number; excludedBlocked: number }> | null;
  counts: Readonly<{ eligible: number; uncertain: number; ineligible: number }>;
  ranked: readonly Ranked<FindMatchResult>[];
  statusById: ReadonlyMap<string, GateStatus>;
}>;

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function evaluateFindShadow(visibleOrder: readonly string[], run: RunLike, pageSize = 12): FindShadowEvaluation {
  const shadowOrder = run.ranked.map((r) => r.result.subject.b);
  const shadowPos = new Map(shadowOrder.map((id, i) => [id, i + 1]));
  const visiblePos = new Map(visibleOrder.map((id, i) => [id, i + 1]));
  const visiblePage1 = new Set(visibleOrder.slice(0, pageSize));
  const shadowTop = shadowOrder.slice(0, pageSize);
  const overlap = shadowTop.filter((id) => visiblePage1.has(id)).length;

  const moves: number[] = [];
  let up = 0;
  let down = 0;
  for (const [id, sp] of shadowPos) {
    const vp = visiblePos.get(id);
    if (vp === undefined) continue;
    moves.push(Math.abs(vp - sp));
    if (sp < vp) up += 1;
    else if (sp > vp) down += 1;
  }

  const groups = new Map<string, number[]>();
  for (const r of run.ranked) if (r.tieGroup) groups.set(r.tieGroup, [...(groups.get(r.tieGroup) ?? []), r.rank]);
  const tieAcrossPageBoundary = [...groups.values()].some((ranks) => ranks.some((x) => x <= pageSize) && ranks.some((x) => x > pageSize));

  return {
    baseCandidates: run.pool?.baseCandidates ?? 0,
    excludedNoFounderRole: run.pool?.excludedNoFounderRole ?? 0,
    excludedBlocked: run.pool?.excludedBlocked ?? 0,
    eligible: run.counts.eligible,
    uncertain: run.counts.uncertain,
    ineligible: run.counts.ineligible,
    visibleTotal: visibleOrder.length,
    visiblePage1: visiblePage1.size,
    top12Overlap: overlap,
    shadowTop12NotOnVisiblePage1: shadowTop.length - overlap,
    visibleExcludedByV01: visibleOrder.filter((id) => !shadowPos.has(id)).length,
    v01KeptButNotInRpc: shadowOrder.filter((id) => !visiblePos.has(id)).length,
    positionsCompared: moves.length,
    positionsUnchanged: moves.length - up - down,
    positionsMovedUp: up,
    positionsMovedDown: down,
    medianAbsPositionChange: median(moves),
    tieGroups: groups.size,
    candidatesInTies: [...groups.values()].reduce((n, g) => n + g.length, 0),
    tieAtRank1: run.ranked[0]?.tieGroup != null,
    tieAcrossPageBoundary,
  };
}

export type FindShadowAggregate = Readonly<{
  viewers: number;
  viewersEvaluated: number;
  viewersNotComparable: number;
  viewersNotInPool: number;
  viewersFailed: number;
  totals: Readonly<Record<Exclude<keyof FindShadowEvaluation, "tieAtRank1" | "tieAcrossPageBoundary" | "medianAbsPositionChange">, number>>;
  viewersWithTieAtRank1: number;
  viewersWithTieAcrossPageBoundary: number;
  /** Anteil heute sichtbarer Treffer, die v0.1 ausschließen würde (über alle Personen). */
  shareVisibleExcludedByV01: number | null;
  /** Anteil v0.1-zulässiger Kandidaten, die die heutige Suche vorher herausfiltert. */
  shareV01KeptButNotInRpc: number | null;
  meanTop12Overlap: number | null;
  medianOfMedianAbsPositionChange: number | null;
}>;

const round = (x: number) => Math.round(x * 1000) / 1000;

export function aggregateFindShadowEvaluations(
  evaluations: readonly FindShadowEvaluation[],
  skipped: Readonly<{ notComparable: number; notInPool: number; failed?: number }>,
): FindShadowAggregate {
  const keys = [
    "baseCandidates", "excludedNoFounderRole", "excludedBlocked", "eligible", "uncertain", "ineligible", "visibleTotal",
    "visiblePage1", "top12Overlap", "shadowTop12NotOnVisiblePage1", "visibleExcludedByV01", "v01KeptButNotInRpc",
    "positionsCompared", "positionsUnchanged", "positionsMovedUp", "positionsMovedDown", "tieGroups", "candidatesInTies",
  ] as const;
  const totals = Object.fromEntries(keys.map((k) => [k, evaluations.reduce((n, e) => n + e[k], 0)])) as FindShadowAggregate["totals"];
  const kept = totals.eligible + totals.uncertain;
  return {
    viewers: evaluations.length + skipped.notComparable + skipped.notInPool + (skipped.failed ?? 0),
    viewersEvaluated: evaluations.length,
    viewersNotComparable: skipped.notComparable,
    viewersNotInPool: skipped.notInPool,
    viewersFailed: skipped.failed ?? 0,
    totals,
    viewersWithTieAtRank1: evaluations.filter((e) => e.tieAtRank1).length,
    viewersWithTieAcrossPageBoundary: evaluations.filter((e) => e.tieAcrossPageBoundary).length,
    shareVisibleExcludedByV01: totals.visibleTotal ? round(totals.visibleExcludedByV01 / totals.visibleTotal) : null,
    shareV01KeptButNotInRpc: kept ? round(totals.v01KeptButNotInRpc / kept) : null,
    meanTop12Overlap: evaluations.length ? round(totals.top12Overlap / evaluations.length) : null,
    medianOfMedianAbsPositionChange: evaluations.length ? median(evaluations.map((e) => e.medianAbsPositionChange)) : null,
  };
}

/**
 * Wertet eine geladene Population für mehrere betrachtende Personen aus (alle aktiven
 * Founder oder die übergebenen). Gibt NUR das Aggregat zurück.
 */
export function evaluateFindShadowPopulation(
  population: FindMatchingPopulation,
  options: Readonly<{ viewerIds?: readonly string[]; pageSize?: number; now?: () => Date }> = {},
): FindShadowAggregate {
  const viewerIds = options.viewerIds ?? [...population.profiles.keys()].filter((id) => population.founders.has(id));
  const comparable = [...population.profiles.values()].map((p) => ({
    userId: p.userId,
    publishedAt: p.publishedAt,
    ownRoles: p.ownRoles,
    expertise: p.expertise,
    locationRegion: p.locationRegion,
    remoteMode: p.remoteMode,
    availabilityHoursPerWeek: p.availabilityHoursPerWeek,
    searchIntent: p.searchIntent ?? null,
    startHorizon: p.startHorizon ?? null,
  }));
  const evaluations: FindShadowEvaluation[] = [];
  let notComparable = 0;
  let notInPool = 0;
  let failed = 0;
  for (const viewerId of viewerIds) {
    const run = runGlobalFindMatchingShadow(population, viewerId, { now: options.now });
    if (run.status === "viewer_not_in_pool") {
      notInPool += 1;
      continue;
    }
    if (run.status !== "ok") {
      failed += 1;
      continue;
    }
    const visible = currentFindRpcOrder(
      population.constraints.get(viewerId) ?? EMPTY_MUST_HAVES,
      comparable
        .filter((c) => c.userId !== viewerId)
        .map((c) => ({
          ...c,
          isFounder: population.founders.has(c.userId),
          blockedWithViewer: population.blockedPairs.has(pairKey(c.userId, viewerId)),
        })),
    );
    if (visible === "not_comparable") {
      notComparable += 1;
      continue;
    }
    evaluations.push(evaluateFindShadow(visible, run, options.pageSize ?? 12));
  }
  return aggregateFindShadowEvaluations(evaluations, { notComparable, notInPool, failed });
}

// ---------------------------------------------------------------------------
// Laufzeit (E3d): je Stufe nur Median, p95, Maximum über alle gemessenen Betrachter.
// ---------------------------------------------------------------------------
export type FindRuntimeSample = Readonly<{ poolMs: number; inputsMs: number; engineMs: number; totalMs: number }>;
export type FindRuntimeStats = Readonly<{ median: number; p95: number; max: number }>;
export type FindRuntimeAggregate = Readonly<{
  viewersMeasured: number;
  stages: Readonly<Record<keyof FindRuntimeSample, FindRuntimeStats>> | null;
}>;

const ms = (x: number) => Math.round(x * 10) / 10;

/** Nächstgelegener Rang (keine Interpolation) - bei wenigen Werten ehrlicher als ein geschätztes Perzentil. */
function percentile(sorted: readonly number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))];
}

export function aggregateFindRuntimes(samples: readonly FindRuntimeSample[]): FindRuntimeAggregate {
  if (samples.length === 0) return { viewersMeasured: 0, stages: null };
  const stage = (key: keyof FindRuntimeSample): FindRuntimeStats => {
    const sorted = samples.map((x) => x[key]).filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
    return { median: ms(median(sorted)), p95: ms(percentile(sorted, 0.95)), max: ms(sorted[sorted.length - 1]) };
  };
  return {
    viewersMeasured: samples.length,
    stages: { poolMs: stage("poolMs"), inputsMs: stage("inputsMs"), engineMs: stage("engineMs"), totalMs: stage("totalMs") },
  };
}
