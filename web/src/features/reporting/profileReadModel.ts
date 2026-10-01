import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getOwnPersonResources, type PersonResource } from "@/features/ai/personResources";
import { buildCapabilityReadout } from "@/features/capability/capabilityReadout";
import { getCapabilityVocabulary, getOwnCapabilityEntries } from "@/features/capability/capabilityData";
import { DEPTH_LEVEL } from "@/features/capability/capabilityTypes";
import { getDirectionStatements } from "@/features/direction/directionStatementData";
import { getPersonStrengths } from "@/features/capability/strengthData";
import { getScopeReport } from "@/features/instruments/align/reportData";
import { findVentures } from "@/features/instruments/align/ventureResolution";
import { getPersonCore } from "@/features/profile/personCoreData";
import { getLatestSelfAlignmentReport } from "@/features/reporting/actions";
import { buildFounderProfileCoverage } from "@/features/reporting/founderProfileCoverage";
import { buildOwnershipGroups } from "@/features/reporting/ownershipGroups";
import { getProfileFreshness } from "@/features/reporting/profileFreshness";

/**
 * „Das bist du" — die Daten, einmal.
 *
 * ---------------------------------------------------------------------------
 * WARUM ES DIESES MODUL GIBT
 * ---------------------------------------------------------------------------
 *
 * Seit dem 01.10.2026 gibt es zwei Seiten, die dasselbe Bild zeigen: die
 * Leseansicht `/me/profile` und die Druckfassung `/me/profile/print`. Beide
 * lesen sechs Quellen und leiten daraus dieselben acht Dinge ab.
 *
 * Zweimal geladen hiesse: zwei Listen, die auseinanderlaufen, sobald jemand
 * eine davon anfasst. Und zwar lautlos - ein Ausdruck, dem ein Abschnitt
 * fehlt, sieht aus wie ein Profil, zu dem es dazu nichts zu sagen gibt.
 *
 * ---------------------------------------------------------------------------
 * DATEN, KEINE TEXTE
 * ---------------------------------------------------------------------------
 *
 * Hier stehen keine Uebersetzungen. Die Leseansicht und die Druckfassung
 * beschriften dieselben Zahlen unterschiedlich - „Bearbeiten" gibt es nur auf
 * einer von beiden -, und ein Modul, das Daten laedt, soll nicht entscheiden,
 * wie sie heissen.
 *
 * ---------------------------------------------------------------------------
 * ES SCHREIBT NICHTS UND ES RECHNET NICHTS ZUSAMMEN
 * ---------------------------------------------------------------------------
 *
 * Alle Ableitungen hier sind Umsortierungen und Filter: die Reihenfolge des
 * Vokabulars statt der der Datenbank, die Bereiche mit Tiefe, die bestaetigten
 * Ressourcen. Keine Punktzahl, keine Gewichtung, keine Rangfolge - was es im
 * Modell nicht gibt, entsteht auch nicht beim Laden.
 */

export type ProfileReadModel = Awaited<ReturnType<typeof getProfileReadModel>>;

export async function getProfileReadModel(
  supabase: SupabaseClient,
  userId: string,
  locale: string
) {
  const [
    core,
    report,
    workProfile,
    vocabulary,
    entries,
    directionStatements,
    strengths,
    resources,
    freshness,
    ventures,
    photo,
  ] = await Promise.all([
    getPersonCore(supabase, userId),
    // Der Altbestand. Er wird nicht mit dem aktuellen Bogen verrechnet -
    // zwei Fassungen messen nicht dasselbe.
    getLatestSelfAlignmentReport({ locale }),
    // Das aktuelle Arbeitsprofil. Dieselbe Funktion, die auch die
    // Advisor-Ansicht liest - keine zweite Auswertung daneben.
    getScopeReport(userId, "founder_profile").catch(() => null),
    getCapabilityVocabulary(supabase),
    getOwnCapabilityEntries(supabase, userId),
    getDirectionStatements(supabase),
    getPersonStrengths(supabase),
    getOwnPersonResources(supabase).catch((): PersonResource[] => []),
    // Wie alt dieses Bild ist - ueber alle Quellen, nicht nur ueber einen
    // Fragebogen. Siehe `profileFreshness.ts`.
    getProfileFreshness(supabase, userId).catch(() => null),
    // Nur Name und Weg dorthin. Keine Antworten, keine Zusagen.
    findVentures(userId).catch(() => []),
    // Das persoenliche Foto. Es liegt auf `profiles` - dort, wo auch die
    // Rollen liegen; der Kern traegt die Identitaet. Gelesen wird es nur,
    // nie geschrieben: Geaendert wird es unter „Ueber dich".
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("avatar_id, avatar_url")
          .eq("user_id", userId)
          .maybeSingle();
        return {
          avatarId: (data?.avatar_id as string | null) ?? null,
          avatarUrl: (data?.avatar_url as string | null) ?? null,
        };
      } catch {
        return { avatarId: null, avatarUrl: null };
      }
    })(),
  ]);

  const readout = buildCapabilityReadout(entries, vocabulary.areas, vocabulary.families);
  const coverage = buildFounderProfileCoverage(entries, vocabulary.areas, vocabulary.families);
  const ownershipGroups = buildOwnershipGroups(entries, vocabulary.areas);

  // Die Reihenfolge des Vokabulars, nicht die der Datenbank: Sonst stehen die
  // Bereiche in der Folge, in der jemand sie eingetragen hat.
  const areaOrder = new Map(vocabulary.areas.map((area) => [area.area_id, area.sort_order]));
  const orderedEntries = entries
    .slice()
    .sort((a, b) => (areaOrder.get(a.area_id) ?? 0) - (areaOrder.get(b.area_id) ?? 0));

  // Zwei Ableitungen ohne eigenen Speicher: wohin jemand wachsen will, und
  // die Bereiche, in denen Tiefe eingetragen ist.
  const growingInto =
    readout.findings.find((finding) => finding.key === "growingInto")?.areaIds ?? [];
  const deepAreas = orderedEntries
    .filter((entry) => (entry.application_level ?? 0) >= DEPTH_LEVEL)
    .map((entry) => entry.area_id);
  const handsOver =
    readout.findings.find((finding) => finding.key === "canButHandsOver")?.areaIds ?? [];

  // NUR BESTAETIGTES. Ein offener Vorschlag ist eine Modellbehauptung und darf
  // nirgends wie eine Aussage der Person aussehen - weder auf der Seite noch
  // in einer Fassung, die weitergegeben wird.
  const confirmedResources = resources.filter((resource) => resource.status === "confirmed");

  return {
    core,
    report,
    workProfile,
    vocabulary,
    entries,
    orderedEntries,
    directionStatements,
    strengths,
    resources,
    confirmedResources,
    freshness,
    ventures,
    photo,
    readout,
    coverage,
    ownershipGroups,
    growingInto,
    deepAreas,
    handsOver,
  };
}
