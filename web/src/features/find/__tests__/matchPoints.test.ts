import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { MATCH_POINT_KINDS, matchPoints } from "@/features/find/matchPoints";
import { THEME_IDS } from "@/features/find/discoveryThemes";
import type { ThemeResult } from "@/features/find/discoveryMatch";

const thema = (
  themeId: string,
  verdict: ThemeResult["verdict"],
  importance: ThemeResult["importance"] = 2,
): ThemeResult => ({
  themeId,
  direction: verdict === "interesting_complement" ? "complementary" : "similar",
  importance,
  verdict,
  fit: null,
  distance: null,
  comparable: 2,
  of: 2,
});

test("ohne Grundlage und ohne Auffälligkeit entsteht kein Punkt", () => {
  // „Dazu haben wir noch nicht genug Angaben" ist eine Auskunft über den
  // Umfang der Antworten und nicht über die Passung - sie gehört in die
  // Zählung, nicht zwischen die Gründe.
  const punkte = matchPoints(
    [
      thema("decision_weighing", "insufficient_data"),
      thema("experimentation", "unremarkable"),
    ],
    [],
  );
  assert.deepEqual(punkte, []);
});

test("die Reihenfolge ist die Aussagekraft", () => {
  const punkte = matchPoints(
    [
      thema("decision_weighing", "difference_without_weight", 0),
      thema("experience_intuition", "worth_a_look"),
      thema("experimentation", "interesting_complement"),
      thema("raising_objections", "strong_match"),
      thema("open_questions", "strong_match"),
    ],
    ["open_questions"],
  );

  assert.deepEqual(
    punkte.map((point) => point.kind),
    [
      "mutual_strong",
      "strong_match",
      "interesting_complement",
      "worth_a_look",
      "difference_without_weight",
    ],
  );
  assert.equal(punkte[0].themeId, "open_questions", "was für beide aufgeht, steht oben");
});

test("bei gleichem Rang zieht das, was wichtiger ist", () => {
  const punkte = matchPoints(
    [
      thema("decision_weighing", "strong_match", 1),
      thema("experimentation", "strong_match", 3),
    ],
    [],
  );
  assert.deepEqual(punkte.map((point) => point.themeId), ["experimentation", "decision_weighing"]);
});

test("bei gleichem Rang und gleichem Gewicht gilt die Themenreihenfolge", () => {
  const punkte = matchPoints(
    [
      thema("open_questions", "strong_match", 2),
      thema("decision_weighing", "strong_match", 2),
    ],
    [],
  );
  assert.deepEqual(
    punkte.map((point) => point.themeId),
    [THEME_IDS[0], "open_questions"],
  );
});

test("die Karte zeigt zwei Punkte, das Profil alle", () => {
  const themen = THEME_IDS.map((themeId) => thema(themeId, "strong_match"));
  assert.equal(matchPoints(themen, [], 2).length, 2);
  assert.equal(matchPoints(themen, []).length, 6);
});

test("es gibt kein „schlechter Match“", () => {
  // Die Spec, Abschnitt 15, verbietet vier Wörter ausdrücklich.
  const verboten = /inkompatibel|schlechter match|risiko|problem/i;
  for (const locale of ["de", "en"]) {
    const kinds = JSON.parse(readFileSync(join("messages", locale, "find.json"), "utf8")).points
      .kinds as Record<string, { title: string; text: string }>;
    assert.deepEqual(Object.keys(kinds).sort(), [...MATCH_POINT_KINDS].sort());
    for (const [kind, copy] of Object.entries(kinds)) {
      assert.ok(!verboten.test(copy.title), `${locale}/${kind}: ${copy.title}`);
      assert.ok(!verboten.test(copy.text), `${locale}/${kind}: ${copy.text}`);
    }
  }
});

test("die alten Alignment-Dimensionen stehen nicht mehr in FIND", () => {
  // Spec, Abschnitt 20: Unternehmenslogik, Entscheidungslogik, Arbeitsstruktur,
  // Commitment, Risikoorientierung und Konfliktstil stammen aus einer älteren
  // Architektur und vermischen venturebezogene Themen mit portablen
  // Arbeitspräferenzen.
  for (const datei of [
    join("src", "features", "discovery", "FounderDiscoveryCard.tsx"),
    join("src", "app", "(product)", "discovery", "[profileId]", "page.tsx"),
  ]) {
    const text = readFileSync(datei, "utf8");
    assert.ok(!/v2\.alignment\.dimensions/.test(text), datei);
    assert.match(text, /DiscoveryWorkstyle/, datei);
  }
});

test("ohne eigene Suche steht dort der Weg dorthin, nicht ein leerer Kasten", () => {
  const view = readFileSync(join("src", "features", "find", "MatchPointsView.tsx"), "utf8");
  assert.match(view, /if \(!hasPreferences\)/);
  assert.match(view, /href="\/discovery\/suche"/);

  // Und das ist eine Aussage über die EIGENE Suche - nicht darüber, ob die
  // andere Person etwas festgelegt hat.
  const de = JSON.parse(readFileSync(join("messages", "de", "find.json"), "utf8")).points;
  assert.match(String(de.noPreferences), /^Du hast/);
});
