import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { INTERVIEW_QUESTIONS } from "@/features/capability/capabilityInterviewGuide";
import { readCapabilityAreas } from "@/features/capability/capabilityVocabularyFromFiles";
import { readCapabilityTerms } from "@/features/strengths/capabilityTermsFromFiles";
import {
  buildStrengthInstruction,
  buildStrengthSchema,
  formatStrengthInput,
  isCapabilityLabel,
  MAX_STRENGTH_PROPOSALS,
  validateStrengthAnalysis,
  type StrengthAnswer,
} from "@/features/strengths/strengthAnalysisModel";
import { STRENGTHS_QUESTIONS } from "@/features/strengths/strengthsInterviewGuide";

/**
 * Das Stärken-Interview - getrennt vom Capability-Interview (18.10.2026).
 *
 * GEMELDET: "Stärken im Interview entdecken" endete in einer Einordnung nach
 * Funktionsbereichen ("Marketing & Brand", "Strategie & Geschäftsmodell").
 * Persönliche Stärken sollen aus dem Verhalten in erzählten Situationen
 * entstehen, belegt, und erst nach Bestätigung gelten. Die
 * Datenbank-Zusagen stehen in `supabase/tests/strength_interview.sql`.
 */

const read = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const terms = readCapabilityTerms();

const ANSWERS: StrengthAnswer[] = [
  {
    turnId: "t1",
    question: "Erzähl von einer Situation, in der du Verantwortung übernommen hast.",
    answer:
      "Niemand fühlte sich für die Übergabe zuständig, also habe ich selbst einen Termin mit allen organisiert und die nächsten Schritte aufgeschrieben.",
  },
  {
    turnId: "t2",
    question: "Erzähl von einer Situation mit Widerstand.",
    answer:
      "Ich habe meinen Vorschlag im Vorstand dreimal vorgestellt, obwohl er beim ersten Mal abgelehnt wurde. Beim dritten Mal habe ich vorher mit jedem einzeln gesprochen.",
  },
];

const strength = (
  label: string,
  evidence: { answer: string; quote: string }[],
  overrides: Partial<{ statement: string; rationale: string }> = {}
) => ({
  label,
  statement: overrides.statement ?? "Du übernimmst Verantwortung, wenn etwas ungeklärt bleibt.",
  rationale:
    overrides.rationale ??
    "In deinem Beispiel hast du selbst den nächsten Schritt organisiert, obwohl zunächst niemand zuständig war.",
  evidence,
});

const validate = (strengths: unknown[]) =>
  validateStrengthAnalysis({ strengths }, { answers: ANSWERS, capabilityTerms: terms });

// ---------------------------------------------------------------------------
// Keine Capability-Taxonomie
// ---------------------------------------------------------------------------

test("die Anweisung an das Modell enthält keine Funktionsbereiche und keine Gruppen", () => {
  const instruction = buildStrengthInstruction().toLocaleLowerCase("de-DE");
  const { areas } = readCapabilityAreas();
  for (const area of areas) {
    assert.ok(!instruction.includes(area.id), `Bereichs-ID im Prompt: ${area.id}`);
  }
  for (const locale of ["de", "en"]) {
    const bundle = JSON.parse(read(`messages/${locale}/capability.json`)) as {
      areaLabels: Record<string, string>;
      families: Record<string, string>;
    };
    for (const [id, label] of [...Object.entries(bundle.areaLabels), ...Object.entries(bundle.families)]) {
      assert.ok(!instruction.includes(label.toLocaleLowerCase("de-DE")), `${locale}: ${label} im Prompt`);
      assert.ok(!instruction.includes(id), `${locale}: ${id} im Prompt`);
    }
  }
  // Und die Stärken-Auswertung baut nicht auf der Bereichszuordnung auf.
  const model = codeOnly("src/features/strengths/strengthAnalysisModel.ts");
  assert.doesNotMatch(model, /narrativeAnalysis|capabilityVocabulary|areaId|readCapabilityAreas/);
});

