import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ANALYZED_AREA_IDS,
  analyzeNarrativeWithRules,
} from "@/features/capability/narrativeAnalysis";

const analyze = (narrative: string) => analyzeNarrativeWithRules({ narrative, locale: "de" });

test("the example from the placeholder is assigned to sales", async () => {
  const result = await analyze(
    "Ich habe unseren ersten Enterprise-Kunden von der ersten Ansprache bis zum unterschriebenen Vertrag begleitet. Angebot, Rückfragen und Vertragsverhandlung lagen bei mir."
  );
  assert.equal(result.areas[0]?.areaId, "b2b_sales");
  // Nie eine Blackbox: der Vorschlag traegt die Begriffe mit, die dazu gefuehrt haben.
  assert.ok(result.areas[0].matchedTerms.length > 0);
  assert.ok(result.areas[0].matchedTerms.some((term) => term.includes("vertrag")));
});

test("a technical narrative lands in technology, not in sales", async () => {
  const result = await analyze(
    "Ich habe die Architektur unseres Backends neu geschnitten und die Skalierung auf Microservices umgestellt."
  );
  assert.equal(result.areas[0]?.areaId, "technical_architecture");
  assert.ok(!result.areas.some((area) => area.areaId === "b2b_sales"));
});

test("several areas are possible, capped at three", async () => {
  const result = await analyze(
    "Ich habe Kundeninterviews geführt, daraus die Positionierung geschärft, ein Pricing entworfen, das Geschäftsmodell angepasst und eine Kampagne aufgesetzt."
  );
  assert.ok(result.areas.length > 1, "mehrere Bereiche sollten erkannt werden");
  assert.ok(result.areas.length <= 3, "aber nicht beliebig viele");
});

test("nothing recognised returns an empty list rather than a guess", async () => {
  const result = await analyze("Ich habe letzte Woche etwas Wichtiges zu Ende gebracht.");
  assert.deepEqual(result.areas, [], "eine schlechte Zuordnung ist schlechter als keine");
});

test("the rule engine never claims a derived strength", async () => {
  const result = await analyze("Ich habe den Vertrieb aufgebaut und Verträge verhandelt.");
  assert.equal(result.strength, null, "Regeln koennen keine Staerke formulieren");
  assert.equal(result.engine, "rules", "wer eine Zuordnung sieht, soll wissen, woher sie kommt");
});

test("matching is case insensitive", async () => {
  const upper = await analyze("DATENSCHUTZ und DSGVO waren meine Themen.");
  assert.equal(upper.areas[0]?.areaId, "data_protection");
});

test("every analysed area exists in the database vocabulary", () => {
  const migration = readFileSync(
    "../supabase/migrations/20260907160000_create_capability_snapshot_v01.sql",
    "utf8"
  );
  const areaBlock = migration.split("insert into public.capability_areas")[1] ?? "";
  const known = new Set(
    (areaBlock.match(/\('([a-z_0-9]+)', '[a-z_]+', \d+\)/g) ?? []).map((row) => row.split("'")[1])
  );

  assert.ok(known.size >= 42, `nur ${known.size} Bereiche aus der Migration gelesen`);
  for (const areaId of ANALYZED_AREA_IDS) {
    assert.ok(known.has(areaId), `${areaId} hat Begriffe, existiert aber nicht im Vokabular`);
  }
});

test("terms are specific enough to be worth having", () => {
  const source = readFileSync("src/features/capability/narrativeAnalysis.ts", "utf8");
  // Begriffe, die ueberall vorkommen, wuerden jede Erzaehlung irgendwohin
  // schieben und die Zuordnung wertlos machen.
  for (const tooGeneric of ['"projekt"', '"team"', '"arbeit"', '"aufgabe"', '"verantwortung"']) {
    assert.doesNotMatch(source, new RegExp(tooGeneric), `${tooGeneric} ist zu allgemein`);
  }
});
