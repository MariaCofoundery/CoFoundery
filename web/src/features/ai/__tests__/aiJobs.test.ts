import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

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

const MIGRATION = "../supabase/migrations/20261014120000_ai_jobs.sql";
const WORKER = "scripts/ai-worker.ts";

/**
 * Die Warteschlange fuer KI-Arbeit.
 *
 * Das Verhalten der Datenbank prueft `supabase/tests/ai_jobs.sql` mit 18
 * pgTAP-Faellen. Hier stehen die Zusagen, die sich an der FORM ablesen lassen -
 * und die am ehesten beim naechsten Umbau verloren gehen.
 */

test("in der Warteschlange liegen keine Personendaten", () => {
  // DIE VERBREITETE FORM WAERE input_data/result_data mit allem darin. Das
  // erzeugt eine zweite Datenwelt, die eine Kontoloeschung nicht erreicht.
  // Hier steht nur, WO die Nutzlast liegt.
  const migration = sqlCodeOnly(MIGRATION);
  const table = migration.slice(
    migration.indexOf("create table public.ai_jobs"),
    migration.indexOf("comment on table public.ai_jobs")
  );
  assert.ok(table.length > 0);

  for (const forbidden of ["input_data", "result_data", "payload", "prompt text", "response"]) {
    assert.doesNotMatch(table, new RegExp(forbidden, "i"), `ai_jobs traegt "${forbidden}"`);
  }
  assert.match(table, /source_table text/);
  assert.match(table, /source_id uuid/);
  // Und die Aufgabe geht mit dem Konto.
  assert.match(table, /subject_user_id uuid not null references auth\.users \(id\) on delete cascade/);
});

test("ein Fehler kann kein Text sein", () => {
  // Die FORM der Spalte ist die Zusage, nicht die Sorgfalt des Aufrufers: In
  // error_code kann kein Modelltext und kein Ausschnitt eines Lebenslaufs
  // landen. Ein pgTAP-Fall versucht es und scheitert am Constraint.
  assert.match(
    sqlCodeOnly(MIGRATION),
    /error_code is null or error_code ~ '\^\[a-z\]\[a-z_\]\{1,39\}\$'/
  );
});

