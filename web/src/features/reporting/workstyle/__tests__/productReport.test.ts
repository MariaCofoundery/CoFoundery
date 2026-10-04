import test from "node:test";
import assert from "node:assert/strict";
import {
  PRODUCT_ITEMS,
  AREAS,
  displayPosition,
  rawChoice,
  responseBand,
  individualAreas,
  teamPatterns,
  validProductTeam,
  validProductProfile,
  type ProductMember,
  type ProductTeam,
} from "@/features/reporting/workstyle/model";
import { componentRows } from "@/features/reporting/workstyle/componentsModel";
import { alignmentPatterns } from "@/features/reporting/workstyle/alignmentModel";
import { readFileSync } from "node:fs";
const member = (n: number, value = 4): ProductMember => ({
  person_id: String(n),
  name: `Person ${n}`,
  capabilities: [],
  alignment: null,
  workstyle: {
    person_id: String(n),
    assessment_id: `a${n}`,
    instrument_id: "founder-workstyle-pretest-8-5a-v3",
    manifest_version: "3.0.0",
    item_version: "8.4-v0.4",
    completed_at: "2026-10-04",
    answers: PRODUCT_ITEMS.map((i) => ({
      item_key: i.item_key,
      item_version: i.item_version,
      value:
        i.response_format === "comparative"
          ? { optionId: value < 3 ? "lean_a" : "lean_b" }
          : { scale: value },
      missing_reason: null,
    })),
  },
});
const team = (n: number): ProductTeam => ({
  status: "ready",
  team_id: "team",
  team_name: "Vorhaben",
  team_context: "existing_team",
  people: Array.from({ length: n }, (_, i) => member(i)),
  taxonomy: { areas: [], families: [] },
  setup: [],
  setup_available: false,
});
for (const n of [2, 3, 4])
  test(`${n} members: team-level patterns, no pair expansion; mixed versions/research fail closed`, () => {
    const t = team(n);
    assert.equal(validProductTeam(t), true);
    assert.equal(teamPatterns(t.people).length, 6);
    assert.ok(
      teamPatterns(t.people).every((p) => p.category === "SIMILAR_PATTERN"),
    );
    t.people[n - 1] = member(n - 1, 1);
    assert.ok(
      teamPatterns(t.people).every((p) => p.category === "DIFFERENT_PATTERN"),
    );
    assert.ok(
      teamPatterns(t.people).every(
        (p) => p.complement?.category === "POTENTIAL_COMPLEMENT",
      ),
    );
    t.people[0].workstyle.manifest_version = "2.0.0";
    assert.equal(validProductTeam(t), false);
    t.people[0] = member(0);
    t.people[0].workstyle.answers[0].item_key = "DEC-01";
    assert.equal(validProductTeam(t), false);
  });
