import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  AREAS,
  PRODUCT_ITEMS,
  teamPatterns,
  type AreaKey,
  type ProductMember,
  type ProductProfile,
} from "@/features/reporting/workstyle/model";
import {
  areaNarrative,
  areaPattern,
  overviewMark,
  patternItems,
  teamAreaFinding,
  type TeamMemberInput,
} from "@/features/reporting/workstyle/narrative";
import { componentRows } from "@/features/reporting/workstyle/componentsModel";

/**
 * Phase 10B - Claim-Boundary-Tests: MESSUNG -> EVIDENZ -> AUSSAGE -> WORTLAUT.
 *
 * Geprueft wird ueber viele erzeugte Profile, dass kein Text ueber das
 * hinausgeht, was die Items tragen. Die verbotenen Begriffe stehen fuer die
 * naheliegenden, aber nicht gemessenen Erweiterungen je Bereich (siehe
 * Abschnitt "Evidence-to-Claim Boundaries" im Phase-10-Bericht).
 */

type V = number | "A" | "B" | "a" | "b" | null; // a/b = deutlich eher, null = "Kann ich noch nicht einschätzen"

function profile(id: string, fallback: V, overrides: Record<string, V> = {}): ProductProfile {
  return {
    person_id: id,
    assessment_id: `a-${id}`,
    instrument_id: "founder-workstyle-pretest-8-5a-v3",
    manifest_version: "3.0.0",
    item_version: "8.4-v0.4",
    completed_at: "2026-10-05",
    answers: PRODUCT_ITEMS.map((i) => {
      const v = i.item_key in overrides ? overrides[i.item_key] : fallback;
      if (v === null) return { item_key: i.item_key, item_version: i.item_version, value: null, missing_reason: "cannot_assess" };
      const option =
        v === "A" ? "lean_a" : v === "a" ? "strong_a" : v === "B" ? "lean_b" : v === "b" ? "strong_b" : v >= 3 ? "lean_b" : "lean_a";
      return {
        item_key: i.item_key,
        item_version: i.item_version,
        value: i.response_format === "comparative" ? { optionId: option } : { scale: typeof v === "number" ? v : 3 },
        missing_reason: null,
      };
    }),
  } as ProductProfile;
}

const keys = (area: AreaKey) => patternItems(area).map((i) => i.item_key);
const withArea = (area: AreaKey, values: V[], fallback: V = 3) =>
  profile("x", fallback, Object.fromEntries(keys(area).map((k, n) => [k, values[n] ?? null])));

/** Eine breite Auswahl an Antwortmustern je Bereich, inkl. Missing und Mischungen. */
const SHAPES: V[][] = [
  [5, 5, 5, 5, 5], [4, 4, 4, 4, 4], [1, 1, 1, 1, 1], [2, 2, 2, 2, 2], [3, 3, 3, 3, 3],
  [5, 4, 3, 5, 4], [1, 2, 3, 2, 1], [1, 5, 1, 5, 3], [1, 3, 5, 3, 1], [5, 5, null, null, null],
  [5, 5, 5, null, null], [1, null, 1, null, 2], [3, 5, 3, 5, 3], [2, 4, 2, 4, 2],
];

function individualTexts(p: ProductProfile, area: AreaKey) {
  const n = areaNarrative(p, area);
  return [n.core, n.exception ?? "", n.note ?? "", n.question ?? "", ...n.itemNotes.map((x) => x.text), ...n.situations.flatMap((s) => [s.label, ...s.items])].join("\n");
}

function allIndividualTexts(area: AreaKey) {
  return SHAPES.map((s) => individualTexts(withArea(area, s), area)).join("\n");
}

function teamTexts(area: AreaKey) {
  const out: string[] = [];
  const pairs: [V, V][] = [[1, 5], [5, 1], [2, 4], [3, 5], [5, 5], [1, 1], ["a", "b"], ["A", "B"], [null, 5]];
  for (const size of [2, 3, 4])
    for (const [x, y] of pairs) {
      const people: TeamMemberInput[] = Array.from({ length: size }, (_, n) => ({
        person_id: String(n),
        name: `P${n}`,
        profile: profile(String(n), n === 0 ? x : y),
      }));
      const f = teamAreaFinding(people, area);
      out.push(f.summary, f.hypothesis ?? "", f.question ?? "");
    }
  return out.join("\n");
}

// --- Bereichsgrenzen: naheliegende, aber nicht gemessene Erweiterungen ---

