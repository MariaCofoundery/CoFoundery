import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { sanitizeFeedbackPath } from "@/features/feedback/feedbackModel";

/** Produkt-Analyse und Forschungsereignisse speichern den Seitenpfad: nie mit Team-, Einladungs- oder Tokenkennung. */
test("der gespeicherte Pfad ersetzt Kennungen durch :id und verwirft Unbekanntes", () => {
  assert.equal(sanitizeFeedbackPath("/teams/3ebc02bd-5646-4c59-ba73-c3a2d69d1e94/setup"), "/teams/:id/setup");
  assert.equal(sanitizeFeedbackPath("/founder-alignment/vorhaben/3ebc02bd-5646-4c59-ba73-c3a2d69d1e94"), "/founder-alignment/vorhaben/:id");
  assert.equal(sanitizeFeedbackPath("/join/abc123token"), null);
  assert.equal(sanitizeFeedbackPath("/research/workstyle-pretest"), "/research/workstyle-pretest");
});

test("server.ts reinigt den Pfad mit derselben Regel, bevor er gespeichert wird", () => {
  const source = readFileSync(new URL("../server.ts", import.meta.url), "utf8");
  assert.match(source, /function asPagePath[\s\S]*?sanitizeFeedbackPath\(/);
  assert.doesNotMatch(source, /return path\?\.startsWith\("\/"\) \? path : null/);
});
