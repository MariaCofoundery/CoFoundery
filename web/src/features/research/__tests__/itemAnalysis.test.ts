import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  analyseScale,
  correctedItemTotal,
  cronbachAlpha,
  describeItem,
  pearson,
  variance,
} from "@/features/research/itemAnalysis";

// ---------------------------------------------------------------------------
// Itemanalyse
// ---------------------------------------------------------------------------
//
// GEPRÜFT WIRD GEGEN BEKANNTE EIGENSCHAFTEN, nicht gegen Zahlen aus einem
// anderen Programm: Für Cronbachs Alpha gibt es drei Fälle, deren Ergebnis
// man ausrechnen kann, ohne zu rechnen. Ein Test, der nur einen Wert
// festschreibt, den ich selbst erzeugt habe, prüft nur, dass sich nichts
// ändert - nicht, dass es stimmt.

const item = (id: string, values: number[]) => ({ id, values });

test("identische Items ergeben Alpha = 1", () => {
  // Wenn alle Items dasselbe messen, ist die Summenvarianz k-mal so gross wie
  // die Itemvarianz mal k - das kürzt sich zu genau 1. Ein Wert, der auch das
  // Problem zeigt: Sechsmal dieselbe Frage ergibt ein perfektes Alpha.
  const values = [1, 2, 3, 4, 3, 2, 1, 4];
  const alpha = cronbachAlpha([
    item("a", values),
    item("b", values),
    item("c", values),
  ]);
  assert.ok(alpha !== null);
  assert.ok(Math.abs(alpha! - 1) < 1e-9, `Alpha war ${alpha}`);
});

test("unkorrelierte Items ergeben Alpha = 0", () => {
  // Bei exakt null Kovarianz ist die Summenvarianz gleich der Summe der
  // Itemvarianzen - dann wird der Klammerausdruck null.
  const a = [1, 1, 2, 2];
  const b = [1, 2, 1, 2];
  const alpha = cronbachAlpha([item("a", a), item("b", b)]);
  assert.ok(alpha !== null);
  assert.ok(Math.abs(alpha!) < 1e-9, `Alpha war ${alpha}`);
});

test("ein umgepoltes Item drückt Alpha unter null", () => {
  // DER FALL, DER IN DER PRAXIS VORKOMMT: Wird die Polarität nicht angewandt,
  // antwortet ein Item systematisch gegenläufig - und das sieht man sofort.
  const values = [1, 2, 3, 4];
  const flipped = values.map((value) => 5 - value);
  const items = [item("a", values), item("b", values), item("c", flipped)];
  const alpha = cronbachAlpha(items);
  assert.ok(alpha !== null && alpha! < 0, `Alpha war ${alpha}`);
  assert.ok(analyseScale(items).notes.includes("negative_alpha_check_polarity"));
});

test("heben sich zwei Items exakt auf, ist das ein Befund und kein fehlender Wert", () => {
  // Zwei exakt gegenläufige Items ergeben eine Summe ohne Streuung - Alpha ist
  // dann nicht berechenbar. Das stumm als "kein Wert" auszugeben würde den
  // auffälligsten Fall überhaupt verschlucken.
  const values = [1, 2, 3, 4];
  const report = analyseScale([item("a", values), item("b", values.map((value) => 5 - value))]);
  assert.equal(report.alpha, null);
  assert.ok(report.notes.includes("no_scale_variance"));
});

test("zu wenige Antworten werden benannt, nicht verschwiegen", () => {
  // Unter dreissig Antworten ist jede dieser Zahlen instabil. Sie trotzdem
  // auszugeben und nichts dazu zu sagen, waere die unehrlichste Variante.
  const report = analyseScale([item("a", [1, 2, 3, 4]), item("b", [2, 3, 4, 1])]);
  assert.ok(report.notes.includes("too_few_respondents"));
  assert.equal(report.n, 4);
});

test("ein Item ohne Varianz misst nichts - und das steht da", () => {
  const report = analyseScale([
    item("a", [3, 3, 3, 3]),
    item("b", [1, 2, 3, 4]),
    item("c", [2, 2, 3, 4]),
  ]);
  const flat = report.items.find((entry) => entry.id === "a")!;
  assert.ok(flat.notes.includes("no_variance"));
  assert.equal(flat.sd, 0);
  assert.equal(flat.itemTotal, null);
  // Und "nicht berechenbar" ist etwas anderes als "kein Zusammenhang".
  assert.ok(!flat.notes.includes("weak"));
});

test("die Trennschärfe misst gegen den REST, nicht gegen sich selbst", () => {
  // Ohne die Korrektur korreliert jedes Item mit einer Summe, in der es selbst
  // steckt - und sieht dadurch besser aus, als es ist. Besonders bei sechs
  // Items ist der Unterschied gross.
  const items = [item("a", [1, 2, 3, 4]), item("b", [1, 2, 3, 4]), item("c", [4, 3, 2, 1])];
  const corrected = correctedItemTotal(items, 2);
  assert.ok(corrected !== null && corrected! < 0, `war ${corrected}`);
});

test("die Grundrechnungen stimmen", () => {
  assert.equal(variance([2, 4, 4, 4, 5, 5, 7, 9]), 32 / 7);
  assert.equal(pearson([1, 2, 3], [2, 4, 6]), 1);
  assert.equal(pearson([1, 2, 3], [3, 2, 1]), -1);
  // Ohne Streuung gibt es keinen Zusammenhang, auch keinen von null.
  assert.equal(pearson([1, 1, 1], [1, 2, 3]), null);

  const described = describeItem(item("x", [1, 1, 1, 4]));
  assert.equal(described.distinct, 2);
  assert.equal(described.floorShare, 0.75);
  assert.equal(described.ceilingShare, 0.25);
});

test("das Skript liest den Forschungsstrom und nicht die Rohantworten", () => {
  // DIE GRENZE: `assessment_answers` gehört dem Produkt, der Forschungsstrom
  // der Forschung - auch wenn beide dieselbe Zahl enthalten. Der Unterschied
  // ist die Einwilligung und die Pseudonymisierung (`subject_hash` statt
  // `user_id`).
  const script = readFileSync("scripts/item-analysis.ts", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
  assert.match(script, /research_events_analytics_v1/);
  assert.doesNotMatch(script, /assessment_answers|from\("assessments"\)/);
  assert.doesNotMatch(script, /user_id/);

  // Und es schreibt nichts ins Repository: Eine Datei mit Auswertungen echter
  // Antworten gehört dort nicht hin, auch nicht als Aggregat.
  assert.doesNotMatch(script, /writeFileSync|createWriteStream/);

  // Die Polarität kommt aus derselben Quelle wie im Produkt - eine eigene
  // Liste hier wäre die zweite Wahrheit und damit die erste, die ausläuft.
  assert.match(script, /mapRegistryFounderChoiceToFounderPercent/);
});