const BOUNDARIES: Record<AreaKey, { forbidden: RegExp; why: string }> = {
  EVI: { forbidden: /intelligen|klug|rational|logisch|objektiv|analytisch|kritisch denk/i, why: "EVI misst Nachpruefen in Situationen, nicht Intelligenz oder Rationalitaet" },
  EXP: { forbidden: /intuiti|Intuition|Bauchgefühl|Instinkt|Gespür/i, why: "EXP misst Einfluss von Erfahrung, nicht Intuition als Eigenschaft" },
  EL: { forbidden: /Risiko|risikobereit|wagemutig|mutig|waghalsig|vorsichtig/i, why: "EL misst kleine Versuche, nicht allgemeine Risikobereitschaft" },
  VOICE: { forbidden: /extravert|extrovert|introvert|gesellig|kontaktfreudig|durchsetzungs|konfliktfähig|konfliktscheu|selbstbewusst|schüchtern/i, why: "VOICE misst Ansprechen von Einwaenden, nicht Extraversion oder Konfliktfaehigkeit" },
  AMB: { forbidden: /tolerant|Toleranz|handelst du|zögerst|blockierst|vermeidest|kommst .{0,20}klar|belastbar|gelassen/i, why: "AMB misst Empfinden, nicht Verhalten oder Toleranz" },
  ORG: { forbidden: /gewissenhaft|diszipliniert|zuverlässig|organisiert|chaotisch|ordentlich|planlos/i, why: "ORG-Items messen einzelne Unteraspekte, keine allgemeine Gewissenhaftigkeit" },
};

for (const area of AREAS.map((a) => a.key))
  test(`${area}: keine Aussage über das Gemessene hinaus (Einzel- und Teamtext)`, () => {
    const text = `${allIndividualTexts(area)}\n${teamTexts(area)}`;
    assert.doesNotMatch(text, BOUNDARIES[area].forbidden, BOUNDARIES[area].why);
  });

test("AMB beschreibt Empfinden und sagt es dazu", () => {
  for (const shape of SHAPES) {
    const n = areaNarrative(withArea("AMB", shape), "AMB");
    if (n.pattern.kind === "insufficient") continue;
    assert.match(n.core, /empfind|unangenehm/);
    assert.match(n.note ?? "", /Empfinden – nicht, wie du in der Situation handelst/);
  }
  assert.doesNotMatch(AREAS.find((a) => a.key === "AMB")!.title, /umgehst|umgehen/);
  assert.doesNotMatch(AREAS.find((a) => a.key === "VOICE")!.title, /Sichtweisen/, "VOICE ist kein Perspektivensuchen (FS)");
});

test("keine Fremdwahrnehmung aus Selbstauskunft", () => {
  const text = AREAS.map((a) => `${allIndividualTexts(a.key)}\n${teamTexts(a.key)}`).join("\n");
  assert.doesNotMatch(text, /andere erleben|erleben dich|wirkst|wirkt auf andere|auf andere wirk|nehmen dich .* wahr|gehen .* davon aus, dass du/i);
  const individual = readFileSync("src/features/reporting/workstyle/IndividualWorkstyle.tsx", "utf8");
  assert.match(individual, /bei anderen ankommt, misst der Bericht nicht/);
  assert.doesNotMatch(individual, /\.everyday|\.others/);
});

test("mixed erzeugt keine Richtung, insufficient keine Deutung", () => {
  for (const area of AREAS.map((a) => a.key)) {
    const mixed = withArea(area, [1, 5, 1, 5, 1]);
    const m = areaNarrative(mixed, area);
    assert.equal(m.pattern.kind, "mixed", area);
    assert.match(m.core, /unterschiedlich/, area);
    assert.equal(m.exception, null, area);
    assert.equal(m.claim, `${area}.MIXED`);

    const none = withArea(area, [5, null, null, null, null]);
    const i = areaNarrative(none, area);
    assert.equal(i.pattern.kind, "insufficient", area);
    assert.match(i.core, /zu wenige Antworten/, area);
    assert.equal(i.question, null, area);
    assert.deepEqual(i.situations, [], area);
    assert.equal(overviewMark(none, area).kind, "none", area);
  }
});

