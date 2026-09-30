import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { screenSet, stepOf } from "@/features/instruments/align/screens";
import {
  getItemV22,
  getItemsV22,
  offeredItemsV22,
} from "@/features/instruments/align/registries";

const bekannt = (itemId: string) => Boolean(getItemV22(itemId));
const set = screenSet("founder_profile", bekannt);
const vorhaben = screenSet("venture_alignment", bekannt);

/** Das Review selbst - die Prüfung liest die Quelle und schreibt sie nicht ab. */
const review2 = readFileSync(
  join("..", "docs", "ALIGN_UX_QA_Teil2_Was_du_aufbauen_willst_v0.1.md"), "utf8");

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
  // Die Liste kommt aus der Registratur und nicht von Hand: Ein neuer
  // Abschnitt wäre sonst geprüft, sobald jemand ihn hier nachträgt.
  for (const [scope, bogen] of [["founder_profile", set], ["venture_alignment", vorhaben]] as const) {
    const alles = JSON.stringify(bogen);
    for (const abschnitt of new Set(offeredItemsV22(scope).map((item) => item.section))) {
      assert.ok(!alles.includes(abschnitt), `${scope}: ${abschnitt}`);
    }
  }

  // In der Registratur bleiben sie - dort sind sie die Grundlage der
  // Auswertung.
  assert.match(getItemV22("A01")!.section, /Analytische Prüfung/);
  assert.match(getItemV22("B04")!.section, /konkrete Risikogrenzen/);
});