test("„Marketing & Brand“ und andere Fachgebiete werden nicht als Stärke ausgegeben", () => {
  for (const label of ["Marketing & Brand", "Strategie & Geschäftsmodell", "Technologie & Umsetzung", "Prozesse & Tooling", "Marketing", "Strategy & Business Model", "Software-Entwicklung"]) {
    assert.ok(isCapabilityLabel(label, terms), `${label} gilt als Stärke`);
    const result = validate([strength(label, [{ answer: "A1", quote: "habe ich selbst einen Termin mit allen organisiert" }])]);
    assert.deepEqual(result.proposals, [], `${label} kam durch`);
  }
});

test("die gemeinten Verhaltensstärken sind keine Fachgebiete", () => {
  // Die Beispiele aus dem Auftrag - keine feste Liste, aber keine davon darf
  // an der Sperre hängenbleiben.
  for (const label of [
    "Verantwortung übernehmen", "Initiative", "Durchsetzungsfähigkeit", "Beharrlichkeit", "Empathie",
    "Klarheit", "Strukturierungsfähigkeit", "Priorisieren", "Entscheidungsstärke", "Lernfähigkeit",
    "Kreativität", "Konfliktfähigkeit", "Anpassungsfähigkeit", "Andere mitnehmen", "Analytisches Denken",
    "Selbstorganisation", "Struktur schaffen", "Taking responsibility", "Persistence",
  ]) {
    assert.equal(isCapabilityLabel(label, terms), false, label);
  }
});

// ---------------------------------------------------------------------------
// Aus Situationen, mit Beleg
// ---------------------------------------------------------------------------

test("persönliche Stärken entstehen aus Situationen - mit Bezeichnung, Aussage, Begründung und Beleg", () => {
  const result = validate([
    strength("Verantwortung übernehmen", [{ answer: "A1", quote: "habe ich selbst einen Termin mit allen organisiert" }]),
    strength(
      "Beharrlichkeit",
      [{ answer: "A2", quote: "dreimal vorgestellt, obwohl er beim ersten Mal abgelehnt wurde" }],
      {
        statement: "Du vertrittst eine Position weiter, auch wenn zunächst Widerstand entsteht.",
        rationale: "Du hast deinen Vorschlag nach der Ablehnung zweimal erneut vorgestellt.",
      }
    ),
  ]);
  assert.equal(result.engine, "model");
  assert.deepEqual(
    result.proposals.map((p) => [p.label, p.evidence[0]?.turnId]),
    [["Verantwortung übernehmen", "t1"], ["Beharrlichkeit", "t2"]]
  );
  assert.equal(result.proposals[1]!.statement, "Du vertrittst eine Position weiter, auch wenn zunächst Widerstand entsteht.");
  assert.match(result.proposals[0]!.rationale, /In deinem Beispiel/);
});

test("jede Stärke braucht ein wörtliches Zitat aus genau der angegebenen Antwort", () => {
  const result = validate([
    // erfunden
    strength("Verantwortung übernehmen", [{ answer: "A1", quote: "ich bin immer der Verantwortliche gewesen" }]),
    // steht in A2, angegeben ist A1
    strength("Beharrlichkeit", [{ answer: "A1", quote: "dreimal vorgestellt, obwohl er beim ersten Mal" }]),
    // aus der FRAGE, nicht aus der Antwort
    strength("Klarheit", [{ answer: "A1", quote: "Situation, in der du Verantwortung übernommen hast" }]),
    // eine Antwort, die es nicht gibt
    strength("Initiative", [{ answer: "A9", quote: "habe ich selbst einen Termin mit allen organisiert" }]),
    // gar kein Beleg
    strength("Empathie", []),
    // zu kurz, um ein Beleg zu sein
    strength("Andere mitnehmen", [{ answer: "A2", quote: "einzeln" }]),
  ]);
  assert.deepEqual(result.proposals, [], "unbelegte Stärken werden nicht erfunden");
});

