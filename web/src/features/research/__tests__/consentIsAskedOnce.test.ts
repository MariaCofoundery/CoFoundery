import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Die Forschungsfrage wird einmal gestellt, nicht bei jedem Einloggen.
 *
 * ---------------------------------------------------------------------------
 * WAS SCHIEFGING
 * ---------------------------------------------------------------------------
 *
 * Maria am 29.09.2026: „Ich wurde beim Einloggen auch gleich mal gefragt, ob
 * ich an Forschung teilnehmen will… ansonsten reicht es ja wirklich nur, dass
 * man das einmal macht.“
 *
 * Der Grund lag im Laden. Der Zustand wurde mit `.catch(() => "undecided")`
 * geholt - ein Lesefehler galt damit als „noch nie gefragt“, und der Dialog
 * kam wieder. Das ist nicht nur lästig: Wer zweimal gefragt wird, glaubt beim
 * zweiten Mal nicht mehr, dass seine Antwort gezählt hat. Und wer dann aus
 * Genervtheit zustimmt, hat nicht eingewilligt, sondern nachgegeben.
 */

const layout = readFileSync(join("src", "app", "layout.tsx"), "utf8");
const shell = readFileSync(join("src", "features", "navigation", "ProductShell.tsx"), "utf8");
const client = readFileSync(join("src", "features", "research", "client.ts"), "utf8");

test("ein Lesefehler gilt nicht als „noch nie gefragt“", () => {
  assert.ok(
    !/getResearchConsentState[\s\S]{0,120}?"undecided"/.test(layout),
    "layout.tsx macht aus einem Lesefehler wieder eine offene Frage",
  );
  assert.match(layout, /getResearchConsentState[\s\S]{0,200}?"unknown"/);
});

test("der Dialog erscheint nur bei einer wirklich offenen Frage", () => {
  assert.match(shell, /researchConsentState === "undecided"/);
  // Nicht „!== accepted“: Das haette „declined“ und „unknown“ mitgefangen und
  // genau die Wiederholung erzeugt, um die es hier geht.
  assert.ok(!/researchConsentState !== "accepted"[\s\S]{0,60}ResearchConsentNotice/.test(shell));
});

test("„unknown“ zählt nie als Zustimmung", () => {
  // Nicht fragen ist der harmlosere Fehler; falsch verwenden nicht.
  const checks = [...client.matchAll(/researchConsentState\s*(===|!==)\s*"(\w+)"/g)];
  // Gegenprobe: Findet das Muster nichts, prueft der Test die Leere.
  assert.ok(checks.length >= 2, `nur ${checks.length} Pruefungen gefunden`);
  for (const [, operator, value] of checks) {
    assert.equal(
      value,
      "accepted",
      `geprueft wird gegen "${value}" statt gegen "accepted" (${operator})`,
    );
  }
});

test("der Zustand kennt beide Arten von „nein“", () => {
  assert.match(client, /"undecided"\s*\|\s*"unknown"/);
});

test("beide Sprachen haben den Hinweis für den unlesbaren Stand", () => {
  for (const locale of ["de", "en"]) {
    const texts = JSON.parse(
      readFileSync(join("messages", locale, "researchConsent.json"), "utf8"),
    ) as { settings: Record<string, string> };
    assert.ok(texts.settings.unreadable?.length > 30, locale);
  }
});
