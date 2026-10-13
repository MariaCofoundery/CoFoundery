import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  COMPARISON_STATES,
  buildCapabilityComparison,
  type ComparisonSide,
  type ComparisonStateKey,
} from "@/features/capability/capabilityComparison";
import { APPLICATION_LEVELS, DEPTH_LEVEL, OWNERSHIP_WISHES } from "@/features/capability/capabilityTypes";
import type { CapabilityArea, CapabilityFamily } from "@/features/capability/capabilityTypes";

const source = (path: string) => readFileSync(path, "utf8");

const families: CapabilityFamily[] = [
  { family_id: "product_value", sort_order: 2 },
  { family_id: "commercial_growth", sort_order: 5 },
];
const areas: CapabilityArea[] = [
  { area_id: "product_management", family_id: "product_value", sort_order: 2 },
  { area_id: "ux_design", family_id: "product_value", sort_order: 4 },
  { area_id: "b2b_sales", family_id: "commercial_growth", sort_order: 1 },
  { area_id: "marketing_brand", family_id: "commercial_growth", sort_order: 3 },
  { area_id: "fundraising", family_id: "commercial_growth", sort_order: 6 },
];

const side = (areaId: string, level: number | null, wish: string | null): ComparisonSide => ({
  areaId,
  applicationLevel: level,
  ownershipWish: wish,
});

const compare = (a: ComparisonSide[], b: ComparisonSide[]) =>
  buildCapabilityComparison(a, b, areas, families);

/** Der Zustand eines Bereichs bei genau einer Paarung. */
function stateOf(
  levelA: number | null,
  wishA: string | null,
  levelB: number | null,
  wishB: string | null
) {
  const result = compare([side("b2b_sales", levelA, wishA)], [side("b2b_sales", levelB, wishB)]);
  const area = result.groups.flatMap((group) => group.areas)[0];
  return { state: area?.state, owner: area?.owner };
}

// ---------------------------------------------------------------------------
// Die fuenf Zustaende
// ---------------------------------------------------------------------------
test("both wanting to own is named as an open question, not as healthy friction", () => {
  const { state } = stateOf(5, "own", 5, "own");
  assert.equal(state, "contested");

  // De Dreu & Weingart (2003): auch Aufgabenkonflikt haengt negativ mit
  // Leistung zusammen. Der Text darf das nicht als Qualitaet verkaufen.
  const de = JSON.parse(source("messages/de/capability.json"));
  const copy = de.comparison.states.contested;
  assert.doesNotMatch(`${copy.title} ${copy.text}`, /gesund|produktiv|fruchtbar/i);
});

test("nobody wanting it is an open position", () => {
  assert.equal(stateOf(5, "prefer_other", 3, "contribute").state, "openPosition");
  assert.equal(stateOf(2, "prefer_external", 2, "prefer_other").state, "openPosition");
});

test("a claim without depth on either side marks the team as thin there", () => {
  assert.equal(stateOf(2, "own", 1, "contribute").state, "bothShallow");
  // Ohne angegebene Stufe ist der Anspruch auch ohne Tiefe.
  assert.equal(stateOf(null, "own", 3, "prefer_other").state, "bothShallow");
});

test("depth on one side plus a shallow claim on the other is a handover path", () => {
  // Der Anspruch ist `own` ohne Tiefe; "moechte hineinwachsen" ist kein
  // Anspruch und ergibt diesen Weg nicht (siehe unten).
  const fromA = stateOf(5, "prefer_other", 1, "own");
  assert.equal(fromA.state, "handoverPath");
  assert.equal(fromA.owner, "a", "die Tiefe liegt bei A");

  const fromB = stateOf(2, "own", 5, "contribute");
  assert.equal(fromB.state, "handoverPath");
  assert.equal(fromB.owner, "b");
});

test("one wants it and can, the other does not want it - the role already sits", () => {
  const a = stateOf(5, "own", 2, "prefer_other");
  assert.equal(a.state, "settled");
  assert.equal(a.owner, "a");

  const b = stateOf(3, "contribute", 4, "own");
  assert.equal(b.state, "settled");
  assert.equal(b.owner, "b");
});

// ---------------------------------------------------------------------------
// Nur `own` ist ein Anspruch
// ---------------------------------------------------------------------------
// "Moechte hineinwachsen" ist ein Entwicklungswunsch - weder Anspruch noch
// Absage. Bis zum 13.10.2026 zaehlte es als Anspruch; diese Faelle halten fest,
// dass daraus kein doppelter Anspruch und keine Rolle mehr entsteht.
test("A: own + own bleibt ein doppelter Anspruch", () => {
  assert.equal(stateOf(5, "own", 5, "own").state, "contested");
  assert.equal(stateOf(1, "own", 2, "own").state, "contested");
});