test("keine Diagnose, kein Typ, keine Zahl", () => {
  const quote = [{ answer: "A1", quote: "habe ich selbst einen Termin mit allen organisiert" }];
  const result = validate([
    strength("Verantwortung", quote, { statement: "Du bist eine sehr verantwortungsvolle Person." }),
    strength("Macher", quote, { statement: "Du übernimmst Verantwortung.", rationale: "Das zeigt deinen Persönlichkeitstyp als Macher." }),
    strength("Organisieren", quote, { statement: "Du organisierst zu 90 % alles selbst." }),
    strength("Führung", quote, { statement: "Du übernimmst Verantwortung.", rationale: "Dein Score für Führung ist hoch, wie das Beispiel zeigt." }),
  ]);
  assert.deepEqual(result.proposals, []);
});

test("ähnliche Stärken werden zusammengeführt, verschiedene aus derselben Antwort bleiben", () => {
  assert.equal(validate([
    strength("Klarheit schaffen", [{ answer: "A1", quote: "die nächsten Schritte aufgeschrieben" }]),
    strength("Struktur schaffen", [{ answer: "A1", quote: "habe ich selbst einen Termin mit allen organisiert" }]),
    strength("Andere mitnehmen", [{ answer: "A2", quote: "habe ich vorher mit jedem einzeln gesprochen" }]),
  ]).proposals.length, 3, "verschiedene Stärken werden nicht verschmolzen");
  const result = validate([
    strength("Verantwortung übernehmen", [{ answer: "A1", quote: "habe ich selbst einen Termin mit allen organisiert" }]),
    strength("Übernimmt Verantwortung", [{ answer: "A2", quote: "habe ich vorher mit jedem einzeln gesprochen" }]),
    strength("Struktur schaffen", [{ answer: "A1", quote: "die nächsten Schritte aufgeschrieben" }], {
      statement: "Bei unklaren Situationen ordnest du zuerst die nächsten Schritte.",
    }),
  ]);
  assert.deepEqual(result.proposals.map((p) => p.label), ["Verantwortung übernehmen", "Struktur schaffen"]);
  // Die Dublette bringt ihren Beleg mit - eine Stärke, zwei Situationen.
  assert.deepEqual(result.proposals[0]!.evidence.map((e) => e.turnId), ["t1", "t2"]);
  // Zwei Stärken aus derselben Antwort sind möglich.
  assert.equal(result.proposals[1]!.evidence[0]!.turnId, "t1");
});

test("höchstens fünf Vorschläge, und nichts heißt eine leere Liste", () => {
  const labels = ["Initiative", "Klarheit", "Empathie", "Kreativität", "Lernfähigkeit", "Selbstorganisation", "Priorisieren"];
  const many = validate(labels.map((label) => strength(label, [{ answer: "A1", quote: "habe ich selbst einen Termin mit allen organisiert" }])));
  assert.equal(many.proposals.length, MAX_STRENGTH_PROPOSALS);
  assert.deepEqual(validate([]).proposals, []);
  assert.deepEqual(validateStrengthAnalysis(null, { answers: ANSWERS, capabilityTerms: terms }).proposals, []);
});

test("das Modell darf nur auf die gegebenen Antworten verweisen - und sieht sie mit Kennung", () => {
  const schema = buildStrengthSchema(["A1", "A2"]) as {
    properties: { strengths: { items: { properties: { evidence: { minItems: number; items: { properties: { answer: { enum: string[] } } } } } } } };
  };
  const evidence = schema.properties.strengths.items.properties.evidence;
  assert.deepEqual(evidence.items.properties.answer.enum, ["A1", "A2"]);
  assert.equal(evidence.minItems, 1);
  const input = formatStrengthInput(ANSWERS);
  assert.match(input, /^\[A1\] Frage: /);
  assert.match(input, /\[A2\] Frage: .*\nAntwort: Ich habe meinen Vorschlag/);
  // Ohne erreichbares Modell keine Ersatzantwort aus Stichwörtern.
  assert.match(codeOnly("src/features/strengths/strengthAnalysisModel.ts"), /if \(raw === null\) return \{ proposals: \[\], engine: "unavailable" \};/);
});