test("Missing wird nie als Mitte behandelt", () => {
  // 3 x oben + 2 x Missing: ALL, nicht MOST - Missing ist keine "teils/teils"-Ausnahme.
  const p = withArea("EVI", [5, 4, 5, null, null]);
  assert.deepEqual(areaPattern(p, "EVI"), { kind: "direction", band: "upper", strength: "all", exception: null });
  const n = areaNarrative(p, "EVI");
  assert.equal(n.missing, 2);
  assert.equal(n.exception, null);
  // 2 x oben + 3 x Missing reicht nicht (mindestens drei beantwortete Situationen).
  assert.equal(areaPattern(withArea("EVI", [5, 5, null, null, null]), "EVI").kind, "insufficient");
  // Team: eine fehlende Antwort nimmt die Situation aus dem Vergleich, statt sie als Mitte zu werten.
  const people: TeamMemberInput[] = [
    { person_id: "1", name: "A", profile: profile("1", 5) },
    { person_id: "2", name: "B", profile: profile("2", 5, { "EVI-01": null }) },
  ];
  const f = teamAreaFinding(people, "EVI");
  assert.equal(f.kind, "similar");
  assert.ok(f.situations.every((s) => s.item !== "EVI-01"));
});

test("EXP-01 und ORG-Zweierwahlen werden nicht mit anderen Formaten verrechnet", () => {
  const exp = profile("1", 3, { "EXP-02": 5, "EXP-03": 5, "EXP-04": 4, "EXP-06": 5, "EXP-01": 1 });
  const n = areaNarrative(exp, "EXP");
  assert.equal(n.claim, "EXP.DIRECTION.UPPER.ALL", "das andere Format kippt die Richtung nicht");
  assert.match(n.itemNotes.map((x) => x.text).join(" "), /„gar nicht ernst“/);
  assert.ok(!patternItems("EXP").some((i) => i.item_key === "EXP-01"));
  assert.ok(!patternItems("ORG").some((i) => i.response_format === "comparative"));
  const org = profile("2", 5, { "ORG-03": "a", "ORG-04": "b", "ORG-07": "A", "ORG-08": "B" });
  const o = areaNarrative(org, "ORG");
  assert.equal(o.claim, "ORG.DIRECTION.UPPER.ALL");
  assert.equal(o.itemNotes.length, 4);
  assert.match(o.itemNotes[0].text, /deutlich eher mehrere davon parallel/);
});

test("Teamunterschied erzeugt keine Konfliktprognose, Ähnlichkeit keinen Vorteil", () => {
  for (const area of AREAS.map((a) => a.key)) {
    for (const size of [2, 3, 4]) {
      const opposite: TeamMemberInput[] = Array.from({ length: size }, (_, n) => ({
        person_id: String(n), name: `P${n}`, profile: profile(String(n), n === 0 ? 1 : 5),
      }));
      const o = teamAreaFinding(opposite, area);
      assert.equal(o.kind, "opposite");
      assert.doesNotMatch(`${o.summary} ${o.hypothesis}`, /Konflikt|Streit|bremst|bremsen|behinder|blockier|problematisch|Problem|Reibung|scheiter|führt zu|wird .{0,30}(stören|nerven)/i, area);
      assert.match(o.hypothesis ?? "", /könnt|könnte|kann/, `${area}: Hypothese ist keine Möglichkeit`);
      // Ergaenzung nur als Bedingung.
      if (/ergänz/.test(o.hypothesis ?? "")) assert.match(o.hypothesis!, /könnte sich ergänzen, wenn/, area);
      assert.match(o.question ?? "", /\?$/);

      const similar: TeamMemberInput[] = Array.from({ length: size }, (_, n) => ({
        person_id: String(n), name: `P${n}`, profile: profile(String(n), 5),
      }));
      const s = teamAreaFinding(similar, area);
      assert.equal(s.kind, "similar");
      assert.doesNotMatch(`${s.summary} ${s.hypothesis}`, /Vorteil|Stärke|hilfreich|erleichter|bringt|Tempo|gut für|passt gut|harmon/i, area);
    }
  }
});

test("POTENTIAL_COMPLEMENT bleibt Arbeitshypothese", () => {
  const m = (n: number, v: number): ProductMember => ({ person_id: String(n), name: `P${n}`, capabilities: [], alignment: null, workstyle: profile(String(n), v) });
  for (const p of teamPatterns([m(1, 1), m(2, 5)])) {
    assert.equal(p.complement?.category, "POTENTIAL_COMPLEMENT");
    assert.match(p.complement!.text, /könn/, p.key);
    assert.doesNotMatch(p.complement!.text, /ergänzt euch|ihr ergänzt|seid komplementär|perfekt/i, p.key);
  }
});

