import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { screenSet, stepOf } from "@/features/instruments/align/screens";
import { getItemV22, getItemsV22 } from "@/features/instruments/align/registries";

const bekannt = (itemId: string) => Boolean(getItemV22(itemId));
const set = screenSet(bekannt);

test("sieben Bildschirme, sechzehn Fragen, jede genau einmal", () => {
  assert.equal(set.screens.length, 7);

  const gezeigt = set.screens.flatMap((screen) => screen.items);
  assert.equal(gezeigt.length, 16);
  assert.equal(new Set(gezeigt).size, 16, "eine Frage steht auf zwei Schritten");

  // Und es fehlt keine: Ein Bogen mit einer Frage, die auf keinem Schritt
  // steht, liesse sich nie abgeben.
  const imBogen = getItemsV22("founder_profile").map((item) => item.itemId);
  assert.deepEqual([...gezeigt].sort(), [...imBogen].sort());
});

test("die internen Abschnittsnamen stehen nicht auf dem Bildschirm", () => {
  // „A – Analytische Prüfung" ist eine Notiz an uns. Für die Person davor ist
  // es eine Behauptung darüber, was gerade gemessen wird - und die färbt die
  // Antwort.
  const alles = JSON.stringify(set);
  for (const abschnitt of ["Analytische Prüfung", "Erfahrungsintuition", "Frühes Erproben",
                           "Wohlbefinden bei offener"]) {
    assert.ok(!alles.includes(abschnitt), abschnitt);
  }

  // In der Registratur bleiben sie - dort sind sie die Grundlage der
  // Auswertung.
  assert.match(getItemV22("A01")!.section, /Analytische Prüfung/);
});

test("jeder Bildschirm sagt, worum es geht", () => {
  for (const screen of set.screens) {
    assert.ok(screen.transition, `Schritt ${screen.step} hat keine Überleitung`);
    assert.ok(screen.title, `Schritt ${screen.step} hat keinen Titel`);
  }
});

test("Situationen ohne Frage bekommen eine gemeinsame Frage darüber", () => {
  // X01 bis X04 sind als Situationen formuliert („Eine wichtige Frage bleibt
  // eine Zeit lang ohne eindeutige Antwort."). Ohne den gemeinsamen Kopf
  // stünden dort Aussagen mit Knöpfen darunter und keine Frage.
  for (const itemId of ["X01", "X02", "X03", "X04"]) {
    const step = stepOf(set, itemId);
    assert.ok(step, itemId);
    const screen = set.screens.find((entry) => entry.step === step)!;
    assert.ok(screen.groupPrompt, `${itemId} steht auf einem Schritt ohne gemeinsame Frage`);
    assert.ok(!getItemV22(itemId)!.prompt.includes("?"), `${itemId} stellt selbst eine Frage`);
  }

  // Der siebte erbt sie vom sechsten - das Dokument wiederholt sie dort
  // nicht. Abgeleitet und nicht abgeschrieben, deshalb steht es in der Datei.
  const siebter = set.screens.find((screen) => screen.step === 7)!;
  assert.equal(siebter.groupPromptInherited, true);
});

test("die Startseite verspricht keine Dauer", () => {
  // Das UX-Review: erst im Pretest messen. Eine geratene Zahl wäre ein
  // Versprechen, das niemand geprüft hat.
  assert.equal(set.intro.duration, null);
  assert.ok(set.intro.paragraphs.length >= 4);
  assert.equal(set.intro.cta, "Starten");

  // Und keine Auszeichnung aus dem Dokument steht im Text.
  for (const absatz of set.intro.paragraphs) {
    assert.ok(!absatz.includes("**"), absatz);
  }
});

test("der Fortschritt zählt Schritte, nicht Fragen", () => {
  const fragebogen = readFileSync(
    join("src", "features", "instruments", "align", "Questionnaire.tsx"), "utf8");
  assert.match(fragebogen, /Schritt \{schirm\.step\} von \{screens\.screens\.length\}/);
});