test("B: own + grow_into ist kein doppelter Anspruch", () => {
  for (const [levelA, levelB] of [[5, 1], [2, 5], [5, 5], [null, null]] as const) {
    const result = stateOf(levelA, "own", levelB, "grow_into");
    assert.notEqual(result.state, "contested", `${levelA}/own vs ${levelB}/grow_into`);
    assert.equal(result.state, "noBasis", "die hineinwachsende Seite hat ueber die Zustaendigkeit nicht entschieden");
    assert.equal(result.owner, null);
  }
});

test("C: grow_into + grow_into ist kein Anspruch", () => {
  assert.deepEqual(stateOf(1, "grow_into", 2, "grow_into"), { state: "noBasis", owner: null });
  assert.deepEqual(stateOf(5, "grow_into", 5, "grow_into"), { state: "noBasis", owner: null });
});

test("D: grow_into + prefer_other macht die hineinwachsende Seite nicht zur Anspruchsseite", () => {
  // Frueher: handoverPath bzw. bothShallow bzw. settled mit der grow_into-Seite als Anspruch.
  assert.deepEqual(stateOf(1, "grow_into", 5, "prefer_other"), { state: "noBasis", owner: null });
  assert.deepEqual(stateOf(null, "grow_into", 3, "prefer_other"), { state: "noBasis", owner: null });
  assert.deepEqual(stateOf(5, "grow_into", 2, "prefer_other"), { state: "noBasis", owner: null });
  // Und auch keine offene Stelle: Wer hineinwachsen will, hat nicht abgesagt.
  assert.notEqual(stateOf(2, "grow_into", 2, "prefer_external").state, "openPosition");
});

test("E: contribute + own - nur own beansprucht", () => {
  assert.deepEqual(stateOf(3, "contribute", 4, "own"), { state: "settled", owner: "b" });
  assert.deepEqual(stateOf(5, "contribute", 2, "own"), { state: "handoverPath", owner: "a" });
  assert.equal(stateOf(2, "contribute", 2, "own").state, "bothShallow");
});

test("F: unclear + grow_into ist kein Anspruch", () => {
  assert.deepEqual(stateOf(5, "unclear", 5, "grow_into"), { state: "noBasis", owner: null });
});

test("grow_into erzeugt mit keiner Gegenseite einen Anspruchs-Zustand", () => {
  const levels: (number | null)[] = [null, ...APPLICATION_LEVELS];
  const wishes: (string | null)[] = [null, ...OWNERSHIP_WISHES];
  for (const levelA of levels) {
    for (const levelB of levels) {
      for (const wishB of wishes) {
        const { state, owner } = stateOf(levelA, "grow_into", levelB, wishB);
        assert.equal(state, "noBasis", `${levelA}/grow_into vs ${levelB}/${wishB}`);
        assert.equal(owner, null);
      }
    }
  }
});

// ---------------------------------------------------------------------------
// Was der Vergleich nicht behaupten darf
// ---------------------------------------------------------------------------
test("a missing wish on either side yields no state at all", () => {
  // Der haeufige Fall: Die andere Person hat die Tiefe nicht freigegeben,
  // dann kommt sie als null zurueck - absichtlich ununterscheidbar von
  // "nicht eingetragen". Beides darf keine Aussage erzeugen.
  assert.equal(stateOf(5, null, 5, "own").state, "noBasis");
  assert.equal(stateOf(5, "own", 5, null).state, "noBasis");
  assert.equal(stateOf(null, null, null, null).state, "noBasis");
});

test("\"still unclear\" is not read as not wanting it", () => {
  // Der Fehler, den es hier zu verhindern gilt: "noch unklar" ist eine
  // Angabe, aber keine Entscheidung. Daraus "niemand will es verantworten"
  // zu machen waere eine Deutung - und faelschlich beruhigend.
  assert.equal(stateOf(5, "unclear", 5, "prefer_other").state, "noBasis");
  assert.equal(stateOf(3, "unclear", 3, "unclear").state, "noBasis");
  // Auch kein Anspruch: unklar heisst nicht, dass jemand es haben will.
  assert.equal(stateOf(5, "unclear", 2, "own").state, "noBasis");

  // Zum Gegenbeweis: ausdrueckliche Absagen ergeben sehr wohl eine offene
  // Stelle.
  assert.equal(stateOf(5, "prefer_other", 5, "contribute").state, "openPosition");
});

