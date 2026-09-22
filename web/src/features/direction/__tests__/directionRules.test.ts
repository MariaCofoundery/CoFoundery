import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { findDirectionRuleFindings } from "@/features/direction/directionRulesAnalysis";
import { DIRECTION_FACETS } from "@/features/direction/directionInterviewGuide";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const RULES = "src/features/direction/directionRulesAnalysis.ts";
const ACTIONS = "src/features/direction/directionStatementActions.ts";
const VIEW = "src/features/direction/DirectionProposals.tsx";
const MIGRATION = "../supabase/migrations/20261038120000_direction_rule_proposals.sql";
const sqlCodeOnly = (path: string) => source(path).replace(/^\s*--.*$/gm, "");

// ---------------------------------------------------------------------------
// Hinsehen ohne Modell
// ---------------------------------------------------------------------------
//
// GEWÜNSCHT AM 22.09.2026: "Es muss ja auch ohne KI gehen, dass der Text mal
// ein bisschen analysiert wird und geschaut wird, was sind so typische Sachen,
// die Menschen so anschreiben. Und dass man das dann bestätigen kann. Und sagt
// so: hey, wir arbeiten noch dran, das bitte prüfe gut, aber zumindest ist das
// etwas, was wir hier rausgelesen haben."
//
// DAMIT WIRD EINE ENTSCHEIDUNG AUS DEM BRIEF ZURÜCKGENOMMEN - aber nur die
// halbe: Ein Regelweg, der DEUTET, bleibt draußen. Dieser hier findet die
// Stelle und gibt sie wörtlich zurück.

test("gefunden wird die Stelle, und zurück kommt sie wörtlich", () => {
  const answer =
    "Wir hatten ein Anmeldeformular mit vierzehn Feldern. " +
    "Das hat mich genervt, weil die Leute dann angerufen haben und nicht weiterkamen. " +
    "Ich habe es umgebaut, damit die Leute es endlich allein schaffen.";

  const findings = findDirectionRuleFindings(answer);
  assert.ok(findings.length > 0, "nichts gefunden");

  for (const finding of findings) {
    // DIE ZUSAGE: Nichts wird formuliert. Der Vorschlag steht wörtlich im
    // Text - deshalb kann er falsch einsortiert sein, aber nichts behaupten.
    assert.ok(
      answer.includes(finding.statement),
      `nicht wörtlich im Text: "${finding.statement}"`
    );
    assert.equal(finding.quote, finding.statement);
    assert.ok((DIRECTION_FACETS as readonly string[]).includes(finding.facet));
  }
});

test("die Rubrik kommt von der Wendung, nicht vom Thema", () => {
  // Kein Schluss von Stichwörtern auf ein Thema ("du hast 'Kunden'
  // geschrieben, also ist dir Vertrieb wichtig"). Gesucht wird die Wendung,
  // mit der jemand selbst etwas als wichtig oder störend benennt.
  const annoyed = findDirectionRuleFindings(
    "Das hat mich genervt, weil niemand die Unterlagen rechtzeitig geschickt hat."
  );
  assert.equal(annoyed[0]?.facet, "frustrating_condition");

  const liked = findDirectionRuleFindings(
    "Am liebsten habe ich die Workshops mit den neuen Leuten gemacht."
  );
  assert.equal(liked[0]?.facet, "energising_activity");

  const recurring = findDirectionRuleFindings(
    "Das kommt bei mir immer wieder vor, in jedem Projekt seit Jahren."
  );
  assert.equal(recurring[0]?.facet, "recurring_theme");
});

test("ohne Wendung wird nichts behauptet", () => {
  // Ein leerer Fund ist ein gültiges Ergebnis. Lieber nichts als etwas
  // Erfundenes - das ist der ganze Unterschied zu einer Begriffsliste, die
  // rät und dabei seriös aussieht.
  assert.deepEqual(
    findDirectionRuleFindings(
      "Wir haben im Sommer ein Fest organisiert. Es kamen etwa achtzig Leute. Das Wetter war gut."
    ),
    []
  );
  assert.deepEqual(findDirectionRuleFindings(""), []);
  assert.deepEqual(findDirectionRuleFindings("Zu kurz."), []);
});

