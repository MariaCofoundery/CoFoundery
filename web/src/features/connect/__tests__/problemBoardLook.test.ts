import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  PROBLEM_TRIED_LABEL,
  splitProblemDescription,
  PROBLEM_TRIED_MAX,
  composeProblemDescription,
} from "@/features/connect/problemDescription";
import { PROBLEM_DESCRIPTION_MAX } from "@/features/connect/connectTypes";

const root = join(import.meta.dirname, "..", "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

test("Ein leeres Feld 'schon versucht' laesst die Beschreibung unveraendert", () => {
  assert.deepEqual(composeProblemDescription("  Wenn jemand ausfaellt, ...  ", "   "), {
    ok: true,
    description: "Wenn jemand ausfaellt, ...",
  });
});

test("'Schon versucht' wird als beschrifteter Absatz angehaengt", () => {
  const result = composeProblemDescription("Beschreibung", "Mit drei Leitungen gesprochen.");
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.description, `Beschreibung\n\n${PROBLEM_TRIED_LABEL} Mit drei Leitungen gesprochen.`);
  }
});

test("Zu langer Anhang und zu lange Summe werden abgewiesen, nie still gekuerzt", () => {
  assert.deepEqual(composeProblemDescription("x".repeat(60), "y".repeat(PROBLEM_TRIED_MAX + 1)), {
    ok: false,
    reason: "tried_too_long",
  });
  assert.deepEqual(
    composeProblemDescription("x".repeat(PROBLEM_DESCRIPTION_MAX - 10), "y".repeat(100)),
    { ok: false, reason: "too_long" }
  );
});

test("Das Speichern prueft die Mindestlaenge an der Beschreibung allein", () => {
  const source = read("features/connect/connectProblemActions.ts");
  const save = source.slice(source.indexOf("export async function saveConnectProblemAction"));
  assert.match(save, /typedDescription\.length < PROBLEM_DESCRIPTION_MIN/);
  assert.ok(save.indexOf("typedDescription.length < PROBLEM_DESCRIPTION_MIN") < save.indexOf("composeProblemDescription("));
});

test("Das Brett bleibt nach Aktualitaet geordnet und fuehrt keine Rangfolge ein", () => {
  const page = read("app/(product)/connect/problems/page.tsx");
  const board = read("app/globals.css");
  assert.match(page, /getActiveConnectProblems/);
  assert.doesNotMatch(page, /\.sort\(|sortBy|orderBy|ranking|popular/i);
  assert.match(page, /boardHint/);
  // Die Bewegung haengt am Index der Anzeige, nicht an Zuspruch.
  assert.match(page, /"--i": index/);
  assert.doesNotMatch(page, /--i":\s*problem\./);
  assert.match(board, /prefers-reduced-motion: reduce\) \{\s*\.problem-night::before/);
});

test("Die Schreibzeile zeigt echte Titel und steht ohne Bewegungswunsch still", () => {
  const page = read("app/(product)/connect/problems/page.tsx");
  const component = read("features/connect/ProblemTypewriter.tsx");
  assert.match(page, /lines=\{problems\.slice\(0, 5\)\.map\(\(problem\) => problem\.title\)\}/);
  assert.match(component, /prefers-reduced-motion: reduce/);
  assert.match(component, /useState\(lines\[0\]\?\.length \?\? 0\)/);
});

test("Die Live-Notiz hoert nur zu: kein Speichern, keine Netzwerkzugriffe", () => {
  const component = read("features/connect/ProblemLiveNote.tsx");
  assert.doesNotMatch(component, /fetch\(|supabase|localStorage|sessionStorage/);
  // Texte kommen als Zeichenketten, nicht als Funktion ueber die Client-Grenze.
  assert.doesNotMatch(component, /t: \(/);
});

test("Beim Bearbeiten gibt es das Feld 'schon versucht' nicht, damit der Absatz nicht doppelt entsteht", () => {
  const form = read("features/connect/ConnectProblemForm.tsx");
  assert.match(form, /\{!problem \? \(\s*<label[^>]*htmlFor="problem-tried"/);
});

test("Der angehaengte Absatz wird in der Ansicht wieder abgetrennt", () => {
  const composed = composeProblemDescription("Beschreibung", "Mit drei Leitungen gesprochen.");
  assert.ok(composed.ok);
  if (composed.ok) {
    assert.deepEqual(splitProblemDescription(composed.description), {
      main: "Beschreibung",
      tried: "Mit drei Leitungen gesprochen.",
    });
  }
  // Ein Text, der die Beschriftung nur irgendwo enthaelt, bleibt unveraendert.
  const plain = `Wir haben es so erlebt. ${PROBLEM_TRIED_LABEL} nichts half.`;
  assert.deepEqual(splitProblemDescription(plain), { main: plain, tried: null });
  assert.deepEqual(splitProblemDescription(`Text\n\n${PROBLEM_TRIED_LABEL}   `), {
    main: `Text\n\n${PROBLEM_TRIED_LABEL}   `,
    tried: null,
  });
});

test("Alle Seiten des Problembereichs liegen auf demselben Grund", () => {
  for (const path of [
    "app/(product)/connect/problems/page.tsx",
    "app/(product)/connect/problems/new/page.tsx",
    "app/(product)/connect/problems/[problemId]/page.tsx",
    "app/(product)/connect/problems/[problemId]/edit/page.tsx",
  ]) {
    assert.match(read(path), /<ProblemNight>/, `${path} liegt nicht auf dem Grund des Problembereichs`);
    assert.doesNotMatch(read(path), /brand-panel/, `${path} hat noch den alten Kopf`);
  }
});