test("no state ever carries an owner it cannot justify", () => {
  const withoutOwner: ComparisonStateKey[] = [
    "contested",
    "openPosition",
    "bothShallow",
    "noBasis",
  ];
  const result = compare(
    [
      side("b2b_sales", 5, "own"),
      side("ux_design", 5, "prefer_other"),
      side("marketing_brand", 2, "own"),
      side("fundraising", 5, null),
    ],
    [
      side("b2b_sales", 5, "own"),
      side("ux_design", 3, "contribute"),
      side("marketing_brand", 1, "contribute"),
      side("fundraising", 5, "own"),
    ]
  );

  for (const group of result.groups) {
    for (const area of group.areas) {
      if (withoutOwner.includes(group.state)) {
        assert.equal(area.owner, null, `${group.state} darf keinen Owner tragen`);
      } else {
        assert.ok(area.owner, `${group.state} braucht einen Owner`);
      }
    }
  }
});

test("the numbers each side gave travel with the finding", () => {
  const result = compare([side("b2b_sales", 5, "own")], [side("b2b_sales", 2, "prefer_other")]);
  const area = result.groups[0].areas[0];
  // Nie eine Blackbox: wer den Befund sieht, soll die Angaben dahinter sehen.
  assert.deepEqual(area.a, { level: 5, wish: "own" });
  assert.deepEqual(area.b, { level: 2, wish: "prefer_other" });
});

test("an area only one person entered produces no finding, only coverage", () => {
  const result = compare([side("b2b_sales", 5, "own")], []);

  // Schweigen ist keine Absage. Es gibt hier nichts zu vergleichen, und das
  // unter "keine Grundlage" zu fuehren liest sich wie ein Fehlschlag.
  assert.deepEqual(result.groups, [], "kein Befund ohne zweite Angabe");
  // In der Deckung erscheint der Bereich trotzdem - dort gehoert er hin.
  assert.equal(result.coverage.together, 1);
  assert.equal(result.coverage.onlyA, 1);
  assert.equal(result.coverage.shared, 0);
});

test("noBasis is reserved for areas both entered but one left undecided", () => {
  // So bleibt der Befund informativ: Ihr habt beide etwas dazu gesagt, aber
  // eine Seite hat sich nicht entschieden.
  const result = compare([side("b2b_sales", 5, "own")], [side("b2b_sales", 3, "unclear")]);
  assert.deepEqual(result.groups.map((group) => group.state), ["noBasis"]);
  const area = result.groups[0].areas[0];
  assert.deepEqual(area.a, { level: 5, wish: "own" });
  assert.deepEqual(area.b, { level: 3, wish: "unclear" });
});

test("an area outside the vocabulary is dropped instead of shown unlabelled", () => {
  const result = compare([side("gibt_es_nicht", 5, "own")], [side("gibt_es_nicht", 5, "own")]);
  assert.deepEqual(result.groups, []);
  assert.equal(result.coverage.together, 0);
});

// ---------------------------------------------------------------------------
// Kein Score, und die Lage statt einer Empfehlung
// ---------------------------------------------------------------------------
test("there is no score anywhere in the comparison", () => {
  const comparisonSource = source("src/features/capability/capabilityComparison.ts");
  const result = compare([side("b2b_sales", 5, "own")], [side("b2b_sales", 2, "prefer_other")]);

  // Edwards: Fit ueber Differenzwerte verwirft Information. Ein Prozentwert
  // wuerde zwei Achsen auf eine kollabieren.
  assert.equal("score" in result, false);
  assert.equal("percent" in result, false);
  assert.equal("match" in result, false);
  assert.doesNotMatch(comparisonSource, /const score|matchScore|compatibilityScore/);
});

test("both extremes of overlap are described, neither is recommended", () => {
  const allFive = areas.map((area) => side(area.area_id, 3, "contribute"));
  const high = compare(allFive, allFive);
  assert.equal(high.overlap, "high");
  assert.equal(high.coverage.shared, 5);

  const low = compare(
    [side("b2b_sales", 3, "own"), side("marketing_brand", 3, "own")],
    [side("product_management", 3, "own"), side("ux_design", 3, "own")]
  );
  assert.equal(low.overlap, "low");
  assert.equal(low.coverage.shared, 0);
  assert.equal(low.coverage.onlyA, 2);
  assert.equal(low.coverage.onlyB, 2);

  // Beide Lagen brauchen Text, und keiner darf als besser dastehen.
  const de = JSON.parse(source("messages/de/capability.json"));
  for (const key of ["high", "balanced", "low"]) {
    assert.ok(de.comparison.overlap[key], `comparison.overlap.${key} fehlt`);
    assert.doesNotMatch(de.comparison.overlap[key], /ideal|optimal|besser so|perfekt/i);
  }
});

