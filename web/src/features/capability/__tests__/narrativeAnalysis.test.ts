import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
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
  // ALLE MIGRATIONEN, nicht nur die erste. GEAENDERT AM 21.09.2026: Der Test
  // las ausschliesslich 20260907160000 und uebersah damit die Familie
  // "Aussenauftritt & Moderation" aus 20261021120000 - er schlug an, obwohl
  // die fuenf Bereiche existieren. Wer das Vokabular erweitert, legt eine neue
  // Datei an; ein Test, der eine Datei nennt, veraltet mit der ersten
  // Erweiterung.
  const migrationDir = "../supabase/migrations";
  const known = new Set<string>();
  for (const file of readdirSync(migrationDir).sort()) {
    if (!file.endsWith(".sql")) continue;
    const sql = readFileSync(`${migrationDir}/${file}`, "utf8");
    for (const block of sql.split("insert into public.capability_areas").slice(1)) {
      for (const row of block.match(/\('([a-z_0-9]+)', '[a-z_]+', \d+\)/g) ?? []) {
        known.add(row.split("'")[1]);
      }
    }
  }

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

test("eine erzaehlte Antwort findet auch das Verhalten, nicht nur das Fach", () => {
  // GEMELDET AM 21.09.2026 nach dem ersten echten Interview: "das waren
  // wirklich nur die Hard Skills". Genau so war es - die fuenf Bereiche der
  // Familie "Aussenauftritt & Moderation" hatten keine Begriffe, also konnte
  // die Erkennung sie nie vorschlagen.
  //
  // DIESER TEST PRUEFT DAS AM ERGEBNIS und nicht an der Liste: So klingt eine
  // Antwort auf Frage 4 des Gespraechsleitfadens.
  const answer =
    "Ich habe den Vortrag auf der Konferenz gehalten, den eigentlich mein Chef " +
    "halten sollte. Vorher habe ich mit zwei Leuten geübt, und die Diskussion " +
    "danach habe ich moderiert.";

  const result = analyzeNarrativeWithRules({ narrative: answer, locale: "de" });
  return result.then((analysis) => {
    const found = analysis.areas.map((area) => area.areaId);
    assert.ok(
      found.includes("public_speaking"),
      `vor Gruppen sprechen wurde nicht erkannt: ${found.join(", ") || "nichts"}`
    );
    assert.ok(found.includes("facilitation"), `Moderation wurde nicht erkannt: ${found.join(", ")}`);
    // Und die Begruendung steht dabei - nie eine Blackbox.
    const speaking = analysis.areas.find((area) => area.areaId === "public_speaking");
    assert.ok(speaking && speaking.matchedTerms.length > 0);
  });
});

test("und Unangenehmes ansprechen wird als Zustaendigkeit erkannt", () => {
  // So klingt eine Antwort auf Frage 5. Wichtig ist, dass daraus eine
  // ZUSTAENDIGKEIT wird ("Unangenehmes ansprechen") und keine Eigenschaft
  // ("konfliktfaehig") - im Vokabular gibt es nur die erste Form.
  const answer =
    "Ich habe die offene Rechnung angesprochen, obwohl ich mit Widerstand " +
    "gerechnet habe, und dabei klares Feedback gegeben.";

  return analyzeNarrativeWithRules({ narrative: answer, locale: "de" }).then((analysis) => {
    const found = analysis.areas.map((area) => area.areaId);
    assert.ok(
      found.includes("difficult_conversations"),
      `nicht erkannt: ${found.join(", ") || "nichts"}`
    );
    // Die Regel-Engine leitet weiterhin keine Staerke ab - das darf nur ein
    // Mensch, und beim Bestaetigen.
    assert.equal(analysis.strength, null);
  });
});