test("Überblick wirkt nicht stärker als der Text", () => {
  for (const area of AREAS.map((a) => a.key)) {
    for (const shape of SHAPES) {
      const p = withArea(area, shape);
      const pattern = areaPattern(p, area);
      const mark = overviewMark(p, area);
      if (pattern.kind === "mixed") assert.equal(mark.kind, "range", `${area} ${shape}: gemischt, aber ein Punkt`);
      if (pattern.kind === "insufficient") assert.equal(mark.kind, "none");
      if (pattern.kind === "direction" && mark.kind === "point") {
        const band = mark.position <= 1 ? "lower" : mark.position >= 3 ? "upper" : "middle";
        assert.equal(band, pattern.band, `${area} ${shape}: Punkt liegt außerhalb der Richtung`);
      }
    }
  }
  const src = readFileSync("src/features/reporting/workstyle/SignatureOverview.tsx", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.match(src, /overviewMark/);
  assert.doesNotMatch(src, /displayPosition|radar|spider|score/i);
});

test("jede Aussage hat eine interne Claim-ID", () => {
  const pattern = /^(EVI|EXP|EL|VOICE|AMB|ORG)\.(INSUFFICIENT|MIXED|DIRECTION\.(UPPER|LOWER|MIDDLE)\.(ALL|MOST)|ITEM\.[A-Z]+-\d+|TEAM\.(INSUFFICIENT|NUANCE|SIMILAR\.(UPPER|LOWER|NO_DIRECTION)|OPPOSITE(\.ORG-0\d)?))$/;
  for (const area of AREAS.map((a) => a.key)) {
    for (const shape of SHAPES) {
      const n = areaNarrative(withArea(area, shape), area);
      assert.match(n.claim, pattern);
      for (const note of n.itemNotes) assert.match(note.claim, pattern);
    }
    const t = teamAreaFinding([
      { person_id: "1", name: "A", profile: profile("1", 1, { "ORG-03": "A" }) },
      { person_id: "2", name: "B", profile: profile("2", 5, { "ORG-03": "B" }) },
    ], area);
    assert.match(t.claim, pattern);
  }
  for (const file of ["IndividualWorkstyle.tsx", "TeamWorkstyleReport.tsx"])
    assert.match(readFileSync(`src/features/reporting/workstyle/${file}`, "utf8"), /data-claim=\{/);
});

test("Fähigkeit, Verantwortungswunsch und Sourcing bleiben getrennt", () => {
  const area = { area_id: "x", family_id: "f", sort_order: 1, sourcing: "component" } as never;
  const person = (id: string, level: number | null, wish: string | null): ProductMember =>
    ({ person_id: id, name: id, alignment: null, workstyle: profile(id, 3), capabilities: [{ area_id: "x", application_level: level, ownership_wish: wish }] }) as never;
  // Hohe Erfahrung ohne Wunsch ist keine Verantwortung; Wunsch ohne Erfahrung ist eine.
  const [row] = componentRows([person("A", 5, "prefer_other"), person("B", 1, "own")], [area]);
  assert.deepEqual(row.owners.map((o) => o.name), ["B"]);
  // Extern beziehbar ist eine Eigenschaft des Bereichs, keine Aussage über Kompetenz.
  assert.ok(row.states.includes("EXTERNAL_COMPONENT"));
  assert.ok(row.states.includes("INTERNALLY_COVERED"));
  const matrix = readFileSync("src/features/reporting/workstyle/ComponentMatrix.tsx", "utf8");
  assert.match(matrix, /Erfahrung ist kein Verantwortungswunsch/);
  assert.match(matrix, /„extern lösbar“ sagt nichts über eure Kompetenz/);
  assert.doesNotMatch(matrix, /Viel Erfahrung/);
});

test("Venture und Setup: Erwartung ist kein Verhalten, nur Bestätigtes ist vereinbart", () => {
  const report = readFileSync("src/features/reporting/workstyle/TeamWorkstyleReport.tsx", "utf8");
  assert.match(report, /kein beobachtetes\s+Verhalten und noch keine Vereinbarung/);
  assert.match(report, /Nur Vereinbarungen aus Founder Setup, die alle aktuellen Mitglieder bestätigt haben/);
  assert.match(report, /auch dort, wo ihr ähnlich antwortet/);
});