test("too few areas means no overlap claim", () => {
  const thin = compare([side("b2b_sales", 3, "own")], [side("b2b_sales", 3, "contribute")]);
  assert.equal(thin.overlap, null, "aus einem Bereich laesst sich keine Lage ableiten");
});

// ---------------------------------------------------------------------------
// Aufbau
// ---------------------------------------------------------------------------
test("groups follow urgency, not the vocabulary order", () => {
  const result = compare(
    [side("b2b_sales", 5, "prefer_other"), side("product_management", 5, "own")],
    [side("b2b_sales", 1, "own"), side("product_management", 5, "own")]
  );
  assert.deepEqual(
    result.groups.map((group) => group.state),
    ["contested", "handoverPath"],
    "der doppelte Anspruch steht vor dem planbaren Weg"
  );
});

test("empty groups disappear", () => {
  const result = compare([side("b2b_sales", 5, "own")], [side("b2b_sales", 5, "own")]);
  assert.deepEqual(result.groups.map((group) => group.state), ["contested"]);
});

test("areas inside a group follow family then vocabulary order", () => {
  const result = compare(
    [side("fundraising", 5, "own"), side("product_management", 5, "own"), side("b2b_sales", 5, "own")],
    [side("fundraising", 5, "own"), side("product_management", 5, "own"), side("b2b_sales", 5, "own")]
  );
  assert.deepEqual(
    result.groups[0].areas.map((area) => area.areaId),
    ["product_management", "b2b_sales", "fundraising"]
  );
});

// ---------------------------------------------------------------------------
// Vollstaendigkeit ueber alle Paarungen
// ---------------------------------------------------------------------------
test("every possible pairing gets exactly one state, and that state has copy", () => {
  const levels: (number | null)[] = [null, ...APPLICATION_LEVELS];
  const wishes: (string | null)[] = [null, ...OWNERSHIP_WISHES];
  const de = JSON.parse(source("messages/de/capability.json"));
  const en = JSON.parse(source("messages/en/capability.json"));

  const seen = new Set<string>();
  let pairings = 0;

  for (const levelA of levels) {
    for (const wishA of wishes) {
      for (const levelB of levels) {
        for (const wishB of wishes) {
          pairings += 1;
          const { state, owner } = stateOf(levelA, wishA, levelB, wishB);
          assert.ok(state, `kein Zustand fuer ${levelA}/${wishA} vs ${levelB}/${wishB}`);
          assert.ok(
            COMPARISON_STATES.includes(state),
            `unbekannter Zustand ${state} fuer ${levelA}/${wishA} vs ${levelB}/${wishB}`
          );
          // Ein Owner ohne Tiefe waere eine Rollenempfehlung ohne Grundlage.
          if (owner === "a") assert.ok((levelA ?? 0) >= DEPTH_LEVEL || (levelB ?? 0) >= DEPTH_LEVEL);
          seen.add(state);
        }
      }
    }
  }

  assert.equal(pairings, levels.length * wishes.length * levels.length * wishes.length);
  // Ein Zustand ohne Text wuerde next-intl werfen und die Seite mit 500
  // beenden - und zwar erst bei dem Paar, das genau diese Kombination hat.
  for (const state of seen) {
    assert.ok(de.comparison.states[state]?.title, `DE-Titel fehlt fuer ${state}`);
    assert.ok(de.comparison.states[state]?.text, `DE-Text fehlt fuer ${state}`);
    assert.ok(en.comparison.states[state]?.title, `EN-Titel fehlt fuer ${state}`);
    assert.ok(en.comparison.states[state]?.text, `EN-Text fehlt fuer ${state}`);
  }
});

test("the state derivation is symmetric: swapping the two people mirrors the result", () => {
  const levels: (number | null)[] = [null, 2, 5];
  const wishes: (string | null)[] = [null, ...OWNERSHIP_WISHES];
  const mirrored = { a: "b", b: "a", null: null } as Record<string, string | null>;

  for (const levelA of levels) {
    for (const wishA of wishes) {
      for (const levelB of levels) {
        for (const wishB of wishes) {
          const forward = stateOf(levelA, wishA, levelB, wishB);
          const backward = stateOf(levelB, wishB, levelA, wishA);
          // Wer links und wer rechts steht, ist eine Anzeigefrage. Haenge der
          // Befund daran, waere er willkuerlich.
          assert.equal(
            backward.state,
            forward.state,
            `nicht symmetrisch: ${levelA}/${wishA} vs ${levelB}/${wishB}`
          );
          assert.equal(backward.owner ?? null, mirrored[forward.owner ?? "null"] ?? null);
        }
      }
    }
  }
});
