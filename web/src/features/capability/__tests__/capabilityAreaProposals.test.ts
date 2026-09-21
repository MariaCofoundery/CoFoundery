import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { APPLICATION_LEVELS } from "@/features/capability/capabilityTypes";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
const sqlCodeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*--.*$/gm, "");

const MIGRATION = "../supabase/migrations/20261032120000_capability_area_proposals.sql";
const ACTIONS = "src/features/capability/capabilityInterviewActions.ts";
const FORM = "src/features/capability/InterviewSortForm.tsx";
const PAGE = "src/app/(product)/profile/interview/sort/page.tsx";
const WORKER = "scripts/ai-worker.ts";

const sortCopy = (locale: string) =>
  (
    JSON.parse(readFileSync(`messages/${locale}/capability.json`, "utf8")) as {
      interview: { sort: Record<string, string> & { errors: Record<string, string> } };
    }
  ).interview.sort;

/**
 * "Guck mal, ich sehe das hier" - Vorschläge aus der eigenen Erzählung.
 *
 * GEWUENSCHT AM 21.09.2026: "Das Tool hat schon rausgefiltert, ey, das könnte
 * das und das sein, dass man aber trotzdem noch sagen müsste, vielleicht mit
 * einem Schieberegler: so würde ich mich selber einschätzen."
 *
 * Das Verhalten in der Datenbank prueft `supabase/tests/capability_area_proposals.sql`
 * mit 12 pgTAP-Faellen - darunter der wichtigste: Ein erfundenes Zitat wird
 * abgewiesen.
 */

