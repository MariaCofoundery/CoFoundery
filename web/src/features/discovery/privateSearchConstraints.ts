import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { DiscoveryMustHaves } from "@/features/discovery/discoveryTypes";
import { normalizeMustHaves } from "@/features/discovery/discoveryValidation";
import { EMPTY_MUST_HAVES, mustHavesFromDiscovery } from "@/lib/matching/v01/adapters";
import type { FindMustHavesInput } from "@/lib/matching/v01/types";

/**
 * PRIVATE SEARCHER CONSTRAINTS - die privaten FIND-Suchkriterien
 * (`founder_search_preferences.must_haves`) als Matching-Eingabe.
 *
 * Getrennt von allem, was ein Kandidat zeigt (FounderDiscoveryProfile,
 * DiscoveryCandidate): Diese Typen kommen in keinem Kandidatenobjekt vor und
 * gehen nie an einen Client, der nicht der Person selbst gehört.
 *
 * Zwei Teile, weil die eingefrorene Engine nicht alle Produktfelder kennt:
 *   matchingV01                       genau die acht Kriterien des Gates v03
 *                                     (Spec §7) - nur diese gehen ins Matching
 *   productConstraintsNotInMatchingV01  PRODUCT CONSTRAINT NOT IN MATCHING v0.1:
 *                                     geladen und typisiert, aber weder Gate
 *                                     noch Score (implementation-decisions §4).
 *                                     Eine Aufnahme wäre eine neue matching_version.
 *
 * Fehlende Zeile = keine Kriterien (leer/null), nichts erfunden. Ladefehler werfen.
 *
 * NOCH NICHT ANGESCHLOSSEN: Die produktive FIND-Suche nutzt weiter
 * getOwnSearchPreferences + search_founder_discovery_profiles_v2.
 */

export type FindProductConstraintsNotInMatchingV01 = Readonly<{
  requiredIndustriesAny: readonly string[];
  acceptedCommitmentLevels: readonly string[];
  acceptedVentureStages: readonly string[];
  acceptedVentureGoals: readonly string[];
}>;

export type FounderPrivateSearchConstraints = Readonly<{
  visibility: "owner_only";
  ownerUserId: string;
  /** false: Die Person hat nie Kriterien gespeichert - alles leer, kein Default. */
  stored: boolean;
  matchingV01: FindMustHavesInput;
  productConstraintsNotInMatchingV01: FindProductConstraintsNotInMatchingV01;
}>;

export class PrivateSearchConstraintsError extends Error {
  readonly code: "forbidden" | "load_failed";
  constructor(code: "forbidden" | "load_failed") {
    super(`private_search_constraints_${code}`);
    this.name = "PrivateSearchConstraintsError";
    this.code = code;
  }
}

/** Aus dem gespeicherten JSON; unbekannte Werte fallen über normalizeMustHaves weg. */
export function privateSearchConstraintsFromStored(
  ownerUserId: string,
  storedMustHaves: unknown,
  stored: boolean,
): FounderPrivateSearchConstraints {
  const all: DiscoveryMustHaves = normalizeMustHaves(stored ? storedMustHaves : null);
  return {
    visibility: "owner_only",
    ownerUserId,
    stored,
    matchingV01: mustHavesFromDiscovery(all),
    productConstraintsNotInMatchingV01: {
      requiredIndustriesAny: [...all.requiredIndustriesAny],
      acceptedCommitmentLevels: [...all.acceptedCommitmentLevels],
      acceptedVentureStages: [...all.acceptedVentureStages],
      acceptedVentureGoals: [...all.acceptedVentureGoals],
    },
  };
}

type OwnClient = Pick<SupabaseClient, "auth" | "from">;

/**
 * Die eigenen privaten Kriterien der angemeldeten, suchenden Person.
 *
 * Läuft mit dem normalen Server-Client: RLS gibt ohnehin nur die eigene Zeile
 * heraus. Zusätzlich muss `userId` die angemeldete Person sein - wer eine
 * fremde ID übergibt, bekommt einen Fehler statt einer leeren Antwort, damit
 * ein Fehlaufruf nicht als „hat keine Kriterien“ durchgeht.
 */
export async function getFounderPrivateSearchPreferences(
  client: OwnClient,
  userId: string,
): Promise<FounderPrivateSearchConstraints> {
  let sessionUserId: string | null = null;
  try {
    const { data, error } = await client.auth.getUser();
    sessionUserId = error ? null : (data.user?.id ?? null);
  } catch {
    sessionUserId = null;
  }
  if (!sessionUserId || typeof userId !== "string" || userId !== sessionUserId) {
    throw new PrivateSearchConstraintsError("forbidden");
  }

  let row: { must_haves?: unknown } | null;
  try {
    const { data, error } = await client
      .from("founder_search_preferences")
      .select("must_haves")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new PrivateSearchConstraintsError("load_failed");
    row = (data as { must_haves?: unknown } | null) ?? null;
  } catch (error) {
    if (error instanceof PrivateSearchConstraintsError) throw error;
    throw new PrivateSearchConstraintsError("load_failed");
  }
  return privateSearchConstraintsFromStored(userId, row?.must_haves, row !== null);
}

/**
 * Die Gate-Kriterien von KANDIDATEN für die Gegenrichtung des Gates v03
 * (Spec §7: „prüft für beide Richtungen“). Nur für einen serverseitigen
 * Matching-Kontext mit Service-Role-Client; das Ergebnis bleibt im Server und
 * erscheint nie in einem Kandidatenobjekt oder Reason-Text.
 *
 * Datensparsam: zurück kommen nur die acht v0.1-Kriterien, nie die vier
 * Produktfelder. Kandidaten ohne Zeile haben keine Kriterien (leer). Ein
 * Ladefehler wirft - ohne die Bedingungen der Gegenseite darf nicht gerankt
 * werden, sonst würden deren Ausschlüsse übergangen.
 */
export async function getCandidateMatchingV01Constraints(
  serviceClient: Pick<SupabaseClient, "from">,
  candidateUserIds: readonly string[],
): Promise<ReadonlyMap<string, FindMustHavesInput>> {
  const ids = [...new Set(candidateUserIds.filter((id) => typeof id === "string" && id.length > 0))];
  const result = new Map<string, FindMustHavesInput>(ids.map((id) => [id, EMPTY_MUST_HAVES]));
  if (ids.length === 0) return result;
  let rows: unknown;
  try {
    const { data, error } = await serviceClient
      .from("founder_search_preferences")
      .select("user_id, must_haves")
      .in("user_id", ids);
    if (error || !Array.isArray(data)) throw new PrivateSearchConstraintsError("load_failed");
    rows = data;
  } catch (error) {
    if (error instanceof PrivateSearchConstraintsError) throw error;
    throw new PrivateSearchConstraintsError("load_failed");
  }
  for (const row of rows as { user_id?: unknown; must_haves?: unknown }[]) {
    if (typeof row.user_id === "string" && result.has(row.user_id)) {
      result.set(row.user_id, privateSearchConstraintsFromStored(row.user_id, row.must_haves, true).matchingV01);
    }
  }
  return result;
}
