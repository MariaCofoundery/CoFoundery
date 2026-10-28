import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  FINANCING_ALIGNMENT_ANSWERS,
  FINANCING_ALIGNMENT_QUESTIONS,
  FINANCING_ALIGNMENT_SETUP_TOPIC,
  compareFinancingAlignment,
  parseFinancingAlignmentAnswers,
} from "@/features/financing/financingAlignmentModel";
import { FOUNDER_SETUP_ITEM_KEYS } from "@/features/teams/founderSetupCatalog";

const source = (path: string) => readFileSync(path, "utf8");
const sql = source("../supabase/migrations/20270110120000_financing_alignment.sql")
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/^\s*--.*$/gm, "");

test("Abgleich: Vergleich je Frage - einig, verschieden oder offen (nie Streit wegen 'weiss ich nicht')", () => {
  const rows = [
    { userId: "a", question: "pace", answer: "a" }, { userId: "b", question: "pace", answer: "a" },
    { userId: "a", question: "control", answer: "a" }, { userId: "b", question: "control", answer: "c" },
    { userId: "a", question: "exit", answer: "b" }, { userId: "b", question: "exit", answer: "unsure" },
    { userId: "a", question: "time", answer: "unsure" }, { userId: "b", question: "time", answer: "unsure" },
  ];
  const result = Object.fromEntries(compareFinancingAlignment(rows).map((entry) => [entry.question, entry.state]));
  assert.equal(result.pace, "same");
  assert.equal(result.control, "differ");
  assert.equal(result.exit, "open");
  assert.equal(result.time, "same");
  // Ohne Antworten gibt es keinen Vergleich, und es gibt immer alle Fragen.
  assert.equal(compareFinancingAlignment([]).length, FINANCING_ALIGNMENT_QUESTIONS.length);
});

test("Abgleich: nur vollstaendige, bekannte Antworten werden angenommen", () => {
  const full = Object.fromEntries(FINANCING_ALIGNMENT_QUESTIONS.map((question) => [question, "a"]));
  assert.ok(parseFinancingAlignmentAnswers(full));
  assert.equal(parseFinancingAlignmentAnswers({ ...full, pace: "z" }), null);
  const { pace: _removed, ...partial } = full;
  assert.equal(parseFinancingAlignmentAnswers(partial), null);
  assert.equal(parseFinancingAlignmentAnswers(null), null);
});

test("Abgleich: Fragen und Antworten im Code und in der Datenbank sind dieselben", () => {
  const list = (marker: string) => {
    const at = sql.indexOf(marker);
    return [...sql.slice(at, sql.indexOf("))", at)).matchAll(/'([A-Za-z]+)'/g)].map((match) => match[1]).sort();
  };
  assert.deepEqual([...FINANCING_ALIGNMENT_QUESTIONS].sort(), list("team_financing_alignment_answers_question_check"));
  assert.deepEqual([...FINANCING_ALIGNMENT_ANSWERS].sort(), list("team_financing_alignment_answers_answer_check"));
  for (const topic of Object.values(FINANCING_ALIGNMENT_SETUP_TOPIC)) assert.ok(FOUNDER_SETUP_ITEM_KEYS.includes(topic));
});

test("Abgleich: Antworten bleiben verborgen, bis alle abgegeben haben, und nur der Zeitplan loescht", () => {
  assert.match(sql, /user_id = auth\.uid\(\)\s+or \(public\.is_current_user_founder_team_member[\s\S]*team_financing_alignment_complete\(alignment_id\)/);
  assert.match(sql, /count\(\*\) >= 2/);
  assert.doesNotMatch(sql, /grant (insert|update|delete)/i);
  assert.match(sql, /revoke all on function public\.purge_stale_financing_alignments\(integer, integer\) from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.purge_stale_financing_alignments\(integer, integer\) to service_role/);
  assert.match(source("src/features/privacy/retentionCleanup.ts"), /purge_stale_financing_alignments/);
});

test("Abgleich: Texte in beiden Sprachen, kein Freitext, keine Wertung", () => {
  for (const locale of ["de", "en"]) {
    const text = JSON.parse(source(`messages/${locale}/teams.json`)).financing.alignment as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    for (const question of FINANCING_ALIGNMENT_QUESTIONS) {
      const entry = text.questions[question];
      assert.ok(entry?.title && entry.a && entry.b && entry.c, `${locale}: ${question} unvollstaendig`);
    }
    assert.doesNotMatch(JSON.stringify(text), /Score|Punktzahl|Prozent|richtige Antwort ist|compatib|kompatib/i, `${locale}: Wertung im Text`);
  }
  const controls = source("src/features/financing/FinancingAlignmentControls.tsx");
  assert.doesNotMatch(controls, /<textarea/);
});
