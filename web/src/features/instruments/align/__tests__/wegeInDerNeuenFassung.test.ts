import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const WURZEL = join("src", "app", "(product)", "founder-alignment");

/** Alle Seiten der neuen Fassung - ohne die archivierte Testfassung. */
function seitenDerNeuenFassung(verzeichnis = WURZEL): string[] {
  const out: string[] = [];
  for (const eintrag of readdirSync(verzeichnis)) {
    const pfad = join(verzeichnis, eintrag);
    if (statSync(pfad).isDirectory()) {
      // `pilot` ist v2.1 und archiviert, `workbook` und
      // `prepare-conversation` gehoeren zu v1.
      if (["pilot", "workbook", "prepare-conversation", "versionen"].includes(eintrag)) continue;
      out.push(...seitenDerNeuenFassung(pfad));
    } else if (eintrag === "page.tsx") {
      out.push(pfad);
    }
  }
  return out;
}

test("jede Seite der neuen Fassung hat einen Weg zurück", () => {
  // GEMELDET AM 29.09.2026: Die Menuefuehrung ist nicht benutzerfreundlich,
  // die Zuruecklinks nicht sauber. Beim Nachzaehlen: Von sieben Seiten der
  // neuen Fassung hatte KEINE einen Weg hinaus - gebaut wurde Seite fuer
  // Seite, und der Weg dazwischen ist liegen geblieben.
  const seiten = seitenDerNeuenFassung();
  assert.ok(seiten.length >= 7, `zu wenige Seiten gefunden: ${seiten.length}`);

  for (const seite of seiten) {
    const text = readFileSync(seite, "utf8");
    assert.match(text, /<AlignNav/, `${seite}: keine Leiste, kein Weg zurueck`);
  }
});

test("die Leiste zeigt zurück und auf die drei Bereiche", () => {
  const nav = readFileSync(
    join("src", "features", "instruments", "align", "AlignNav.tsx"), "utf8");

  assert.match(nav, /href="\/dashboard"/);
  assert.match(nav, /← Übersicht/);
  for (const ziel of ["/founder-alignment/profil", "/founder-alignment/vorhaben", "/founder-alignment/suche"]) {
    assert.ok(nav.includes(ziel), ziel);
  }

  // EINE TUER JE SACHE: Wer abgegeben hat, kommt zu seinen Antworten, sonst
  // zum Fragebogen. Zwei Eintraege nebeneinander waeren zwei Orte fuer
  // dieselbe Sache.
  assert.match(nav, /profileSubmitted\s*\n?\s*\?/);
  assert.match(nav, /ventureSubmitted/);

  // Der aktive Eintrag wird nicht verlinkt - ein Link auf die Seite, auf der
  // man steht, sieht aus wie ein Weg und ist keiner.
  assert.match(nav, /aria-current="page"/);
});

test("die Leiste legt kein Vorhaben an", () => {
  // resolveVenture erzeugt eins, wenn keins da ist. Eine Navigationsleiste
  // darf nichts entstehen lassen, was ohne sie nicht da waere - und sie wird
  // auf jeder Seite gezeichnet.
  const code = readFileSync(
    join("src", "features", "instruments", "align", "navState.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
  assert.ok(!/resolveVenture/.test(code));
  assert.match(code, /findVentures/);
});

test("nach dem Absenden passiert etwas", () => {
  // GEMELDET AM 30.09.2026: Nach „Founder-Profil erstellen“ blieb man stehen,
  // wo man war, und ein Satz sagte, es sei abgegeben. Das ist der Moment, in
  // dem die meiste Arbeit hinter einem liegt.
  const seite = readFileSync(
    join("src", "app", "(product)", "founder-alignment", "profil", "page.tsx"), "utf8");
  assert.match(seite, /afterSubmit="\/founder-alignment\/profil\/antworten\?erstellt=1"/);

  const fragebogen = readFileSync(
    join("src", "features", "instruments", "align", "Questionnaire.tsx"), "utf8");
  assert.match(fragebogen, /if \(afterSubmit\) router\.push\(afterSubmit\)/);

  // Und dort steht dann etwas - samt Weg in den naechsten Abschnitt.
  const ziel = readFileSync(
    join("src", "app", "(product)", "founder-alignment", "profil", "antworten", "page.tsx"),
    "utf8");
  assert.match(ziel, /erstellt === "1"/);
  assert.match(ziel, /Weiter: Was du aufbauen willst/);
  assert.match(ziel, /href="\/founder-alignment\/vorhaben"/);
});

test("der zweite Bereich heißt überall gleich", () => {
  // „Euer Vorhaben“ setzt ein Wir voraus, das es oft noch nicht gibt -
  // Solo-Foundernde und Leute vor der Co-Founder-Suche fielen damit durch.
  for (const datei of [
    join("src", "features", "instruments", "align", "AlignNav.tsx"),
    join("src", "features", "instruments", "align", "AlignCard.tsx"),
    join("src", "app", "(product)", "founder-alignment", "vorhaben", "page.tsx"),
  ]) {
    const text = readFileSync(datei, "utf8");
    assert.match(text, /Was du aufbauen willst/, datei);
  }
});