test("jeder Bildschirm sagt, worum es geht", () => {
  for (const bogen of [set, vorhaben]) {
    for (const screen of bogen.screens) {
      assert.ok(screen.transition, `Schritt ${screen.step} hat keine Überleitung`);
      assert.ok(screen.title, `Schritt ${screen.step} hat keinen Titel`);
    }
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
  for (const bogen of [set, vorhaben]) {
    assert.equal(bogen.intro.duration, null);
    assert.ok(bogen.intro.paragraphs.length >= 3);
    assert.ok(bogen.intro.cta);

    // Und keine Auszeichnung aus dem Dokument steht im Text.
    for (const absatz of bogen.intro.paragraphs) {
      assert.ok(!absatz.includes("**"), absatz);
    }
  }
  assert.equal(set.intro.cta, "Starten");
});

test("der Fortschritt zählt Schritte, nicht Fragen", () => {
  const fragebogen = readFileSync(
    join("src", "features", "instruments", "align", "Questionnaire.tsx"), "utf8");
  assert.match(fragebogen, /Schritt \{schirm\.step\} von \{screens\.screens\.length\}/);

  // KEIN ZWEITER ZAEHLER. Das UX-Review Teil 2 nennt es wörtlich: „42 Fragen"
  // und „0 von 39 beantwortet" standen gleichzeitig da. Beide Zahlen waren
  // erklärbar, zusammen waren sie ein Widerspruch.
  assert.ok(!/von \{visible\.length\} beantwortet/.test(fragebogen));
});

// ---------------------------------------------------------------------------
// DER ZWEITE BOGEN
// ---------------------------------------------------------------------------

test("neun Abschnitte, zweiundvierzig Fragen, jede genau einmal", () => {
  assert.equal(vorhaben.screens.length, 9);

  const gezeigt = vorhaben.screens.flatMap((screen) => screen.items);
  assert.equal(new Set(gezeigt).size, gezeigt.length, "eine Frage steht auf zwei Schritten");

  // Keine Frage ohne Platz, kein Platz ohne Frage. Die 42 stehen so im
  // Review; sie sind hier nicht gesetzt, sondern gezählt.
  //
  // ZURUECKGEZOGENE ZAEHLEN NICHT MIT. S01 ist durch S01a bis S01f und
  // S01_top ersetzt und bleibt nur in der Registratur, damit alte Antworten
  // darauf lesbar bleiben. Ein Platz dafuer waere eine Frage, die niemand
  // mehr stellt.
  const imBogen = offeredItemsV22("venture_alignment").map((item) => item.itemId);
  assert.deepEqual([...gezeigt].sort(), [...imBogen].sort());
  assert.equal(gezeigt.length, 42);
});

test("jeder Übergang steht so im Review", () => {
  // Die Prüfung liest die Quelle, statt sie abzuschreiben: Wer einen Übergang
  // in der erzeugten Datei von Hand „verbessert", fliegt hier auf.
  for (const screen of vorhaben.screens) {
    assert.ok(
      review2.includes(screen.transition!) ||
        // Fettdruck ist Auszeichnung im Dokument und nicht im Text.
        review2.replace(/\*\*/g, "").includes(screen.transition!),
      `Schritt ${screen.step}: „${screen.transition}" steht nicht im Review`,
    );
    assert.ok(!screen.transition!.includes("**"), screen.transition!);
  }
});

test("der Abgabeknopf heißt nicht mehr „Founder-Profil erstellen“", () => {
  // Das Review wörtlich: „Nicht: Founder-Profil erstellen". Im zweiten Teil
  // erstellt man kein Profil - man beschreibt ein Vorhaben.
  assert.equal(vorhaben.closing.cta, "Auswertung erstellen");
  assert.ok(review2.includes(vorhaben.closing.cta));
  assert.ok(review2.includes(vorhaben.closing.text));
  assert.ok(vorhaben.closing.subline);

  // Beim Arbeitsprofil ist die Beschriftung richtig und bleibt.
  assert.equal(set.closing.cta, "Founder-Profil erstellen");

  // Und sie steht nicht mehr im Bauteil, sondern kommt aus dem Review.
  const fragebogen = readFileSync(
    join("src", "features", "instruments", "align", "Questionnaire.tsx"), "utf8");
  assert.match(fragebogen, /\{submitting \? abschluss\.ctaBusy : abschluss\.cta\}/);
});

test("nach dem Namen wird auf der Startseite gefragt, nicht im Kopf der Seite", () => {
  const frage = vorhaben.nameQuestion!;
  assert.ok(frage);
  assert.equal(frage.title, "Wie heißt dein Vorhaben?");
  assert.ok(review2.includes(frage.subline!));
  assert.ok(review2.includes(frage.placeholder!));
  // OHNE NAMEN GEHT ES WEITER. Er ist eine Beschriftung und keine Bedingung.
  assert.equal(frage.skip, "Später");

  // Der Kopf der Seite öffnet das Feld nicht mehr von selbst - sonst stünde
  // dieselbe Frage zweimal auf dem Schirm.
  const kopf = readFileSync(
    join("src", "features", "instruments", "align", "VentureHeader.tsx"), "utf8");
  assert.ok(!kopf.includes("useState(!venture.name)"));

  // Und das Arbeitsprofil hat keine: Es gehört zu keinem Vorhaben.
  assert.equal(set.nameQuestion, null);
});

test("Anschlussfragen stehen bei ihrer Grundfrage", () => {
  // Das Review fragt bei L02/L03: „In der aktuellen gerenderten Fassung endet
  // der Bereich nach L01. Sind L02 und L03 weiterhin vorgesehen?" Ja - beide
  // hängen an L01 und erscheinen, sobald dort eine Grenze steht. Sie brauchen
  // keinen eigenen Abschnitt, sondern den Platz hinter ihrem Anlass.
  for (const [frage, grund] of [["L02", "L01"], ["L03", "L01"], ["R05", "R04"]]) {
    assert.equal(getItemV22(frage)!.showAfter, grund, frage);
    assert.equal(stepOf(vorhaben, frage), stepOf(vorhaben, grund), frage);

    const schirm = vorhaben.screens.find((entry) => entry.items.includes(frage))!;
    assert.ok(
      schirm.items.indexOf(frage) > schirm.items.indexOf(grund),
      `${frage} steht vor ${grund}`,
    );
  }

  // Und in der Reihenfolge der Registratur: L02 fragt nach dem Erkennen, L03
  // nach dem Umgang.
  const letzter = vorhaben.screens.at(-1)!;
  assert.deepEqual(letzter.items, ["L01", "L02", "L03"]);
});

test("die sechs Ziele stehen als ein Block, nicht als sechs Fragekarten", () => {
  // Das Review: „Als gemeinsamer Block darstellen, nicht als sechs große
  // unabhängige Fragekarten." Die gemeinsame Frage hängt an den Items und
  // nicht am Abschnitt - im selben Abschnitt stehen danach S02 bis S06, für
  // die sie nicht gilt.
  const ziele = ["S01a", "S01b", "S01c", "S01d", "S01e", "S01f"];
  const schirm = vorhaben.screens.find((entry) => entry.items.includes("S01a"))!;
  assert.deepEqual(schirm.items.slice(0, 6), ziele);
  assert.equal(schirm.groupPrompt, null, "die Frage würde für S02 bis S06 mitgelten");

  const gemeinsam = new Set(ziele.map((itemId) => getItemV22(itemId)!.groupPrompt));
  assert.equal(gemeinsam.size, 1, "die sechs Ziele haben nicht dieselbe Frage");
  assert.ok([...gemeinsam][0]);
  assert.equal(getItemV22("S02")!.groupPrompt, undefined);
});
