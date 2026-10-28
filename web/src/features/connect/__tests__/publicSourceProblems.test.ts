import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { PUBLIC_SOURCE_PROBLEMS } from "@/features/connect/publicSourceProblems";
import { buildPublicSourceProblemsSql } from "@/features/connect/publicSourceProblemsSql";
import {
  CONNECT_GEOGRAPHIC_SCOPES,
  PROBLEM_DESCRIPTION_MAX,
  PROBLEM_DESCRIPTION_MIN,
  PROBLEM_TITLE_MAX,
  PROBLEM_TITLE_MIN,
} from "@/features/connect/connectTypes";

const root = join(import.meta.dirname, "..", "..", "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

test("Jeder Eintrag aus einer Quelle haelt die Grenzen der Datenbank ein", () => {
  for (const problem of PUBLIC_SOURCE_PROBLEMS) {
    const where = problem.key;
    assert.ok(problem.title.length >= PROBLEM_TITLE_MIN && problem.title.length <= PROBLEM_TITLE_MAX, `${where}: Titel`);
    assert.ok(
      problem.description.length >= PROBLEM_DESCRIPTION_MIN && problem.description.length <= PROBLEM_DESCRIPTION_MAX,
      `${where}: Beschreibung`
    );
    assert.ok((CONNECT_GEOGRAPHIC_SCOPES as readonly string[]).includes(problem.scope), `${where}: Reichweite`);
    assert.ok(problem.topics.length <= 8 && problem.industries.length <= 5 && problem.locations.length <= 3, `${where}: Listen`);
    assert.match(problem.sourceUrl, /^https:\/\/\S+$/, `${where}: Link`);
    assert.ok(problem.sourceName.trim().length >= 3 && problem.sourceName.length <= 200, `${where}: Quellenname`);
    assert.ok(problem.sourceYear.trim().length >= 4 && problem.sourceYear.length <= 20, `${where}: Jahr`);
    assert.ok(problem.sourceNote.length <= 300, `${where}: Quellenhinweis`);
    assert.ok(problem.key.length >= 3 && problem.key.length <= 120, `${where}: Schluessel`);
  }
});

test("Schluessel sind eindeutig, und keine Quelle steht ueberall", () => {
  const keys = PUBLIC_SOURCE_PROBLEMS.map((problem) => problem.key);
  assert.equal(new Set(keys).size, keys.length);
  const perSource = new Map<string, number>();
  for (const problem of PUBLIC_SOURCE_PROBLEMS) {
    const host = new URL(problem.sourceUrl).hostname;
    perSource.set(host, (perSource.get(host) ?? 0) + 1);
  }
  // Das Brett soll nicht nach einer Quelle aussehen.
  for (const [host, count] of perSource) assert.ok(count <= 8, `${host} kommt ${count}-mal vor`);
});

test("Die Texte versprechen nichts und stellen keine Person dar", () => {
  for (const problem of PUBLIC_SOURCE_PROBLEMS) {
    const text = `${problem.title} ${problem.description}`;
    assert.doesNotMatch(text, /\bich\b|\bwir\b|\bmein\b/i, `${problem.key}: Ich-Form`);
    assert.doesNotMatch(text, /\b(Lösung|Loesung|App|Plattform|Produkt)/i, `${problem.key}: Loesungsvorschlag`);
  }
});

test("Das eingespielte SQL ist aus der Liste erzeugt und wurde nicht von Hand geaendert", () => {
  assert.equal(read("../supabase/scripts/public_source_problems.sql"), buildPublicSourceProblemsSql(PUBLIC_SOURCE_PROBLEMS));
});

test("Das SQL ist wiederholbar und legt nichts mit Verfasser an", () => {
  const sql = buildPublicSourceProblemsSql(PUBLIC_SOURCE_PROBLEMS);
  assert.match(sql, /on conflict \(seed_key\) where seed_key is not null do update/);
  assert.doesNotMatch(sql, /published_at = /, "ein zweiter Lauf darf den Zeitpunkt nicht verschieben");
  assert.equal((sql.match(/^ {2}\(null, /gm) ?? []).length, PUBLIC_SOURCE_PROBLEMS.length);
  // Apostrophe im Text duerfen das SQL nicht aufbrechen.
  const quoted = buildPublicSourceProblemsSql([{ ...PUBLIC_SOURCE_PROBLEMS[0], title: "Es gibt kein 'Amt' online" }]);
  assert.match(quoted, /'Es gibt kein ''Amt'' online'/);
});

test("Die Seiten sagen bei Quelleneintraegen die Wahrheit", () => {
  const detail = read("src/app/(product)/connect/problems/[problemId]/page.tsx");
  const board = read("src/app/(product)/connect/problems/page.tsx");
  // Kein "ehemaliges Mitglied" und kein "erreicht niemanden" fuer Quelleneintraege.
  assert.match(detail, /author_user_id === null && !fromSource/);
  // Kein Interesse-Formular, wenn niemand antwortet.
  assert.match(detail, /!isAuthor && !fromSource && isPublished/);
  assert.match(detail, /problems\.source\.noReplyTitle/);
  // Die Quelle ist ein Link, der nicht den Verweis mitgibt.
  assert.match(detail, /target="_blank"\s+rel="noopener noreferrer"/);
  // Auf dem Brett steht die Quelle statt einer Person, ohne Interesse-Zahl.
  assert.match(board, /fromSource \?/);
  assert.match(board, /data-origin=\{problem\.origin\}/);
});

test("Die Migration verlangt eine Quelle und verbietet einen Verfasser", () => {
  const sql = read("../supabase/migrations/20270111120000_problem_public_source.sql");
  assert.match(sql, /origin = 'public_source'\s+and author_user_id is null/);
  assert.match(sql, /coalesce\(source_url ~ /);
  // Interesse und Mitglieder-Rechte bleiben unberuehrt: keine neue Policy.
  assert.doesNotMatch(sql, /create policy|alter policy|drop policy/i);
});