test("ein Modell liest nur, wenn ein Mensch es bittet", () => {
  // DER UNTERSCHIED ZUM CONNECT-TEXT: Dort ist die Quelle eine
  // VEROEFFENTLICHTE Anzeige - oeffentlich, und deshalb ohne Rueckfrage
  // lesbar. Eine Interview-Antwort ist das Gegenteil: Frage 3 des Leitfadens
  // fragt ausdruecklich nach dem Leben ausserhalb der Erwerbsarbeit, und dort
  // steht Pflegearbeit, ein Verein, eine Trennung.
  const actions = codeOnly(ACTIONS);
  assert.match(actions, /export async function askForProposalsAction/);
  assert.match(actions, /rpc\("request_capability_area_proposals"/);

  // Und NICHT beim Einordnen von selbst: Ein Ablauf, der ungefragt private
  // Erzaehlungen an ein Modell gibt, waere genau das, was an solchen
  // Werkzeugen zu Recht kritisiert wird.
  const sortAction = actions.slice(
    actions.indexOf("export async function sortInterviewAnswerAction"),
    actions.indexOf("export async function resortInterviewAnswerAction")
  );
  assert.doesNotMatch(
    sortAction,
    /request_capability_area_proposals|enqueue_ai_job/,
    "das Einordnen fordert von selbst ein Modell an"
  );

  // Die Bedingung "nur die eigene Antwort" steht in der Datenbank, nicht in
  // der Oberflaeche - eine Pruefung dort waere eine Bitte, keine Grenze.
  const migration = sqlCodeOnly(MIGRATION);
  assert.match(migration, /capability_turn_not_readable/);
  assert.match(migration, /session\.user_id = v_user/);
});

test("die Datenbank prueft den Beleg, nicht der Prompt", () => {
  // DIE EINE SICHERUNG, AUF DIE ES ANKOMMT: Sie haelt auch dann, wenn der
  // Prompt schlecht formuliert ist, das Modell schwach antwortet oder die
  // Anwendung einen Fehler hat. Ein Modell, das etwas hinzudichtet, kann es
  // nicht belegen - und was es nicht belegen kann, kommt nicht hinein.
  const migration = sqlCodeOnly(MIGRATION);
  assert.match(migration, /position\(v_normalized_quote in v_normalized_source\) = 0/);
  assert.match(migration, /char_length\(v_normalized_quote\) < 12/);
  // Gross- und Kleinschreibung sowie Leerraum duerfen nicht entscheiden.
  assert.match(migration, /regexp_replace\(lower\(v_source\), '\\s\+', ' ', 'g'\)/);

  // UND DIE ANWENDUNG KANN KEINE VORSCHLAEGE ERFINDEN: kein Insert-Recht.
  assert.match(migration, /grant select, update, delete on public\.capability_area_proposals/);
  assert.doesNotMatch(migration, /grant[^;]*insert[^;]*capability_area_proposals/);
});

test("das Modell bekommt die Antwort - und nicht die Frage", () => {
  // Sonst koennte es Teile der FRAGE als Beleg ausgeben, und die Zitatpruefung
  // waere aufgeweicht: In der Frage steht ja schon, worum es geht.
  const migration = sqlCodeOnly(MIGRATION);
  const turnBranch = migration.slice(
    migration.indexOf("capability_interview_turns'"),
    migration.indexOf("else\n    return null;")
  );
  assert.match(turnBranch, /select turn\.answer into v_text/);
  assert.doesNotMatch(turnBranch, /question_id|question_text/, "die Frage geht mit");
});

test("der Arbeiter liest keine Tabelle, sondern bekommt einen Text", () => {
  const worker = codeOnly(WORKER);
  const branch = worker.slice(
    worker.indexOf('case "capability_area_proposal"'),
    worker.indexOf("default:")
  );
  assert.ok(branch.length > 0, "der Arbeiter kennt die Auftragsart nicht");
  assert.match(branch, /rpc\("get_ai_job_source_text"/);
  assert.doesNotMatch(branch, /\.from\(/, "der Arbeiter liest eine Tabelle direkt");

  // Kein Rueckfall auf die Regeln: Ein Regeltreffer waere ein Vorschlag OHNE
  // Zitat - der kaeme durch die Pruefung der Datenbank ohnehin nicht hindurch.
  assert.match(branch, /if \(analysis\.engine !== "model"\) return "model_unreachable"/);

  // Und das Vokabular kommt aus den Dateien: Der Arbeiter ist kein
  // Netzwerkmitglied und darf `capability_areas` nicht lesen.
  assert.match(branch, /readCapabilityAreas\(\)/);
});

test("das Vokabular wird aus ALLEN Migrationen gelesen", () => {
  // GEAENDERT AM 21.09.2026: `ai-eval.ts` las eine einzige Migration und
  // uebersah damit die fuenf Bereiche der Familie "Aussenauftritt &
  // Moderation" - genau die, deren Unsichtbarkeit Maria gemeldet hat. Eine
  // Auswertung, die eine Datei nennt, veraltet mit der ersten Erweiterung.
  const helper = codeOnly("src/features/capability/capabilityVocabularyFromFiles.ts");
  assert.match(helper, /readdirSync\(migrationDir\)/);
  assert.doesNotMatch(helper, /20260907160000/, "eine Migration wird namentlich gelesen");

  // Und beide Skripte benutzen dieselbe Funktion.
  for (const path of ["scripts/ai-eval.ts", "scripts/ai-worker.ts"]) {
    assert.match(codeOnly(path), /readCapabilityAreas/, `${path} liest das Vokabular selbst`);
  }

  // Ohne Beschriftung ist ein Bereich fuer ein Modell nichts - das faellt auf,
  // statt stillschweigend als Kennung durchgereicht zu werden.
  assert.match(helper, /withoutLabel/);
});

test("das Zitat steht sichtbar am Vorschlag", () => {
  // Es ist nicht Schmuck, sondern die ganze Absicherung - und sichtbar, damit
  // man den Vorschlag gegen die eigene Erzaehlung pruefen kann, ohne uns zu
  // glauben.
  const form = codeOnly(FORM);
  assert.match(form, /proposal\.quote/);
  assert.match(form, /proposals\.map\(/);

  for (const locale of ["de", "en"]) {
    const copy = sortCopy(locale);
    assert.ok(copy.fromModel, `${locale}: interview.sort.fromModel fehlt`);
    assert.ok(copy.fromModelHint, `${locale}: der Hinweis zum Beleg fehlt`);
    // Er muss sagen, dass die Person entscheidet.
    assert.match(
      copy.fromModelHint,
      locale === "de" ? /entscheidest du/ : /your call/,
      `${locale}: der Hinweis laesst den Vorschlag wie einen Befund klingen`
    );
  }
});

test("der Regler ist die verankerte Skala, keine Notenskala", () => {
  // "Wie krass bist du hier?" haette Selbstvertrauen gemessen statt Koennen -
  // und Selbstvertrauen ist ungleich verteilt. Die Anwendungsstufen 1-5 sind
  // situativ verankert ("wiederholt angewandt"), und genau die werden
  // angeboten.
  const form = codeOnly(FORM);
  assert.match(form, /APPLICATION_LEVELS\.map/);
  assert.match(form, /name=\{`level_\$\{proposal\.areaId\}`\}/);
  assert.equal(APPLICATION_LEVELS.length, 5);

  // Der Regler erscheint erst, wenn der Vorschlag angenommen ist: Eine Stufe
  // zu einem nicht bestaetigten Bereich waere eine Angabe ins Leere.
  assert.match(form, /\{isChosen \? \(/);

  // Und die Stufen gehen je Bereich in die Eintraege.
  assert.match(codeOnly(ACTIONS), /levelByArea\[areaId\] = parseApplicationLevel/);
  assert.match(
    codeOnly("src/features/capability/capabilityEvidenceWrite.ts"),
    /for \(const \[areaId, level\] of Object\.entries\(params\.levelByArea \?\? \{\}\)\)/
  );
});

test("ein entschiedener Vorschlag kommt nicht wieder", () => {
  // Wer etwas abgelehnt hat, hat eine Aussage gemacht - sie soll nicht beim
  // naechsten Lesen derselben Antwort wieder zur Frage werden.
  const actions = codeOnly(ACTIONS);
  assert.match(actions, /status: "accepted", decided_at/);
  assert.match(actions, /status: "rejected", decided_at/);

  // Und die Datenbank haelt fest, dass "entschieden" einen Zeitpunkt braucht.
  assert.match(
    sqlCodeOnly(MIGRATION),
    /check \(\(status = 'pending'\) = \(decided_at is null\)\)/
  );
});

test("kein Modell erreichbar ist kein Fehler", () => {
  // Es laeuft auf einem Rechner, der auch mal aus ist - und das Einordnen geht
  // ohne es vollstaendig. Ein roter Kasten waere hier eine Luege ueber den
  // Zustand des Werkzeugs.
  const page = codeOnly(PAGE);
  assert.match(page, /aiAvailable \?/);
  assert.match(page, /interview\.sort\.askUnavailable/);

  for (const locale of ["de", "en"]) {
    const copy = sortCopy(locale);
    assert.match(
      copy.askUnavailable,
      locale === "de" ? /kein Fehler/ : /not an error/,
      `${locale}: der Text laesst es wie einen Defekt klingen`
    );
    // Und der Satz vor dem Knopf sagt, was passiert.
    assert.match(
      copy.askText,
      locale === "de" ? /eigenen Hardware/ : /own hardware/,
      `${locale}: es steht nicht da, wohin der Text geht`
    );
    assert.match(
      copy.askText,
      locale === "de" ? /ohne/ : /without/,
      `${locale}: es steht nicht da, dass es auch ohne geht`
    );
  }
});
