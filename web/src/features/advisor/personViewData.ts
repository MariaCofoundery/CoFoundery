import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdvisorScope } from "@/features/advisor/personAccessData";

/**
 * Was ein Advisor von einer Person sehen darf - geladen, nicht gefiltert.
 *
 * DER UNTERSCHIED IST DER GANZE PUNKT: Eine Seite, die erst alles lädt und
 * dann entscheidet, was sie davon anzeigt, hat die Daten bereits geholt - ein
 * Fehler in der Anzeige wäre dann eine Offenlegung. Hier fragt jede Funktion
 * in der Datenbank selbst nach der Zustimmung und gibt nichts heraus, wofür
 * keine vorliegt (Migration 20261045120000).
 *
 * `null` HEISST HIER "NICHT FREIGEGEBEN" und wird von der Seite als Abwesenheit
 * behandelt - nicht als Fehler und nicht als leerer Block. Ein leerer Block
 * würde aus einer fehlenden Freigabe eine Aussage über den Menschen machen
 * ("hat nichts vorzuweisen").
 */

export type AdvisorPersonBase = {
  displayName: string | null;
  headline: string | null;
  bio: string | null;
  locationRegion: string | null;
  remoteMode: string | null;
  expertise: string[];
  industries: string[];
};

export type AdvisorPersonCapability = {
  areaId: string;
  familyId: string;
  applicationLevel: number | null;
  ownershipWish: string | null;
};

export type AdvisorPersonStrength = {
  statement: string;
  selfFrequency: string | null;
  reflectedFrequency: string | null;
  reflectedWho: string | null;
};

export type AdvisorPersonDirection = { facet: string; statement: string };

export type AdvisorPersonView = {
  base: AdvisorPersonBase | null;
  capability: AdvisorPersonCapability[] | null;
  strengths: AdvisorPersonStrength[] | null;
  direction: AdvisorPersonDirection[] | null;
  /** Was freigegeben ist - auch das, wofür es noch keine Ansicht gibt. */
  grantedScopes: AdvisorScope[];
};

async function callOrNull<T>(promise: PromiseLike<{ data: unknown; error: unknown }>) {
  const { data, error } = await promise;
  // Ein `42501` ist hier kein Fehler, sondern die Antwort: nicht freigegeben.
  if (error) return null;
  return (data ?? []) as T;
}

export async function getAdvisorPersonView(
  client: SupabaseClient,
  subjectUserId: string
): Promise<AdvisorPersonView> {
  const [baseRows, capability, strengths, direction, grants] = await Promise.all([
    callOrNull<Record<string, unknown>[]>(
      client.rpc("get_advisor_person_base", { p_subject_user_id: subjectUserId })
    ),
    callOrNull<Record<string, unknown>[]>(
      client.rpc("get_advisor_person_capability", { p_subject_user_id: subjectUserId })
    ),
    callOrNull<Record<string, unknown>[]>(
      client.rpc("get_advisor_person_strengths", { p_subject_user_id: subjectUserId })
    ),
    callOrNull<Record<string, unknown>[]>(
      client.rpc("get_advisor_person_direction", { p_subject_user_id: subjectUserId })
    ),
    client
      .from("advisor_person_grants")
      .select("scope")
      .eq("subject_user_id", subjectUserId)
      .eq("status", "active")
      .then(({ data }) => ((data ?? []) as { scope: AdvisorScope }[]).map((row) => row.scope)),
  ]);

  const first = baseRows?.[0];
  return {
    base: first
      ? {
          displayName: (first.display_name as string) ?? null,
          headline: (first.headline as string) ?? null,
          bio: (first.bio as string) ?? null,
          locationRegion: (first.location_region as string) ?? null,
          remoteMode: (first.remote_mode as string) ?? null,
          expertise: ((first.expertise as string[]) ?? []).filter(Boolean),
          industries: ((first.industries as string[]) ?? []).filter(Boolean),
        }
      : null,
    capability:
      capability?.map((row) => ({
        areaId: row.area_id as string,
        familyId: row.family_id as string,
        applicationLevel: (row.application_level as number) ?? null,
        ownershipWish: (row.ownership_wish as string) ?? null,
      })) ?? null,
    strengths:
      strengths?.map((row) => ({
        statement: row.statement as string,
        selfFrequency: (row.self_frequency as string) ?? null,
        reflectedFrequency: (row.reflected_frequency as string) ?? null,
        reflectedWho: (row.reflected_who as string) ?? null,
      })) ?? null,
    direction:
      direction?.map((row) => ({
        facet: row.facet as string,
        statement: row.statement as string,
      })) ?? null,
    grantedScopes: grants,
  };
}

/**
 * Das Selbstbild aus dem Fragebogen - fuer einen Advisor mit `alignment_report`.
 *
 * NEU AM 26.09.2026. Der Umfang war seit Langem freigebbar und nirgends
 * darstellbar - weil die Rohantworten niemand ausser der Person selbst sieht
 * und es nichts Abgeleitetes zu lesen gab. Seit 20261047120000 legt die
 * Person beim Ansehen ihres eigenen Reports ein Abbild ab: Zahlen, kein
 * fertiger Text.
 *
 * HIER ENTSTEHT DER TEXT NEU, aus dem aktuellen Code und aus genau diesen
 * Zahlen. Das ist der Grund, warum das Abbild keine Saetze enthaelt: Ein
 * abgelegter Text veraltet still, und der Accelerator laese Monate spaeter
 * eine Formulierung, die es im Produkt nicht mehr gibt.
 *
 * DER STAND GEHOERT DAZU. `updatedAt` ist der Zeitpunkt, an dem die Person
 * ihren Report zuletzt gerechnet hat - nicht "jetzt". Ohne diese Angabe
 * saehe ein halbes Jahr altes Bild aus wie ein heutiges.
 */
export type AdvisorPersonAlignment = {
  scores: Record<string, number | null>;
  valuesProfile: unknown | null;
  valuesStatus: "not_started" | "in_progress" | "completed";
  valuesAnswered: number;
  valuesTotal: number;
  basisAnswered: number;
  basisTotal: number;
  updatedAt: string | null;
};

export async function getAdvisorPersonAlignment(
  client: SupabaseClient,
  subjectUserId: string
): Promise<AdvisorPersonAlignment | null> {
  const { data, error } = await client.rpc("get_advisor_person_alignment", {
    p_subject_user_id: subjectUserId,
  });
  // Ein Fehler heisst "nicht freigegeben", eine leere Antwort "noch kein
  // Abbild" - fuer die Anzeige ist beides dasselbe: Es gibt nichts zu zeigen.
  if (error) return null;

  const row = ((data ?? []) as Record<string, unknown>[])[0];
  if (!row) return null;

  return {
    scores: (row.scores as Record<string, number | null>) ?? {},
    valuesProfile: row.values_profile ?? null,
    valuesStatus: (row.values_status as AdvisorPersonAlignment["valuesStatus"]) ?? "not_started",
    valuesAnswered: Number(row.values_answered ?? 0),
    valuesTotal: Number(row.values_total ?? 0),
    basisAnswered: Number(row.basis_answered ?? 0),
    basisTotal: Number(row.basis_total ?? 0),
    updatedAt: (row.updated_at as string) ?? null,
  };
}