// ---------------------------------------------------------------------------
// Das Interview: Situationen, nicht Selbstdarstellung
// ---------------------------------------------------------------------------

test("gefragt wird nach Situationen, nie direkt nach Stärken - in DE und EN", () => {
  const ids = STRENGTHS_QUESTIONS.map((question) => question.id);
  assert.ok(ids.includes("initiated") && ids.includes("new_ground"), "die beiden neuen Situationen fehlen");
  for (const locale of ["de", "en"]) {
    const bundle = JSON.parse(read(`messages/${locale}/strengths.json`));
    for (const question of STRENGTHS_QUESTIONS) {
      const copy = bundle.interview.questions[question.id];
      assert.ok(copy?.title && copy?.hint, `${locale}: ${question.id}`);
      assert.match(copy.title, /Erzähl|Wobei|Tell me|What do others/, `${locale}: ${question.id} fragt nicht nach einer Situation`);
      assert.doesNotMatch(copy.title, /deine Stärken|your strengths|Was kannst du|What are you good at/i, `${locale}: ${question.id}`);
      for (const followUp of question.followUpIds) {
        assert.ok(copy.followUps?.[followUp], `${locale}: ${question.id}.followUps.${followUp}`);
      }
    }
    // Das geteilte Antwortfeld braucht diese Schlüssel im eigenen Namensraum.
    for (const key of ["answerLabel", "answerHint", "answerPlaceholder", "tooShort", "submit", "submitLast", "submitPending", "pause", "pausePending", "skip", "skipPending", "restored", "saveStateIdle", "saveStateLocal", "saveStateSaving", "saveStateSaved", "saveStateFailed", "followUpTitle", "followUpHint"]) {
      assert.ok(bundle.interview[key], `${locale}: interview.${key}`);
    }
  }
});

test("die neuen Stärken-Fragen stehen nicht im Capability-Interview", () => {
  const capabilityIds = INTERVIEW_QUESTIONS.map((question) => question.id);
  assert.equal(capabilityIds.length, 8, "das Capability-Interview hat sich verändert");
  for (const id of ["initiated", "new_ground", "took_charge", "hard_won", "solved_problem", "resistance", "others_come"]) {
    assert.ok(!capabilityIds.includes(id), `${id} im Capability-Interview`);
  }
  const capability = JSON.parse(read("messages/de/capability.json")).interview.questions;
  assert.deepEqual(Object.keys(capability).sort(), [...capabilityIds].sort());
});

