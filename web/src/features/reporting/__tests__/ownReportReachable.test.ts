import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const DASHBOARD = "src/app/(product)/dashboard/page.tsx";
const SHELL = "src/features/navigation/ProductShell.tsx";
const CHROME = "src/features/navigation/productChromePath.ts";

/**
 * Das eigene Ergebnis muss auffindbar sein.
 *
 * GEMELDET AM 21.09.2026: "Den individuellen Report finde ich jetzt irgendwie
 * nur unter dem Werteblock." Genau so war es - er hing an zwei Statuskarten
 * weiter unten auf dem Dashboard, und die heissen nach dem SCHRITT ("Werte",
 * "Fundament"), nicht nach dem Ergebnis.
 *
 * DAS ZIEL HAT SICH AM 22.09.2026 GEAENDERT, die Zusage nicht. Maria nach dem
 * ersten Blick auf das Founderprofil: "Das gehoert oben in die Leiste statt
 * mein Report, da ist ja auch der Report im Prinzip drin." Beide Wege fuehren
 * jetzt auf `/me/profile` - dort steht derselbe Selbstbericht (dasselbe
 * Bauteil, nicht nachgebaut) und daneben, was sonst noch da ist. Zwei
 * Eintraege fuer dasselbe Ergebnis waeren zwei Orte, an denen man nachsieht.
 *
 * `/me/report` bleibt bestehen und bleibt verlinkt, wo es um den SCHRITT geht:
 * direkt nach dem Fragebogen und an den Statuskarten. Dort ist es die Antwort
 * auf "was kam bei dem heraus, was ich gerade gemacht habe".
 */

test("das Ergebnis steht im Kopfbereich des Dashboards, beim Namen genannt", () => {
  const dashboard = codeOnly(DASHBOARD);
  assert.match(dashboard, /href="\/me\/profile"[\s\S]{0,400}hero\.heroOwnProfile/);

  // Oben bei den anderen Hauptwegen, nicht unten bei den Statuskarten.
  const heroAt = dashboard.indexOf("hero.heroConnections");
  const ownReportAt = dashboard.indexOf("hero.heroOwnProfile");
  const cardsAt = dashboard.indexOf("foundation.alignment.title");
  assert.ok(heroAt > 0 && ownReportAt > heroAt && ownReportAt < cardsAt);
});

test("nur wenn es einen Report gibt", () => {
  // Ein Weg zu einer Seite, die "noch nichts da" sagt, ist kein Weg. Und die
  // Bedingung ist dieselbe, unter der die Statuskarten dorthin verlinken -
  // eine dritte Wahrheit daneben waere sofort die naechste, die
  // auseinanderlaeuft.
  const dashboard = codeOnly(DASHBOARD);
  assert.match(
    dashboard,
    /hasIndividualReport =\s*founderAlignmentState === "result_available" \|\| valuesFoundationState === "completed"/
  );
  assert.match(dashboard, /\{hasIndividualReport \? \(/);
});

test("und von jeder Align-Seite aus, nicht nur vom Dashboard", () => {
  const shell = codeOnly(SHELL);
  const subItems = shell.slice(shell.indexOf("subItems:"), shell.indexOf("const findItem"));
  assert.match(subItems, /href: "\/me\/profile"/);
  assert.match(subItems, /label: t\("alignOwnProfile"\)/);
  // Und nicht zweimal dasselbe: Der alte Eintrag ist ersetzt, nicht ergaenzt.
  assert.doesNotMatch(subItems, /href: "\/me\/report"/);

  // Nur mit Founder-Zugang.
  assert.match(subItems, /hasFounder\s*\?\s*\[[\s\S]{0,400}\/me\/profile/);
});

test("der Reiter loest sich nicht auf, wenn man ihn anklickt", () => {
  // DAS WAERE DER FEHLER IM FEHLER GEWESEN: Die zweite Reihe erscheint nur,
  // wenn der Bereich aktiv ist. /me/ galt nicht als Align - der neue Eintrag
  // waere genau auf der Seite verschwunden, zu der er fuehrt.
  const shell = codeOnly(SHELL);
  const alignActive = shell.slice(shell.indexOf("label: t(\"areaAlign\")"), shell.indexOf("subItems:"));
  assert.match(alignActive, /currentPathname\.startsWith\("\/me\/"\)/);

  // Und die Seite traegt die Produktleiste ueberhaupt.
  assert.match(codeOnly(CHROME), /pathname\.startsWith\("\/me\/"\)/);
});

test("der Eintrag heisst in beiden Sprachen nach dem Ergebnis, nicht nach dem Schritt", () => {
  for (const locale of ["de", "en"]) {
    const navigation = JSON.parse(readFileSync(`messages/${locale}/navigation.json`, "utf8")) as Record<string, string>;
    const dashboard = (
      JSON.parse(readFileSync(`messages/${locale}/dashboard.json`, "utf8")) as {
        hero: Record<string, string>;
      }
    ).hero;

    assert.ok(navigation.alignOwnProfile, `${locale}: navigation.alignOwnProfile fehlt`);
    assert.ok(dashboard.heroOwnProfile, `${locale}: hero.heroOwnProfile fehlt`);
    // Beide Stellen sagen dasselbe - zwei Namen fuer eine Seite sind zwei
    // Seiten im Kopf der lesenden Person.
    assert.equal(navigation.alignOwnProfile, dashboard.heroOwnProfile);
    assert.doesNotMatch(navigation.alignOwnProfile, /Werte|Fundament|Values|Foundation/);
    // Und nicht zu verwechseln mit dem Eintrag "Profil", der auf die
    // Werkbank zeigt: Dort traegt man ein, hier sieht man das Ergebnis.
    assert.notEqual(navigation.alignOwnProfile, navigation.profile);
    // Kurz genug fuer eine Leiste. "Mein Founderprofil" war Marias
    // Beanstandung ("vielleicht findest du noch eine kuerzere Variante").
    assert.ok(
      navigation.alignOwnProfile.length <= 14,
      `${locale}: "${navigation.alignOwnProfile}" ist zu lang fuer die Leiste`
    );
  }
});