test("29 explicit core items, all six areas, raw missing and FC semantics", () => {
  assert.equal(PRODUCT_ITEMS.length, 29);
  assert.equal(AREAS.length, 6);
  assert.ok(
    PRODUCT_ITEMS.every(
      (i) => !i.item_key.includes("R") || i.area_key === "ORG",
    ),
  );
  const p = member(0).workstyle;
  assert.equal(validProductProfile(p), true);
  assert.equal(individualAreas(p).length, 6);
  const a = p.answers.find((a) => a.item_key === "ORG-03")!;
  assert.equal(responseBand(p, a.item_key), "B");
  a.value = null;
  a.missing_reason = "cannot_assess";
  assert.equal(rawChoice(p, a.item_key), null);
  p.answers.forEach((a) => {
    a.value = null;
    a.missing_reason = "cannot_assess";
  });
  assert.ok(individualAreas(p).every((a) => a.evidence.length === 0));
  assert.ok(
    teamPatterns([member(1), { ...member(0), workstyle: p }]).every(
      (p) => p.category === "INSUFFICIENT_DATA",
    ),
  );
});
for (const n of [2, 3, 4])
  test(`${n} component matrix keeps ability, ownership and sourcing independent`, () => {
    const people = team(n).people;
    const areas = [
      {
        area_id: "internal",
        family_id: "f",
        sort_order: 1,
        sourcing: "internal_only" as const,
      },
      {
        area_id: "external",
        family_id: "f",
        sort_order: 2,
        sourcing: "component" as const,
      },
      {
        area_id: "depends",
        family_id: "f",
        sort_order: 3,
        sourcing: "depends" as const,
      },
    ];
    people.forEach(
      (p) =>
        (p.capabilities = areas.map((a) => ({
          area_id: a.area_id,
          application_level: 5,
          ownership_wish: "prefer_other",
        }))),
    );
    let rows = componentRows(people, areas);
    assert.ok(rows[0].states.includes("OPEN_INTERNAL"));
    assert.equal(rows[0].owners.length, 0);
    assert.ok(rows[1].states.includes("EXTERNAL_COMPONENT"));
    assert.ok(rows[2].states.includes("DEPENDS"));
    people[0].capabilities[0].ownership_wish = "grow_into";
    rows = componentRows(people, areas);
    assert.ok(rows[0].states.includes("GROWTH_AREA"));
    assert.equal(rows[0].owners.length, 0);
    people[0].capabilities[0].ownership_wish = "contribute";
    assert.equal(componentRows(people, areas)[0].owners.length, 0);
    people[0].capabilities[0].ownership_wish = "own";
    people[0].capabilities[0].application_level = 1;
    rows = componentRows(people, areas);
    assert.ok(rows[0].states.includes("SINGLE_POINT_OF_FAILURE"));
    assert.equal(rows[0].cells[0].entry?.application_level, 1);
    people[1].capabilities[0].ownership_wish = "own";
    assert.ok(componentRows(people, areas)[0].states.includes("MULTI_COVERED"));
    people[1].capabilities[1].ownership_wish = "prefer_external";
    assert.deepEqual(componentRows(people, areas)[1].externalPreference, [
      "Person 1",
    ]);
    people[1].capabilities = [];
    rows = componentRows(people, areas);
    assert.ok(rows[0].states.includes("INSUFFICIENT_DATA"));
    assert.ok(!rows[0].states.includes("SINGLE_POINT_OF_FAILURE"));
  });
test("alignment missing is open, literal options reused, R02 not pair-assumed with 3+", () => {
  const people = team(3).people;
  people.forEach(
    (p) =>
      (p.alignment = [
        {
          item_key: "U01",
          value: { optionId: "U01_o1" },
          missing_reason: null,
        },
      ]),
  );
  assert.equal(
    alignmentPatterns(people).find((a) => a.item.itemId === "U01")!.status,
    "Ähnliche Erwartungen",
  );
  people[1].alignment![0].value = { optionId: "U01_o5" };
  assert.equal(
    alignmentPatterns(people).find((a) => a.item.itemId === "U01")!.different,
    true,
  );
  assert.ok(
    alignmentPatterns(people).find((a) => a.item.itemId === "R02")!.ambiguous,
  );
});
test("product views share a raw-item signature; no research read path or external LLM", () => {
  const signature = readFileSync(
    "src/features/reporting/workstyle/WorkstyleSignature.tsx",
    "utf8",
  );
  assert.match(signature, /rawChoice/);
  assert.doesNotMatch(signature, /Math\.random|median|score\s*=/);
  const data = readFileSync("src/features/reporting/workstyle/data.ts", "utf8");
  assert.doesNotMatch(
    data,
    /research_responses|getMyWorkstylePretest|openai|generateText/,
  );
  const css = readFileSync(
    "src/features/reporting/workstyle/report.css",
    "utf8",
  );
  assert.match(css, /@page\s*\{\s*size:\s*A4/);
  assert.match(css, /break-inside:\s*avoid/);
});

test("overview is a lower ordinal median of eligible core answers, with no missing imputation", () => {
  const p = member(0).workstyle;
  assert.equal(displayPosition(p, "EVI")?.value, 4);
  const exp = p.answers.filter((a) =>
    ["EXP-02", "EXP-03", "EXP-04", "EXP-06"].includes(a.item_key),
  );
  [1, 2, 4, 5].forEach((scale, n) => (exp[n].value = { scale }));
  assert.equal(displayPosition(p, "EXP")?.value, 2);
  p.answers.find((a) => a.item_key === "EXP-01")!.value = { scale: 5 };
  assert.equal(
    displayPosition(p, "EXP")?.value,
    2,
    "different seriousness format excluded",
  );
  exp.slice(0, 3).forEach((a) => {
    a.value = null;
    a.missing_reason = "cannot_assess";
  });
  assert.equal(displayPosition(p, "EXP"), null);
  p.answers.find((a) => a.item_key === "ORG-01")!.value = null;
  assert.equal(
    displayPosition(p, "ORG"),
    null,
    "FC does not replace missing ordinal evidence",
  );
});