test("höchstens drei Funde, und jede Rubrik nur einmal", () => {
  const answer = [
    "Das hat mich genervt, dass wir immer alles dreimal machen mussten.",
    "Am liebsten habe ich mit den neuen Leuten gearbeitet und ihnen alles gezeigt.",
    "Das kommt bei mir immer wieder vor, seit Jahren dasselbe Muster.",
    "Danach konnten die Leute es allein und haben nicht mehr angerufen.",
    "Ich frage mich, ob das auf Dauer so weitergehen kann.",
  ].join(" ");

  const findings = findDirectionRuleFindings(answer);
  assert.ok(findings.length <= 3, `${findings.length} Funde`);
  assert.equal(new Set(findings.map((finding) => finding.facet)).size, findings.length);
});

test("ein langer Satz wird gekürzt, bleibt aber ein Zitat", () => {
  const long = `Das hat mich genervt, ${"und zwar wirklich sehr ".repeat(20)}bis zum Schluss.`;
  const findings = findDirectionRuleFindings(long);
  assert.equal(findings.length, 1);
  assert.ok(findings[0]!.statement.length <= 200);
  // Gekürzt an einer Wortgrenze - und weiterhin wörtlich enthalten, sonst
  // würde die Datenbank den Vorschlag ablehnen.
  assert.ok(long.includes(findings[0]!.statement));
});

test("die Datenbank prüft beides: Beleg UND Vorschlag", () => {
  // Beim Modell darf der Satz eine eigene Formulierung sein, hier nicht. Das
  // ist der Unterschied, und er steht in der Datenbank - nicht nur in dieser
  // Datei.
  const migration = sqlCodeOnly(MIGRATION);
  assert.match(migration, /position\(v_normalized_quote in v_normalized_source\) = 0/);
  assert.match(migration, /position\(v_normalized_statement in v_normalized_source\) = 0/);
  // Und die Herkunft steht an der Zeile, nicht im Kopf des Lesers.
  assert.match(migration, /source text not null default 'model'/);
  assert.match(migration, /check \(source in \('model', 'rules'\)\)/);
  // Ein Fund je Vorgang, Rubrik und Herkunft: Zweimal durchsehen gibt nicht
  // denselben Fund doppelt, und ein abgelehnter kommt nicht wieder.
  assert.match(migration, /unique \(turn_id, facet, source\)/);
});

test("es läuft sofort, nicht über die Warteschlange", () => {
  // Es gibt kein Modell, auf das zu warten wäre, und nichts verlässt den
  // Server - ein Auftrag wäre nur Wartezeit ohne Grund.
  const actions = codeOnly(ACTIONS);
  const from = actions.indexOf("readDirectionAnswersWithRulesAction");
  const body = actions.slice(from, actions.indexOf("export async function", from + 1));
  assert.match(body, /findDirectionRuleFindings/);
  assert.match(body, /insert_rule_direction_proposal/);
  assert.doesNotMatch(body, /enqueue_ai_job|request_direction_statement_proposals/);
});

test("der Vorbehalt steht an den Regel-Funden, nicht unter allem", () => {
  // MARIAS WORTE: "Sag so, hey, wir arbeiten noch dran, das bitte prüfe gut,
  // aber zumindest ist das etwas, was wir hier rausgelesen haben."
  const view = codeOnly(VIEW);
  assert.match(view, /proposal\.source === "rules" \?/);
  assert.match(view, /rulesCaveat/);
  // Und an jedem Vorschlag steht, wer gelesen hat.
  assert.match(view, /sources\.\$\{proposal\.source\}/);

  for (const locale of ["de", "en"]) {
    const proposals = (
      JSON.parse(source(`messages/${locale}/direction.json`)) as {
        proposals: { rulesCaveat: string; sources: Record<string, string> };
      }
    ).proposals;
    assert.ok(proposals.rulesCaveat, `${locale}: der Vorbehalt fehlt`);
    assert.ok(proposals.sources.model && proposals.sources.rules, `${locale}: die Herkunft fehlt`);
    // Der Vorbehalt muss beides sagen: dass daran gearbeitet wird UND dass
    // man prüfen soll. Nur "noch in Arbeit" wäre eine Ausrede, nur "prüfe
    // das" wäre eine Zumutung ohne Grund.
    assert.match(proposals.rulesCaveat, /arbeiten|working/i, `${locale}`);
    assert.match(proposals.rulesCaveat, /pr(ü|ue)f|check/i, `${locale}`);
  }
});