test("jeder Leser und jede Aktion des Stärken-Interviews filtert auf seine Art", () => {
  for (const path of ["src/features/strengths/strengthsInterviewData.ts", "src/features/strengths/strengthsInterviewActions.ts"]) {
    const code = codeOnly(path);
    const queries = code.split(/await client|client\s*\n?\s*\.from/).slice(1)
      .filter((query) => /from\("capability_interview_(sessions|turns)"\)/.test(query.slice(0, 120)));
    assert.ok(queries.length >= 3, `${path}: keine Leser gefunden`);
    for (const query of queries) {
      const statement = query.slice(0, query.indexOf(";") === -1 ? undefined : query.indexOf(";"));
      assert.match(statement, /STRENGTHS_INTERVIEW|session_id", sessionId/, `${path}: Abfrage ohne Art: ${statement.slice(0, 120)}`);
    }
  }
});

test("die Seite ist das Stärken-Interview - ohne Einordnung in Bereiche", () => {
  const page = codeOnly("src/app/(product)/profile/strengths-interview/page.tsx");
  assert.match(page, /getTranslations\("strengths"\)/);
  assert.match(page, /namespace="strengths"/);
  assert.doesNotMatch(page, /families|areaLabels|CapabilityAreaPicker|InterviewSortForm|\/profile\/interview\/sort|capabilityInterview/);
  // Die Auswertung nur auf Anforderung, und nur mit erreichbarem Modell.
  assert.match(page, /action=\{requestStrengthProposalsAction\}/);
  assert.match(page, /completed\.answers\.length > 0 && aiAvailable/);
  // Beide Einstiege führen hierher, nicht ins Capability-Interview.
  assert.match(codeOnly("src/features/capability/StrengthsSection.tsx"), /href="\/profile\/strengths-interview"/);
  assert.match(codeOnly("src/app/me/profile/page.tsx"), /href: "\/profile\/strengths-interview"/);
  for (const locale of ["de", "en"]) {
    const bundle = JSON.parse(read(`messages/${locale}/strengths.json`));
    assert.match(JSON.stringify(bundle), /Capability/, `${locale}: der Unterschied zum Capability-Interview wird nicht erklärt`);
    assert.doesNotMatch(JSON.stringify(bundle), /%|\bscore\b|Punktzahl|Typ:|kompatib|compatib/i, locale);
  }
});

// ---------------------------------------------------------------------------
// Bestätigung
// ---------------------------------------------------------------------------

test("Vorschläge müssen bestätigt werden - mit Bezeichnung und Aussage, beides editierbar", () => {
  const cards = codeOnly("src/features/strengths/StrengthProposalCards.tsx");
  assert.match(cards, /name="label"/);
  assert.match(cards, /name="statement"/);
  assert.match(cards, /action=\{confirmStrengthProposalAction\}/);
  assert.match(cards, /action=\{rejectStrengthProposalAction\}/);
  assert.match(cards, /proposal\.rationale/);
  assert.match(cards, /proposal\.quote/);
  const actions = codeOnly("src/features/capability/strengthActions.ts");
  assert.match(actions, /p_label: label\.length > 0 \? label : null/);
  assert.match(actions, /p_statement: statement\.length > 0 \? statement : null/);
  // Zurück nur an eine bekannte Adresse.
  assert.match(actions, /=== INTERVIEW_PATH \? INTERVIEW_PATH : null/);
  // Nur die Bestätigungsfunktion schreibt Vorschläge in die Stärken - nichts
  // im Stärken-Interview legt selbst eine Stärke an.
  for (const path of ["src/features/strengths/strengthsInterviewActions.ts", "src/features/strengths/strengthsInterviewData.ts", "scripts/ai-worker.ts"]) {
    assert.doesNotMatch(codeOnly(path), /from\("person_strengths"\)\s*\.(insert|upsert)/, path);
  }
  for (const locale of ["de", "en"]) {
    const proposals = JSON.parse(read(`messages/${locale}/strengths.json`)).proposals;
    assert.ok(proposals.confirm && proposals.reject && proposals.labelField && proposals.statementField, locale);
  }
});

// ---------------------------------------------------------------------------
// Capability bleibt Capability
// ---------------------------------------------------------------------------

test("die Capability-Auswertung erzeugt keine Stärken mehr", () => {
  const worker = codeOnly("scripts/ai-worker.ts");
  const capabilityCase = worker.slice(
    worker.indexOf('case "capability_area_proposal"'),
    worker.indexOf('case "direction_statement_proposal"')
  );
  assert.ok(capabilityCase.length > 0);
  assert.doesNotMatch(capabilityCase, /insert_ai_strength_proposal|strength/i);
  assert.match(capabilityCase, /insert_ai_capability_proposal/);

  const strengthCase = worker.slice(worker.indexOf('case "strength_proposal"'), worker.indexOf("default:"));
  assert.match(strengthCase, /get_ai_strength_job_answers/);
  assert.match(strengthCase, /createStrengthAnalyzer/);
  assert.doesNotMatch(strengthCase, /createModelNarrativeAnalyzer|insert_ai_capability_proposal|readCapabilityAreas/);

  const capabilityModel = read("src/features/capability/narrativeAnalysisModel.ts");
  assert.doesNotMatch(codeOnly("src/features/capability/narrativeAnalysisModel.ts"), /strength/i);
  assert.match(capabilityModel, /Du ordnest eine erzählte Arbeitssituation den folgenden Funktionsbereichen zu/);
});

test("die Migration ist additiv und trennt die Schreibwege", () => {
  const sql = read("../supabase/migrations/20261205120000_strength_interview.sql").replace(/^\s*--.*$/gm, "");
  assert.match(sql, /check \(kind in \('capability', 'direction', 'strengths'\)\)/);
  assert.match(sql, /'strength_proposal'\s*\)\);/);
  assert.match(sql, /add column label text,\s*add column rationale text,/);
  // ROLLOUT: Der alte Aufruf (Capability-Job) bleibt in dieser Migration
  // bestehen, damit ein alter Arbeiter waehrend des Deployments nicht
  // scheitert - mit einem Konflikt-Bezug, den es nach dem Wegfall von
  // `unique(turn_id)` noch gibt. Entfernt wird er erst in der getrennten
  // Aufraeum-Migration, die NICHT in `migrations/` liegt.
  assert.doesNotMatch(sql, /drop function public\.insert_ai_strength_proposal\(uuid, text, text, text, text\)/);
  assert.match(sql, /on conflict \(turn_id\) where label is null do nothing;/);
  const cleanup = read("../supabase/pending/20261206120000_strength_interview_cleanup.sql").replace(/^\s*--.*$/gm, "");
  assert.match(cleanup, /drop function if exists public\.insert_ai_strength_proposal\(uuid, text, text, text, text\);/);
  assert.doesNotMatch(cleanup, /delete from|truncate|drop table|drop column|drop index/i);
  assert.ok(!existsSync("../supabase/migrations/20261206120000_strength_interview_cleanup.sql"), "die Aufraeum-Migration liegt schon in migrations/");
  // Neuer Code benutzt nur den neuen Aufruf (mit Antwort und Bezeichnung).
  for (const call of codeOnly("scripts/ai-worker.ts").split('rpc("insert_ai_strength_proposal"').slice(1)) {
    assert.match(call.slice(0, 200), /p_turn_id[\s\S]*p_label/);
  }
  // Der Stärken-Schreibweg nimmt nur Stärken-Jobs an.
  const bodyOf = (signature: RegExp) => {
    const start = sql.search(signature);
    assert.ok(start >= 0, String(signature));
    const rest = sql.slice(start);
    return rest.slice(0, rest.indexOf("$$;"));
  };
  const strengthInsert = bodyOf(/insert_ai_strength_proposal\(\s*p_job_id uuid,\s*p_turn_id uuid/);
  assert.match(strengthInsert, /job\.job_type = 'strength_proposal'/);
  assert.doesNotMatch(strengthInsert, /capability_area_proposal/);
  const legacyInsert = bodyOf(/insert_ai_strength_proposal\(\s*p_job_id uuid,\s*p_statement text/);
  assert.match(legacyInsert, /job\.job_type = 'capability_area_proposal'/);
  // Nichts wird gelöscht oder umgeschrieben - das einzige UPDATE ist der
  // Statuswechsel beim Bestätigen, innerhalb der Funktion.
  assert.doesNotMatch(sql, /delete from|truncate|drop table|drop column/i);
  assert.equal(sql.match(/update public\.person_strength/g)?.length, 1);
});

test("person_strengths bleibt kompatibel: ohne Bezeichnung steht der Satz wie bisher da", () => {
  assert.match(codeOnly("src/features/capability/strengthData.ts"), /select\("id, label, statement, origin/);
  for (const path of ["src/features/reporting/FounderProfileStrengths.tsx", "src/features/capability/StrengthsSection.tsx"]) {
    const view = codeOnly(path);
    assert.match(view, /strength\.label \?/, path);
    assert.match(view, /\{strength\.statement\}/, path);
  }
  assert.ok(existsSync("../supabase/tests/strength_interview.sql"));
});
