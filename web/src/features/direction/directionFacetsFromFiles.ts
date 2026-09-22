import { readFileSync } from "node:fs";

import { DIRECTION_FACETS } from "@/features/direction/directionInterviewGuide";
import type { AnalyzableFacet } from "@/features/direction/directionAnalysisModel";

/**
 * Die Rubriknamen aus der Sprachdatei - für Skripte ohne Datenbankzugang.
 *
 * WOFÜR: Der KI-Arbeiter braucht die Rubriken MIT Beschriftung, um dem Modell
 * zu sagen, worunter es einordnen darf. Gemessen am Capability-Modell macht
 * das den Unterschied: Mit den deutschen Beschriftungen daneben trifft es
 * besser und braucht weniger Zeit.
 *
 * WARUM AUS DER DATEI UND NICHT AUS DER DATENBANK: Der Arbeiter darf fast
 * nichts lesen - er hat kein Service-Role-Recht, sondern ein eigenes Konto,
 * das genau drei Dinge kann. Das ist richtig so, und deshalb bringt er sein
 * Vokabular selbst mit. Dieselbe Bauweise wie
 * `capabilityVocabularyFromFiles.ts`.
 *
 * DIE LISTE DER RUBRIKEN KOMMT AUS DEM CODE, nicht aus der Sprachdatei: Sonst
 * bestimmte eine Übersetzung, worüber ein Modell urteilen darf.
 */

const LABELS = "messages/de/direction.json";

export function readDirectionFacets(labelsPath = LABELS): AnalyzableFacet[] {
  const bundle = JSON.parse(readFileSync(labelsPath, "utf8")) as {
    statements?: { facets?: Record<string, string> };
  };
  const labels = bundle.statements?.facets ?? {};

  return DIRECTION_FACETS.map((facet) => ({
    id: facet,
    // Ohne Beschriftung bleibt die Kennung stehen. Sie ist schlechter, aber
    // sie ist ehrlich - und eine fehlende Übersetzung soll keine Rubrik
    // verschwinden lassen.
    label: labels[facet] ?? facet,
  }));
}