test("was nicht auf der Liste steht, kommt nicht in die Schlange", () => {
  // Eine neue Art Arbeit braucht eine Migration - und damit eine Entscheidung,
  // keinen Tippfehler.
  const migration = sqlCodeOnly(MIGRATION);
  assert.match(migration, /ai_jobs_job_type_check check \(job_type in \(/);
  assert.match(migration, /'ping'/);
});

test("die Datenbank reicht Arbeit nur an eingetragene Rechner heraus", () => {
  const migration = sqlCodeOnly(MIGRATION);
  // Kein Service-Role-Schluessel auf einem Laptop: eine ausdrueckliche Liste.
  assert.match(migration, /create table public\.ai_workers/);
  const guards = migration.match(/if not public\.is_ai_worker\(\) then/g) ?? [];
  assert.ok(guards.length >= 4, `jede Arbeiter-Funktion muss pruefen, gefunden: ${guards.length}`);

  // Und niemand schreibt in die Schlange, auch nicht fuer sich selbst.
  assert.doesNotMatch(migration, /for insert to authenticated/);
  assert.match(migration, /ai_jobs_select_own on public\.ai_jobs/);
});

test("zwei Arbeiter kommen sich nicht in die Quere, und Liegengebliebenes kommt zurueck", () => {
  const migration = sqlCodeOnly(MIGRATION);
  assert.match(migration, /for update skip locked/);
  // Faellt ein Laptop mitten in einer Aufgabe aus, bliebe sie sonst fuer immer
  // auf "laufend" stehen.
  assert.match(migration, /claimed_at < now\(\) - interval '10 minutes'/);
  // Aber nicht endlos: Ein Grund verschwindet nicht durch einen sechsten Anlauf.
  assert.match(migration, /attempts < 5/);
});

test("der Arbeiter schreibt keine Inhalte ins Terminal", () => {
  // Ein Terminalfenster ist auch ein Logfile, und ein Bildschirmfoto davon
  // landet in einem Chat. Protokolliert werden Art, Dauer und Fehlerschluessel.
  const worker = codeOnly(WORKER);
  const logs = [...worker.matchAll(/console\.(log|error)\(([\s\S]*?)\);/g)].map((match) => match[2]);
  assert.ok(logs.length > 0);
  for (const line of logs) {
    for (const forbidden of ["narrative", "content", "input", "source_id", "subject_user_id"]) {
      assert.doesNotMatch(line, new RegExp(forbidden, "i"), `Protokollzeile nennt ${forbidden}`);
    }
  }

  // Und er hat keinen privilegierten Schluessel.
  assert.doesNotMatch(worker, /SERVICE_ROLE/);
  assert.match(worker, /signInWithPassword/);
});

test("der Arbeiter blaettert nicht in der Warteschlange", () => {
  // Er bekommt Aufgaben ausschliesslich ueber claim_ai_job(); lesen darf er die
  // Tabelle nicht. Ein pgTAP-Fall haelt das auf der Datenbankseite fest.
  const worker = codeOnly(WORKER);
  assert.doesNotMatch(worker, /from\("ai_jobs"\)/);
  assert.match(worker, /rpc\("claim_ai_job"\)/);
});

test("das Lebenszeichen verspricht nichts, was es nicht halten kann", () => {
  // Ein Arbeiter ohne laufendes Modell koennte nichts erledigen. Ein gruener
  // Punkt dafuer waere ein falsches Versprechen.
  const worker = codeOnly(WORKER);
  const beat = worker.slice(worker.indexOf("const beat ="), worker.indexOf("await beat()"));
  assert.match(beat, /isModelReachable/);
  assert.match(beat, /if \(!reachable\) return;/);
});

test("die Anzeige faellt auf 'nicht verfuegbar', wenn sie es nicht weiss", () => {
  // Lieber einmal zu wenig versprochen als ein gruener Punkt, hinter dem nichts
  // ist.
  const data = codeOnly("src/features/ai/aiAvailability.ts");
  assert.match(data, /return !error && data === true;/);

  const page = codeOnly("src/app/(product)/account/page.tsx");
  assert.match(page, /getAiAvailability\(supabase\)\.catch\(\(\) => false\)/);
  assert.match(page, /<AiAvailabilitySection available=/);
});

test("der Zustand steht in Worten da, nicht nur als Farbe", () => {
  // Eine Farbe allein ist fuer eine Vorlesesoftware keine Auskunft.
  const section = codeOnly("src/features/ai/AiAvailabilitySection.tsx");
  assert.match(section, /available \? t\("online"\) : t\("offline"\)/);
  assert.match(section, /aria-hidden/);
});

test("der Text sagt, wo gerechnet wird - in beiden Sprachen", () => {
  // Dass die Auswertung auf einem eigenen Rechner laeuft und nicht bei einem
  // grossen Anbieter, ist der Grund, warum die Texte das Haus nicht verlassen.
  // Das gehoert den Menschen gesagt, deren Texte es sind.
  for (const locale of ["de", "en"]) {
    const ai = (
      JSON.parse(readFileSync(`messages/${locale}/dashboard.json`, "utf8")) as {
        account: { ai?: Record<string, string> };
      }
    ).account.ai;
    assert.ok(ai, `${locale}: account.ai fehlt`);
    for (const key of ["title", "text", "online", "offline", "pending"]) {
      assert.ok(ai[key], `${locale}: account.ai.${key} fehlt`);
    }
    assert.ok(ai.text.length > 120, `${locale}: der Text erklaert es nicht`);
    assert.match(ai.pending, /plural/, `${locale}: ohne Plural wird daraus "1 Auswertungen"`);
  }
});

test("die Fassung des Prompts wird mitgeschrieben", () => {
  // Ohne Modell und Prompt-Fassung laesst sich spaeter nicht erklaeren, warum
  // ein altes Ergebnis anders aussieht als ein neues.
  assert.match(sqlCodeOnly(MIGRATION), /model text,[\s\S]{0,200}prompt_version smallint/);
  assert.match(codeOnly(WORKER), /PROMPT_VERSION = 1/);
  assert.match(codeOnly(WORKER), /p_prompt_version: PROMPT_VERSION/);
});
